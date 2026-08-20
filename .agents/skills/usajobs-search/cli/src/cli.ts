#!/usr/bin/env bun
// Self-contained CLI for the official USAJOBS Search API (data.usajobs.gov) —
// federal government job announcements (CDC, NIH, FDA, every other agency's
// direct-hire postings). No external CLI framework, zero runtime dependencies.
//
// Requires a free API key: register at https://developer.usajobs.gov/apirequest/
// and set USAJOBS_API_KEY + USAJOBS_USER_AGENT (see helpers.ts / README.md).

import { runSearch, type SearchOpts } from "./commands/search.js"
import { runDetail, type DetailOpts } from "./commands/detail.js"
import { BASE_URL } from "./helpers.js"

interface Flags {
  _: string[]
  [k: string]: string | boolean | string[]
}

const ALIAS: Record<string, string> = { q: "query", n: "limit", l: "location" }

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith("-")) {
      ;(flags._ as string[]).push(a)
      continue
    }
    const name = a.replace(/^-+/, "")
    const key = ALIAS[name] ?? name
    const next = argv[i + 1]
    let value: string | boolean = true
    if (next !== undefined && !next.startsWith("-")) {
      value = next
      i++
    }
    // Repeatable flags collect into arrays; everything else is last-wins.
    if (key === "location" || key === "category" || key === "hiring-path") {
      const acc = Array.isArray(flags[key]) ? (flags[key] as string[]) : []
      if (typeof value === "string") acc.push(value)
      flags[key] = acc
    } else {
      flags[key] = value
    }
  }
  return flags
}

function stringFlag(raw: string | boolean | string[] | undefined): string | undefined {
  return typeof raw === "string" ? raw : undefined
}

function commaList(raw: string | boolean | string[] | undefined): string[] {
  if (Array.isArray(raw)) return raw.flatMap((v) => v.split(",")).map((s) => s.trim()).filter(Boolean)
  if (typeof raw !== "string") return []
  return raw.split(",").map((s) => s.trim()).filter(Boolean)
}

const HELP = `usajobs-cli — search the official USAJOBS Search API (federal government jobs)

USAGE
  bun run src/cli.ts search [-q "<keywords>"] [flags] [--format json|table|plain]
  bun run src/cli.ts detail <MatchedObjectId> [--format json|plain]

SEARCH FLAGS
  --query, -q <text>        Keyword search (title/body).
  --location, -l <place>    LocationName, e.g. "Bethesda, Maryland". Repeatable.
  --category <code>         JobCategoryCode (occupational series), e.g. "0401". Repeatable.
  --hiring-path <path>      HiringPath code, e.g. "public", "status". Repeatable.
  --organization <code>     Organization/agency subelement code (or free text — see README).
  --who-may-apply <val>     WhoMayApply, e.g. "public", "all".
  --jobage <days>           DatePosted: days back. Passthrough — verify accepted values live.
  --sort <field>            SortField, e.g. "DatePosted". Passthrough.
  --sort-dir <dir>          SortDirection: "Asc" | "Desc".
  --page <n>                1-indexed page. Default 1.
  --limit, -n <n>           ResultsPerPage (API max 500). Default 25.
  --format <fmt>            json (default) | table | plain.

DETAIL
  <MatchedObjectId>         The 'id' field from a search result. Best-effort re-search —
                             USAJOBS has no dedicated by-ID endpoint (see README/url-reference.md).

EXAMPLES
  bun run src/cli.ts search -q "genomics" -l "Bethesda, Maryland" --jobage 14 --format table
  bun run src/cli.ts search -q "molecular biologist" --organization HE --format table
  bun run src/cli.ts detail 12345678 --format plain

Requires USAJOBS_API_KEY and USAJOBS_USER_AGENT env vars (free registration at
https://developer.usajobs.gov/apirequest/). Source: ${BASE_URL}
`

function parseIntFlag(name: string, raw: string | boolean | string[]): number | null {
  const val = parseInt(raw as string, 10)
  if (isNaN(val)) {
    process.stderr.write(JSON.stringify({ error: `--${name} must be a number, got "${raw}"`, code: "BAD_ARG" }) + "\n")
    return null
  }
  return val
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2)
  const flags = parseFlags(argv)
  const cmd = (flags._ as string[])[0]

  if (!cmd || flags.help || flags.h) {
    process.stdout.write(HELP)
    return cmd ? 0 : 1
  }

  if (cmd === "search") {
    const fmt = (flags.format as string) || "json"

    for (const name of ["jobage", "page", "limit"] as const) {
      if (flags[name] !== undefined) {
        const v = parseIntFlag(name, flags[name])
        if (v === null) return 1
        flags[name] = String(v)
      }
    }

    const opts: SearchOpts = {
      query: stringFlag(flags.query),
      location: commaList(flags.location),
      organization: stringFlag(flags.organization),
      category: commaList(flags.category),
      hiringPath: commaList(flags["hiring-path"]),
      whoMayApply: stringFlag(flags["who-may-apply"]),
      jobage: flags.jobage ? parseInt(flags.jobage as string, 10) : undefined,
      sortField: stringFlag(flags.sort),
      sortDirection: stringFlag(flags["sort-dir"]),
      page: flags.page ? Math.max(1, parseInt(flags.page as string, 10)) : 1,
      limit: flags.limit ? Math.max(1, parseInt(flags.limit as string, 10)) : 25,
      format: (["json", "table", "plain"].includes(fmt) ? fmt : "json") as SearchOpts["format"],
    }
    return runSearch(opts)
  }

  if (cmd === "detail") {
    const id = (flags._ as string[])[1]
    if (!id) {
      process.stderr.write(JSON.stringify({ error: "detail requires a <MatchedObjectId>", code: "NO_ID" }) + "\n")
      return 1
    }
    const fmt = (flags.format as string) || "json"
    const opts: DetailOpts = { id, format: fmt === "plain" ? "plain" : "json" }
    return runDetail(opts)
  }

  process.stderr.write(JSON.stringify({ error: `Unknown command "${cmd}"`, code: "BAD_CMD" }) + "\n")
  return 1
}

main().then((code) => process.exit(code))
