import { apiGet, extractItems, toResult, totalCount, writeError, type JobResult } from "../helpers.js"

export interface SearchOpts {
  query?: string
  location: string[]
  organization?: string
  category: string[]
  hiringPath: string[]
  whoMayApply?: string
  jobage?: number // DatePosted: days back. Passthrough — see url-reference.md caveat.
  sortField?: string
  sortDirection?: string
  page: number
  limit: number
  format: "json" | "table" | "plain"
}

function buildQuery(opts: SearchOpts): URLSearchParams {
  const p = new URLSearchParams()
  if (opts.query) p.set("Keyword", opts.query)
  if (opts.organization) p.set("Organization", opts.organization)
  if (opts.whoMayApply) p.set("WhoMayApply", opts.whoMayApply)
  if (opts.jobage !== undefined) p.set("DatePosted", String(opts.jobage))
  if (opts.sortField) p.set("SortField", opts.sortField)
  if (opts.sortDirection) p.set("SortDirection", opts.sortDirection)
  p.set("Page", String(opts.page))
  p.set("ResultsPerPage", String(opts.limit))
  for (const loc of opts.location) p.append("LocationName", loc)
  for (const cat of opts.category) p.append("JobCategoryCode", cat)
  for (const hp of opts.hiringPath) p.append("HiringPath", hp)
  return p
}

function shortDate(date: string | null): string {
  return date ? date.slice(0, 10) : "—"
}

interface Column {
  header: string
  width: number
  cell: (r: JobResult) => string
}

function renderTable(rows: JobResult[]): string {
  if (rows.length === 0) return "No results."
  const columns: Column[] = [
    { header: "ID", width: Math.max(2, ...rows.map((r) => r.id.length)), cell: (r) => r.id },
    { header: "TITLE", width: 40, cell: (r) => r.title },
    { header: "AGENCY", width: 24, cell: (r) => r.company ?? "—" },
    { header: "LOCATION", width: 22, cell: (r) => r.location ?? "—" },
    { header: "CLOSES", width: 10, cell: (r) => shortDate(r.closes) },
  ]
  const row = (cells: string[]) => cells.map((c, i) => c.slice(0, columns[i].width).padEnd(columns[i].width)).join("  ")
  const header = row(columns.map((c) => c.header))
  const body = rows.map((r) => row(columns.map((c) => c.cell(r))))
  return [header, "-".repeat(header.length), ...body].join("\n")
}

function renderPlain(rows: JobResult[]): string {
  if (rows.length === 0) return "No results."
  const block = (r: JobResult) =>
    [
      r.title,
      `  ${r.company ?? "—"}${r.department ? ` (${r.department})` : ""} · ${r.location ?? "—"}`,
      `  closes: ${shortDate(r.closes)}${r.salary ? ` · ${r.salary}` : ""}`,
      `  id: ${r.id}`,
      `  ${r.url}`,
    ].join("\n")
  return rows.map(block).join("\n\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const resp = await apiGet(buildQuery(opts))
    const items = extractItems(resp)
    const rows = items.map(toResult)
    const total = totalCount(resp)

    if (opts.format === "table") {
      process.stdout.write(renderTable(rows) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(renderPlain(rows) + "\n")
    } else {
      process.stdout.write(
        JSON.stringify({ meta: { count: rows.length, page: opts.page, total }, results: rows }, null, 2) + "\n",
      )
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}
