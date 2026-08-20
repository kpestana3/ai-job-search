// Data source: the official USAJOBS Search API (data.usajobs.gov), the public API
// for federal government job announcements (CDC, NIH, FDA, and every other federal
// agency's direct-hire postings). Unlike freehire-search/linkedin-search, this API
// requires registration: a free API key ("Authorization-Key") tied to a User-Agent
// string (your registered email), obtained at https://developer.usajobs.gov/apirequest/.
// There is no anonymous read tier — a request with no key is rejected the same as
// one with an invalid key (both 401), confirmed live against the endpoint below.
//
// Architectural note (see url-reference.md "Notes" for the full explanation): the
// Search endpoint already returns full job detail (summary, duties, requirements,
// how-to-apply) inline with every search hit — there is no separate lightweight
// search + detail round-trip the way freehire/linkedin work, because USAJOBS has
// no dedicated by-ID lookup endpoint at all. `detail` here is a best-effort
// re-search by ID, not a guaranteed point lookup.

export const BASE_URL = "https://data.usajobs.gov/api/search"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

/** Reads the two required env vars, or null if either is missing. */
function credentials(): { apiKey: string; userAgent: string } | null {
  const apiKey = (process.env.USAJOBS_API_KEY ?? "").trim()
  const userAgent = (process.env.USAJOBS_USER_AGENT ?? "").trim()
  if (!apiKey || !userAgent) return null
  return { apiKey, userAgent }
}

export const MISSING_CREDENTIALS_MESSAGE =
  "USAJOBS_API_KEY and USAJOBS_USER_AGENT env vars are both required (no anonymous reads). " +
  "Register a free key at https://developer.usajobs.gov/apirequest/ using the email you want " +
  "as your User-Agent, then set: USAJOBS_API_KEY=<key from the confirmation email>, " +
  "USAJOBS_USER_AGENT=<that same email>."

// The wire shape of one search result item (fields this skill reads; USAJOBS's
// actual payload carries more). Field names verified against long-stable, widely
// documented USAJOBS API usage (see url-reference.md for the confidence caveat —
// the live developer.usajobs.gov docs page could not be rendered during scaffolding).
export interface UsaJobsItem {
  MatchedObjectId: string
  MatchedObjectDescriptor: {
    PositionID?: string
    PositionTitle: string
    PositionURI: string
    OrganizationName?: string
    DepartmentName?: string
    PositionLocationDisplay?: string
    PositionLocation?: Array<{ LocationName?: string }>
    JobCategory?: Array<{ Name?: string; Code?: string }>
    PositionSchedule?: Array<{ Name?: string }>
    PositionOfferingType?: Array<{ Name?: string }>
    QualificationSummary?: string
    PositionRemuneration?: Array<{ MinimumRange?: string; MaximumRange?: string; RateIntervalCode?: string }>
    PublicationStartDate?: string
    ApplicationCloseDate?: string
    UserArea?: {
      Details?: {
        JobSummary?: string
        MajorDuties?: string[] | string
        Requirements?: string
        HowToApply?: string
        WhoMayApply?: { Name?: string }
        HiringPath?: string[]
        TotalOpenings?: string
      }
    }
  }
}

interface UsaJobsResponse {
  SearchResult: {
    SearchResultCount: number
    SearchResultCountAll: number
    SearchResultItems: UsaJobsItem[]
  }
}

/** The portal-skill contract's search-result shape. Missing values are null, never omitted. */
export interface JobResult {
  id: string
  title: string
  company: string | null // OrganizationName
  department: string | null // DepartmentName (extra field — permitted superset)
  location: string | null
  date: string | null // PublicationStartDate
  closes: string | null // ApplicationCloseDate (extra)
  url: string
  salary: string | null
  hiringPaths: string[]
}

/** Detail adds the fields already present inline in the search response (see module note). */
export interface JobDetailResult extends JobResult {
  jobSummary: string | null
  majorDuties: string | null
  requirements: string | null
  howToApply: string | null
  whoMayApply: string | null
}

function formatSalary(rem?: UsaJobsItem["MatchedObjectDescriptor"]["PositionRemuneration"]): string | null {
  const r = rem?.[0]
  if (!r || (!r.MinimumRange && !r.MaximumRange)) return null
  const interval = r.RateIntervalCode ? ` ${r.RateIntervalCode}` : ""
  if (r.MinimumRange && r.MaximumRange) return `$${r.MinimumRange}-$${r.MaximumRange}${interval}`
  return `$${r.MinimumRange ?? r.MaximumRange}${interval}`
}

export function toResult(item: UsaJobsItem): JobResult {
  const d = item.MatchedObjectDescriptor
  return {
    id: item.MatchedObjectId,
    title: d.PositionTitle || "(untitled)",
    company: d.OrganizationName || null,
    department: d.DepartmentName || null,
    location: d.PositionLocationDisplay || null,
    date: d.PublicationStartDate || null,
    closes: d.ApplicationCloseDate || null,
    url: d.PositionURI,
    salary: formatSalary(d.PositionRemuneration),
    hiringPaths: d.UserArea?.Details?.HiringPath ?? [],
  }
}

function joinIfArray(v: string[] | string | undefined): string | null {
  if (!v) return null
  return Array.isArray(v) ? v.join("\n") : v
}

export function toDetail(item: UsaJobsItem): JobDetailResult {
  const details = item.MatchedObjectDescriptor.UserArea?.Details
  return {
    ...toResult(item),
    jobSummary: details?.JobSummary || null,
    majorDuties: joinIfArray(details?.MajorDuties),
    requirements: details?.Requirements || null,
    howToApply: details?.HowToApply || null,
    whoMayApply: details?.WhoMayApply?.Name || null,
  }
}

/**
 * GET the Search API. Retries 429/5xx with backoff; a missing/invalid key (401)
 * fails fast with a message pointing at registration, since retrying a bad key
 * never succeeds. A connection failure also fails fast (not transient).
 */
export async function apiGet(query: URLSearchParams): Promise<UsaJobsResponse> {
  const creds = credentials()
  if (!creds) throw new Error(MISSING_CREDENTIALS_MESSAGE)

  const url = `${BASE_URL}?${query.toString()}`
  const maxRetries = 5
  let delay = 500

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let response: Response
    try {
      response = await fetch(url, {
        headers: {
          Host: "data.usajobs.gov",
          "User-Agent": creds.userAgent,
          "Authorization-Key": creds.apiKey,
          Accept: "application/json",
        },
      })
    } catch (e) {
      throw new Error(`could not reach the USAJOBS API (${e instanceof Error ? e.message : String(e)})`)
    }

    if (response.status === 401) {
      throw new Error(`USAJOBS API rejected the credentials (401) — check USAJOBS_API_KEY and USAJOBS_USER_AGENT. ${MISSING_CREDENTIALS_MESSAGE}`)
    }
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`USAJOBS API request failed: ${response.status} ${response.statusText}`)
      }
      await sleep(delay + Math.floor(Math.random() * 500))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (!response.ok) {
      throw new Error(`USAJOBS API request failed: ${response.status} ${response.statusText}`)
    }
    const body = (await response.json().catch(() => null)) as UsaJobsResponse | null
    if (!body) throw new Error("USAJOBS API returned an unparseable response body")
    return body
  }
  throw new Error("USAJOBS API request failed after retries")
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function extractItems(resp: UsaJobsResponse): UsaJobsItem[] {
  return resp.SearchResult?.SearchResultItems ?? []
}

export function totalCount(resp: UsaJobsResponse): number {
  return resp.SearchResult?.SearchResultCountAll ?? resp.SearchResult?.SearchResultCount ?? 0
}
