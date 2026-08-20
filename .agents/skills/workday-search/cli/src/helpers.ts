// Data source: the Workday "CXS" (Candidate Experience Search) API that every
// standard Workday Recruiting career site uses internally for its own job-search
// widget. It's unauthenticated and JSON, the same public-read pattern as
// freehire.dev and LinkedIn's jobs-guest endpoints -- confirmed live against
// 9 different companies during scaffolding (2026-07-19), each with a different
// tenant/site, using the identical request/response shape.
//
// Unlike the other portal skills in this repo, ONE Workday-CXS implementation
// covers MANY companies -- the only thing that varies per company is the
// tenant/wd-subdomain/site triple, looked up from ../companies.json. This is
// why this skill takes a --company key (or raw --tenant/--wd/--site for a
// company not yet in the registry) instead of hardcoding a single base URL.

import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

export interface CompanyConfig {
  displayName: string
  tenant: string
  wd: string // subdomain, e.g. "wd1", "wd5"
  site: string
}

interface CompaniesFile {
  companies: Record<string, CompanyConfig>
}

let _registry: Record<string, CompanyConfig> | null = null

/** Loads companies.json (sibling to the cli/ directory) once, cached. */
export function loadRegistry(): Record<string, CompanyConfig> {
  if (_registry) return _registry
  // helpers.ts -> src -> cli -> workday-search/companies.json
  const here = dirname(fileURLToPath(import.meta.url))
  const path = join(here, "..", "..", "companies.json")
  const raw = readFileSync(path, "utf-8")
  const parsed = JSON.parse(raw) as CompaniesFile
  _registry = parsed.companies
  return _registry
}

export function resolveCompany(key: string): CompanyConfig | null {
  const registry = loadRegistry()
  return registry[key] ?? null
}

/** Explicit override: raw --tenant/--wd/--site flags bypass the registry entirely. */
export function rawCompanyConfig(tenant: string, wd: string, site: string): CompanyConfig {
  return { displayName: tenant, tenant, wd, site }
}

export function searchUrl(c: CompanyConfig): string {
  return `https://${c.tenant}.${c.wd}.myworkdayjobs.com/wday/cxs/${c.tenant}/${c.site}/jobs`
}

/** externalPath already starts with "/" (as returned by the search API). */
export function detailUrl(c: CompanyConfig, externalPath: string): string {
  return `https://${c.tenant}.${c.wd}.myworkdayjobs.com/wday/cxs/${c.tenant}/${c.site}${externalPath}`
}

/** The human-facing posting URL (what a browser/apply link would use). */
export function humanUrl(c: CompanyConfig, externalPath: string): string {
  return `https://${c.tenant}.${c.wd}.myworkdayjobs.com/${c.site}${externalPath}`
}

// ---- Wire shapes (fields this skill reads; the real payload carries more) ----

export interface WorkdayJobPosting {
  title: string
  externalPath: string
  locationsText?: string
  postedOn?: string
  bulletFields?: string[] // [0] is typically the requisition ID
  timeType?: string
}

interface WorkdaySearchResponse {
  total: number
  jobPostings: WorkdayJobPosting[]
}

interface WorkdayDetailResponse {
  jobPostingInfo: {
    id: string
    title: string
    jobDescription?: string // HTML
    location?: string
    postedOn?: string
    startDate?: string
    timeType?: string
    jobReqId?: string
    country?: { descriptor?: string }
    jobRequisitionLocation?: { descriptor?: string }
    externalUrl?: string
  }
}

export interface JobResult {
  id: string // externalPath - unique within a company, what `detail` consumes
  title: string
  company: string // registry displayName
  location: string | null
  date: string | null // postedOn, relative text (e.g. "Posted 2 Days Ago") - Workday search doesn't return an absolute date
  reqId: string | null
  url: string // human-facing posting URL
}

export interface JobDetailResult extends JobResult {
  startDate: string | null // absolute ISO date, only available from detail
  timeType: string | null
  country: string | null
  description: string | null // HTML stripped to text
}

