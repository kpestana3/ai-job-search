import { INDEX_URL, textFetch, parseIndex, writeError, type Posting } from "../helpers.js"

export interface SearchOpts {
  query?: string
  jobage: number
  page: number
  limit?: number
  format: "json" | "table" | "plain"
}

function renderTable(postings: Posting[]): string {
  if (postings.length === 0) return "No results."
  const rows = postings.map((p) => {
    const title = p.title.slice(0, 52).padEnd(52)
    const company = (p.company || "—").slice(0, 24).padEnd(24)
    const date = (p.date || "—").slice(0, 10)
    return `${title} ${company} ${date}`
  })
  const header = "FILENAME (id)".padEnd(52) + " " + "COMPANY (heuristic)".padEnd(24) + " DATE"
  return [header, "-".repeat(header.length), ...rows].join("\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const html = await textFetch(INDEX_URL)
    let postings = parseIndex(html)

    if (opts.query) {
      const q = opts.query.toLowerCase()
      postings = postings.filter((p) => p.id.toLowerCase().includes(q))
    }

    if (opts.jobage && opts.jobage < 9999) {
      const cutoff = Date.now() - opts.jobage * 24 * 60 * 60 * 1000
      postings = postings.filter((p) => p.date !== null && new Date(p.date).getTime() >= cutoff)
    }

    // Client-side pagination over the filtered set — the portal itself has
    // only one index page, so this slices our own filtered array.
    const pageSize = 25
    const start = (opts.page - 1) * pageSize
    postings = postings.slice(start, start + pageSize)

    if (opts.limit !== undefined && opts.limit >= 0) postings = postings.slice(0, opts.limit)

    if (opts.format === "table") {
      process.stdout.write(renderTable(postings) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(
        postings
          .map((p) => `${p.title}\n  ${p.company || "—"} · ${p.date || "—"}\n  ${p.url}`)
          .join("\n\n") + "\n",
      )
    } else {
      process.stdout.write(
        JSON.stringify({ meta: { count: postings.length, page: opts.page }, results: postings }, null, 2) + "\n",
      )
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}
