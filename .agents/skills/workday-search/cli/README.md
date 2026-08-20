# workday-cli

CLI for the Workday CXS job-search API — the same unauthenticated endpoint
every standard Workday Recruiting career site's own search widget calls. One
implementation, many companies (see `../companies.json`).

**Data source**: `https://{tenant}.{wd}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs` (search) and `.../wday/cxs/{tenant}/{site}{externalPath}` (detail).
**Authentication**: None required — reads are public.
**Dependencies**: None (plain `bun` + `fetch`). `bun install` is optional and only pulls dev type defs.

## Installation

```bash
cd .agents/skills/workday-search/cli
bun install   # optional — only installs TypeScript dev types
```

## Commands

| Command | Description |
|---------|-------------|
| `companies` | List the company registry (`../companies.json`) |
| `search` | Search a company's job postings by keyword |
| `detail` | Fetch full detail for a single posting |

`search` accepts `--format json|table|plain` (default `json`); `detail` accepts `--format json|plain`; `companies` accepts `--format json|table` (default `json`).
All errors are written to **stderr** as `{ "error": "...", "code": "..." }` with exit code `1`.

## Quick examples

```bash
# See what companies are registered
bun run src/cli.ts companies --format table

# Search a registered company
bun run src/cli.ts search --company illumina -q "genomics" --format table
bun run src/cli.ts search --company jefferson -q "research scientist" --format table

# Search a company NOT yet in the registry (raw override)
bun run src/cli.ts search --tenant merck --wd wd5 --site SearchJobs -q "scientist" --format table

# Full detail for one job (id from a search result, or a full URL — both work)
bun run src/cli.ts detail --company illumina "/job/US---California---San-Diego/Sr-Director---Population-Genomics_43041-JOB-1" --format plain
```

See `../SKILL.md` for the full flag reference, "Adding a company" steps, and
important limitations (location filtering is best-effort, not a guaranteed
facet filter — see there before relying on `--location`).

## Search flags

| Flag | Alias | Description |
|------|-------|-------------|
| `--company` | `-c` | Registry key from `companies.json`. Required unless using the raw override. |
| `--tenant` / `--wd` / `--site` | | Raw override, all three required together — for a company not yet registered. |
| `--query` | `-q` | Free-text keyword search. |
| `--location` | | Best-effort only, folded into `searchText` — see SKILL.md. |
| `--page` | | 1-indexed page. Default 1. |
| `--limit` | `-n` | Results per page. Default 20. |
| `--format` | | `json` \| `table` \| `plain`. |

## Adding a new company

Don't guess a site name into `companies.json` — verify it live first:

```bash
curl -s -X POST "https://{tenant}.{wdN}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs" \
  -H "Content-Type: application/json" -H "User-Agent: Mozilla/5.0" \
  -d '{"appliedFacets":{},"limit":3,"offset":0,"searchText":"scientist"}'
```

A real `total` count + `jobPostings` array confirms it works. An
`HTTP_422` error or a suspicious `"total":0` for a large company both mean
the site name guess is wrong — see `../SKILL.md` "Adding a company" for what
to try next.
