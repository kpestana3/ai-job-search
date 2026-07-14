// Data source: EvolDir job postings, mirrored as static pages by Brian Golding
// at McMaster University. No JSON API, no query parameters, no authentication.
// The index page is a single <pre> block of dated links; detail pages are raw
// text/plain posting bodies (mailing-list content, unstructured prose).

export const INDEX_URL = "https://evol.mcmaster.ca/brian/Jobs.html"
export const DETAIL_BASE_URL = "https://evol.mcmaster.ca/brian/evoldir/Jobs/"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

/** Fetch text with exponential backoff on 429/5xx. Returns "" on a 404. */
export async function textFetch(url: string): Promise<string> {
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,text/plain,*/*;q=0.8",
      },
      redirect: "follow",
    })
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
      }
      const jitter = Math.floor(Math.random() * 500)
      await new Promise((r) => setTimeout(r, delay + jitter))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 404) return ""
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }
    return response.text()
  }
  throw new Error("Request failed after max retries")
}

export interface Posting {
  id: string // filename slug, e.g. "UKansas.LabTech.ComplexTraits"
  title: string // same as id — the only reliable label this portal offers
  company: string | null // heuristic: first dot-separated token of the filename
  location: null // never populated — not reliably separable from the filename or body
  date: string | null // ISO date, year inferred (index page has no year)
  url: string
}

export interface PostingDetail extends Posting {
  description: string | null
  contactEmail: string | null // best-effort regex scan, not guaranteed present/unique
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
}

/**
 * The index page's dates have no year (e.g. "Apr 18 08:53"). Infer it the way
 * directory listings do: if the month/day would fall in the future relative to
 * `now`, it must be from last year.
 */
export function inferDate(monthAbbr: string, day: string, time: string, now: Date): string | null {
  const month = MONTHS[monthAbbr.toLowerCase()]
  if (month === undefined) return null
  const [hh, mm] = time.split(":").map((n) => parseInt(n, 10))
  let year = now.getFullYear()
  const candidate = new Date(year, month, parseInt(day, 10), hh, mm)
  if (candidate.getTime() > now.getTime() + 24 * 60 * 60 * 1000) {
    year -= 1
  }
  const d = new Date(year, month, parseInt(day, 10), hh, mm)
  return d.toISOString()
}

/** First dot-separated token of the filename, underscores replaced with spaces. */
function heuristicCompany(filename: string): string | null {
  const first = filename.split(".")[0]
  if (!first) return null
  return first.replace(/_/g, " ")
}

/**
 * Parse the index page's <pre> block. Each posting is its own line; a
 * malformed line is skipped rather than aborting the whole parse.
 */
export function parseIndex(html: string, now: Date = new Date()): Posting[] {
  const results: Posting[] = []
  const lineRe =
    /<a href="([^"]+)">([^<]+)<\/a>\s+[\d.]+\s*(?:bytes|KB|MB)\s+([A-Za-z]{3})\s+(\d{1,2})\s+(\d{2}:\d{2})/g

  let m: RegExpExecArray | null
  while ((m = lineRe.exec(html)) !== null) {
    const [, href, filenameRaw, monthAbbr, day, time] = m
    const filename = filenameRaw.trim()
    if (!filename) continue
    const url = href.startsWith("http") ? href : `https://evol.mcmaster.ca${href}`
    results.push({
      id: filename,
      title: filename,
      company: heuristicCompany(filename),
      location: null,
      date: inferDate(monthAbbr, day, time, now),
      url,
    })
  }
  return results
}

/** Best-effort email extraction from posting body text. */
function extractEmail(text: string): string | null {
  const m = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  return m ? m[0] : null
}

/** Clean up a plain-text posting body: normalize line endings, collapse excess blank lines. */
function cleanBody(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
}

export function buildDetailUrl(filename: string): string {
  return `${DETAIL_BASE_URL}/${filename}`
}

/** Accept a bare filename slug or a full detail URL and return the filename slug. */
export function normalizeId(input: string): string | null {
  if (input.startsWith("http")) {
    const m = input.match(/\/Jobs\/\/?([^/?]+)/)
    return m ? decodeURIComponent(m[1]) : null
  }
  return input.trim() || null
}

export function parseDetail(text: string, id: string): PostingDetail {
  const description = text ? cleanBody(text) : null
  return {
    id,
    title: id,
    company: heuristicCompany(id),
    location: null,
    date: null,
    url: buildDetailUrl(id),
    description,
    contactEmail: description ? extractEmail(description) : null,
  }
}
