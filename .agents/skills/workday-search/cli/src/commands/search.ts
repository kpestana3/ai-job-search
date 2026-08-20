import { searchApi, toResult, writeError, type CompanyConfig, type JobResult } from "../helpers.js"

export interface SearchOpts {
  company: CompanyConfig
  query?: string
  location?: string // best-effort: folded into the free-text query, see README "Location filtering" note
  page: number
  limit: number
  format: "json" | "table" | "plain"
}

function buildSearchText(opts: SearchOpts): string {
  // Workday's real faceted location filter needs per-tenant facet UUIDs that
  // aren't exposed simply (see README.md "Location filtering"). Folding a
  // --location value into the free-text query is a best-effort approximation,
  // not a guaranteed filter -- Workday's search does full-text match across
  // title and location text for most tenants, but this isn't contractual.
  const parts = [opts.query, opts.location].filter(Boolean)
  return parts.join(" ")
}

function shortDate(date: string | null): string {
  return date ?? "—"
}

interface Column {
  header: string
  width: number
  cell: (r: JobResult) => string
}

function renderTable(rows: JobResult[]): string {
  if (rows.length === 0) return "No results."
  const columns: Column[] = [
    { header: "REQ ID", width: Math.max(6, ...rows.map((r) => (r.reqId ?? "—").length)), cell: (r) => r.reqId ?? "—" },
    { header: "TITLE", width: 42, cell: (r) => r.title },
    { header: "LOCATION", width: 26, cell: (r) => r.location ?? "—" },
    { header: "POSTED", width: 20, cell: (r) => shortDate(r.date) },
  ]
  const row = (cells: string[]) => cells.map((c, i) => c.slice(0, columns[i].width).padEnd(columns[i].width)).join("  ")
  const header = row(columns.map((c) => c.header))
  const body = rows.map((r) => row(columns.map((c) => c.cell(r))))
  return [header, "-".repeat(header.length), ...body].join("\n")
}

function renderPlain(rows: JobResult[]): string {
  if (rows.length === 0) return "No results."
  const block = (r: JobResult) =>
    [r.title, `  ${r.company} · ${r.location ?? "—"} · ${shortDate(r.date)}`, `  reqId: ${r.reqId ?? "—"}`, `  id: ${r.id}`, `  ${r.url}`].join("\n")
  return rows.map(block).join("\n\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const offset = (opts.page - 1) * opts.limit
    const resp = await searchApi(opts.company, { searchText: buildSearchText(opts), limit: opts.limit, offset })
    const rows = resp.jobPostings.map((j) => toResult(opts.company, j))

    if (opts.format === "table") {
      process.stdout.write(renderTable(rows) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(renderPlain(rows) + "\n")
    } else {
      process.stdout.write(
        JSON.stringify({ meta: { count: rows.length, page: opts.page, total: resp.total }, results: rows }, null, 2) + "\n",
      )
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}
