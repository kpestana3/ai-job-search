import { textFetch, buildDetailUrl, normalizeId, parseDetail, writeError } from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const id = normalizeId(opts.id)
  if (!id) {
    writeError(`Could not parse a posting id from "${opts.id}"`, "BAD_ID")
    return 1
  }
  try {
    const text = await textFetch(buildDetailUrl(id))
    if (!text) {
      writeError("Posting not found", "NOT_FOUND")
      return 1
    }
    const posting = parseDetail(text, id)

    if (opts.format === "plain") {
      const lines = [
        posting.title,
        posting.company ? `Heuristic company/location guess: ${posting.company}` : "",
        posting.contactEmail ? `Contact (best-effort): ${posting.contactEmail}` : "",
        "",
        posting.description || "(no description)",
        "",
        `URL: ${posting.url}`,
      ].filter((l) => l !== "")
      process.stdout.write(lines.join("\n") + "\n")
    } else {
      process.stdout.write(JSON.stringify(posting, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
