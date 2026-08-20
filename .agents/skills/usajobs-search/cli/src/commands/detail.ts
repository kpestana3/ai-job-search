// USAJOBS's public Search API has no dedicated by-ID lookup endpoint (see
// helpers.ts module note and url-reference.md). `detail` is therefore a
// best-effort re-search: it queries Keyword=<id> and returns the item whose
// MatchedObjectId or PositionID matches exactly. This works when the ID appears
// in the announcement's indexed text (common, but not guaranteed) — if it
// doesn't turn up a match, the error message points back at the PositionURI
// (a normal usajobs.gov webpage) already returned by `search`.

import { apiGet, extractItems, toDetail, writeError, type JobDetailResult } from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

function renderPlain(job: JobDetailResult): string {
  const lines = [job.title, `${job.company ?? "—"}${job.department ? ` (${job.department})` : ""} · ${job.location ?? "—"}`]
  const field = (label: string, value: string | null) => {
    if (value) lines.push(`${label}: ${value}`)
  }
  field("Closes", job.closes)
  field("Salary", job.salary)
  field("Who may apply", job.whoMayApply)
  if (job.hiringPaths.length) lines.push(`Hiring paths: ${job.hiringPaths.join(", ")}`)
  lines.push("", job.jobSummary ?? "(no summary)")
  if (job.majorDuties) lines.push("", "Major duties:", job.majorDuties)
  if (job.requirements) lines.push("", "Requirements:", job.requirements)
  if (job.howToApply) lines.push("", "How to apply:", job.howToApply)
  lines.push("", `URL: ${job.url}`, `id: ${job.id}`)
  return lines.join("\n")
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  try {
    const resp = await apiGet(new URLSearchParams({ Keyword: opts.id, ResultsPerPage: "25" }))
    const items = extractItems(resp)
    const match = items.find((i) => i.MatchedObjectId === opts.id || i.MatchedObjectDescriptor.PositionID === opts.id)

    if (!match) {
      writeError(
        `no exact match for id "${opts.id}" via re-search (USAJOBS has no by-ID lookup endpoint — this is best-effort). ` +
          `If you have the job's PositionURI from a search result, that's a normal webpage — open it directly instead.`,
        "NOT_FOUND",
      )
      return 1
    }

    const job = toDetail(match)
    if (opts.format === "plain") {
      process.stdout.write(renderPlain(job) + "\n")
    } else {
      process.stdout.write(JSON.stringify(job, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
