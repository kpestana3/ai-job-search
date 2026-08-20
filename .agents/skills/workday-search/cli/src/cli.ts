#!/usr/bin/env bun
// Self-contained CLI for the Workday CXS job-search API -- the same
// unauthenticated endpoint pattern used by every standard Workday Recruiting
// career site. One implementation covers many companies via companies.json;
// see that file and README.md "Adding a company" to extend the registry.

import { runSearch, type SearchOpts } from "./commands/search.js"
import { runDetail, normalizeExternalPath, type DetailOpts } from "./commands/detail.js"
import { runCompanies } from "./commands/companies.js"
import { resolveCompany, rawCompanyConfig, type CompanyConfig } from "./helpers.js"

interface Flags {
  _: string[]
  [k: string]: string | boolean | string[]
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith("-")) {
      ;(flags._ as string[]).push(a)
      continue
    }
    const name = a.replace(/^-+/, "")
    const next = argv[i + 1]
    let value: string | boolean = true
    if (next !== undefined && !next.startsWith("-")) {
      value = next
      i++
    }
    flags[name] = value
  }
  return flags
}

function stringFlag(raw: string | boolean | string[] | undefined): string | undefined {
  return typeof raw === "string" ? raw : undefined
}

const HELP = `workday-cli — search any Workday-hosted career site via its own public search API

USAGE
  bun run src/cli.ts search --company <key> [-q "<keywords>"] [flags] [--format json|table|plain]
  bun run src/cli.ts detail --company <key> <externalPath|url> [--format json|plain]
  bun run src/cli.ts companies [--format json|table]

COMPANY SELECTION (required for search/detail — one of the two)
  --company, -c <key>       A key from companies.json, e.g. "illumina", "jefferson". See 'companies' command.
  --tenant/--wd/--site      Raw override for a company not yet in the registry, e.g.:
                             --tenant illumina --wd wd1 --site illumina-careers
                             (all three required together; bypasses the registry entirely)

SEARCH FLAGS
  --query, -q <text>        Free-text keyword search.
  --location <text>         Best-effort only — folded into the free-text query, not a guaranteed
                             filter (Workday's real location facets need per-tenant UUIDs). See README.
  --page <n>                1-indexed page. Default 1.
  --limit, -n <n>           Results per page. Default 20.
  --format <fmt>            json (default) | table | plain.

DETAIL
  <externalPath|url>        Either the 'id' field from a search result (a /job/... path) or a full
                             posting URL — both work.

COMPANIES
  Lists the company registry (companies.json). --format table | json (default json).

EXAMPLES
  bun run src/cli.ts search --company illumina -q "genomics" --format table
  bun run src/cli.ts search --tenant merck --wd wd5 --site SearchJobs -q "scientist" --format table
  bun run src/cli.ts detail --company illumina "/job/US---California---San-Diego/Sr-Director---Population-Genomics_43041-JOB-1" --format plain
  bun run src/cli.ts companies --format table

No API key needed — this is the same public endpoint each Workday career site's own
search widget calls. Keep request volume low (see README.md "Rate limiting").
`

function resolveCompanyFromFlags(flags: Flags): CompanyConfig | null {
  const key = stringFlag(flags.company) ?? stringFlag(flags.c)
  if (key) return resolveCompany(key)
  const tenant = stringFlag(flags.tenant)
  const wd = stringFlag(flags.wd)
  const site = stringFlag(flags.site)
  if (tenant && wd && site) return rawCompanyConfig(tenant, wd, site)
  return null
}

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

  if (cmd === "companies") {
    const fmt = (flags.format as string) === "table" ? "table" : "json"
    return runCompanies(fmt)
  }

  if (cmd === "search") {
    const company = resolveCompanyFromFlags(flags)
    if (!company) {
      process.stderr.write(
        JSON.stringify({ error: "search requires --company <key> (see companies.json) or --tenant/--wd/--site all together", code: "NO_COMPANY" }) + "\n",
      )
      return 1
    }
    for (const name of ["page", "limit"] as const) {
      if (flags[name] !== undefined) {
        const v = parseIntFlag(name, flags[name])
        if (v === null) return 1
        flags[name] = String(v)
      }
    }
    const fmt = (flags.format as string) || "json"
    const opts: SearchOpts = {
      company,
      query: stringFlag(flags.query) ?? stringFlag(flags.q),
      location: stringFlag(flags.location),
      page: flags.page ? Math.max(1, parseInt(flags.page as string, 10)) : 1,
      limit: flags.limit ? Math.max(1, parseInt(flags.limit as string, 10)) : 20,
      format: (["json", "table", "plain"].includes(fmt) ? fmt : "json") as SearchOpts["format"],
    }
    return runSearch(opts)
  }

  if (cmd === "detail") {
    const company = resolveCompanyFromFlags(flags)
    if (!company) {
      process.stderr.write(
        JSON.stringify({ error: "detail requires --company <key> (see companies.json) or --tenant/--wd/--site all together", code: "NO_COMPANY" }) + "\n",
      )
      return 1
    }
    const idArg = (flags._ as string[])[1]
    if (!idArg) {
      process.stderr.write(JSON.stringify({ error: "detail requires an <externalPath|url>", code: "NO_ID" }) + "\n")
      return 1
    }
    const externalPath = normalizeExternalPath(idArg)
    if (!externalPath) {
      process.stderr.write(JSON.stringify({ error: `could not parse a job path from "${idArg}"`, code: "BAD_ID" }) + "\n")
      return 1
    }
    const fmt = (flags.format as string) || "json"
    const opts: DetailOpts = { company, externalPath, format: fmt === "plain" ? "plain" : "json" }
    return runDetail(opts)
  }

  process.stderr.write(JSON.stringify({ error: `Unknown command "${cmd}"`, code: "BAD_CMD" }) + "\n")
  return 1
}

main().then((code) => process.exit(code))
