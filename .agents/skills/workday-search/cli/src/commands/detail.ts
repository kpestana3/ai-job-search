import { detailApi, toDetail, writeError, type CompanyConfig, type JobDetailResult } from "../helpers.js"

export interface DetailOpts {
  company: CompanyConfig
  externalPath: string // e.g. "/job/US---California---San-Diego/Sr-Director_43041-JOB-1", or a full URL (normalized by the caller)
  format: "json" | "plain"
}

function renderPlain(job: JobDetailResult): string {
  const lines = [job.title, `${job.company} · ${job.location ?? "—"}${job.country ? `, ${job.country}` : ""}`]
  const field = (label: string, value: string | null) => {
    if (value) lines.push(`${label}: ${value}`)
  }
  field("Req ID", job.reqId)
  field("Posted", job.date)
  field("Start date", job.startDate)
  field("Employment type", job.timeType)
  lines.push("", job.description ?? "(no description)", "", `URL: ${job.url}`, `id: ${job.id}`)
  return lines.join("\n")
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  try {
    const info = await detailApi(opts.company, opts.externalPath)
    const job = toDetail(opts.company, opts.externalPath, info)

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

/** Extracts externalPath from a full Workday job URL, or passes a bare /job/... path through. */
export function normalizeExternalPath(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (trimmed.startsWith("/job/")) return trimmed
  // Full URL: everything from "/job/" onward is the externalPath.
  const m = trimmed.match(/(\/job\/.+)$/)
  if (m) return m[1]
  return null
}