export function toResult(company: CompanyConfig, j: WorkdayJobPosting): JobResult {
  return {
    id: j.externalPath,
    title: j.title || "(untitled)",
    company: company.displayName,
    location: j.locationsText || null,
    date: j.postedOn || null,
    reqId: j.bulletFields?.[0] || null,
    url: humanUrl(company, j.externalPath),
  }
}

export function toDetail(company: CompanyConfig, externalPath: string, d: WorkdayDetailResponse["jobPostingInfo"]): JobDetailResult {
  return {
    id: externalPath,
    title: d.title || "(untitled)",
    company: company.displayName,
    location: d.location || null,
    date: d.postedOn || null,
    reqId: d.jobReqId || null,
    url: d.externalUrl || humanUrl(company, externalPath),
    startDate: d.startDate || null,
    timeType: d.timeType || null,
    country: d.country?.descriptor || null,
    description: cleanHtml(d.jobDescription),
  }
}

function numericEntity(cp: number): string {
  return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => numericEntity(parseInt(dec, 10)))
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex) => numericEntity(parseInt(hex, 16)))
    .replace(/&nbsp;/g, " ")
}

/** Strip a Workday jobDescription's HTML into readable prose. Null for empty input. */
export function cleanHtml(html: string | null | undefined): string | null {
  if (!html) return null
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
  const text = decodeHtmlEntities(withBreaks.replace(/<[^>]+>/g, " "))
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
  return text || null
}

/**
 * POST the CXS search endpoint. Retries 429/5xx with backoff. A connection
 * failure fails fast (not transient). HTTP_422 (wrong tenant/site) is
 * surfaced immediately with a message pointing at the registry, since
 * retrying a bad tenant/site never succeeds.
 */
export async function searchApi(
  company: CompanyConfig,
  body: { searchText?: string; limit: number; offset: number },
): Promise<WorkdaySearchResponse> {
  const url = searchUrl(company)
  const maxRetries = 5
  let delay = 500

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let response: Response
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
        body: JSON.stringify({ appliedFacets: {}, searchText: body.searchText ?? "", limit: body.limit, offset: body.offset }),
      })
    } catch (e) {
      throw new Error(`could not reach ${company.tenant}.${company.wd}.myworkdayjobs.com (${e instanceof Error ? e.message : String(e)})`)
    }

    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) throw new Error(`Workday search request failed: ${response.status} ${response.statusText}`)
      await sleep(delay + Math.floor(Math.random() * 500))
      delay = Math.min(delay * 2, 8000)
      continue
    }

    const parsed = (await response.json().catch(() => null)) as (WorkdaySearchResponse & { errorCode?: string }) | null
    if (parsed?.errorCode === "HTTP_422") {
      throw new Error(
        `Workday rejected this tenant/site combination (HTTP_422) -- "${company.tenant}"/"${company.site}" is likely wrong. ` +
          `Verify the company's real site name (see README.md "Adding a company") before retrying.`,
      )
    }
    if (!response.ok) throw new Error(`Workday search request failed: ${response.status} ${response.statusText}`)
    if (!parsed) throw new Error("Workday API returned an unparseable response body")
    return parsed
  }
  throw new Error("Workday search request failed after retries")
}

export async function detailApi(company: CompanyConfig, externalPath: string): Promise<WorkdayDetailResponse["jobPostingInfo"]> {
  const url = detailUrl(company, externalPath)
  const maxRetries = 5
  let delay = 500

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let response: Response
    try {
      response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } })
    } catch (e) {
      throw new Error(`could not reach ${company.tenant}.${company.wd}.myworkdayjobs.com (${e instanceof Error ? e.message : String(e)})`)
    }

    if (response.status === 404) throw new Error("posting not found (it may have closed)")
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) throw new Error(`Workday detail request failed: ${response.status} ${response.statusText}`)
      await sleep(delay + Math.floor(Math.random() * 500))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (!response.ok) throw new Error(`Workday detail request failed: ${response.status} ${response.statusText}`)
    const parsed = (await response.json().catch(() => null)) as WorkdayDetailResponse | null
    if (!parsed?.jobPostingInfo) throw new Error("Workday API returned an unparseable response body")
    return parsed.jobPostingInfo
  }
  throw new Error("Workday detail request failed after retries")
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
