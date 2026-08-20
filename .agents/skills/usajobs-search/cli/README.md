# usajobs-cli

CLI for the official [USAJOBS Search API](https://developer.usajobs.gov/) —
federal government job announcements (CDC, NIH, FDA, and every other agency's
direct-hire postings).

**Data source**: `https://data.usajobs.gov/api/search` (the only public endpoint — see "No detail endpoint" below).
**Authentication**: Required. A free API key, no anonymous reads.
**Dependencies**: None (plain `bun` + `fetch`). `bun install` is optional and only pulls dev type defs.

## Getting an API key (required, free, no approval process)

1. Register at <https://developer.usajobs.gov/apirequest/> with the email address you'll use as your `User-Agent`.
2. USAJOBS emails you an `Authorization-Key` immediately — no approval wait, no usage fees.
3. Set both env vars before running the CLI:

```bash
export USAJOBS_API_KEY="<key from the confirmation email>"
export USAJOBS_USER_AGENT="<the same email you registered with>"
```

Without both set, every command fails fast with a clear error pointing back here.

## Installation

```bash
cd .agents/skills/usajobs-search/cli
bun install   # optional — only installs TypeScript dev types
```

## Commands

| Command | Description |
|---------|-------------|
| `search` | Search federal job announcements by keyword, location, category, agency, hiring path |
| `detail` | Best-effort re-lookup of one job by its `MatchedObjectId` — see caveat below |

`search` accepts `--format json|table|plain` (default `json`); `detail` accepts `--format json|plain`.
All errors are written to **stderr** as `{ "error": "...", "code": "..." }` with exit code `1`.

## No detail endpoint (important quirk)

USAJOBS's public API is search-only — there is no `GET /jobs/{id}` the way
freehire or LinkedIn have. The upside: **`search` results already include full
detail** (job summary, major duties, requirements, how-to-apply) inline, at no
extra request cost — unlike the other portal skills in this repo, you don't
need a second `detail` call just to read a posting.

`detail <id>` still exists as a convenience: it re-issues a keyword search
using the ID and returns the item whose `MatchedObjectId` matches exactly.
This works when the ID happens to be indexed in the posting's searchable text
(common, not guaranteed). If it returns `NOT_FOUND`, use the `url` field
already present in the `search` result instead — it's a normal usajobs.gov
webpage.

## Quick examples

```bash
# Genomics-related postings near Bethesda, last 14 days
bun run src/cli.ts search -q "genomics" -l "Bethesda, Maryland" --jobage 14 --format table

# Molecular biologist roles at Health and Human Services (org code HE)
bun run src/cli.ts search -q "molecular biologist" --organization HE --format table

# Full detail for one job, from a search result's id
bun run src/cli.ts detail 12345678 --format plain
```

See `../SKILL.md` for the full flag reference and `../url-reference.md` for
field-mapping details and the confidence caveats on less-common parameters.

## Search flags

| Flag | Alias | Description |
|------|-------|-------------|
| `--query` | `-q` | Keyword search (title/body). |
| `--location` | `-l` | `LocationName`, e.g. `"Bethesda, Maryland"`. Repeatable. |
| `--category` | | `JobCategoryCode` (occupational series), e.g. `0401` (biology). Repeatable. |
| `--hiring-path` | | `HiringPath` code, e.g. `public`, `status`. Repeatable. |
| `--organization` | | Agency subelement code (or free text — unverified which USAJOBS prefers; see url-reference.md). |
| `--who-may-apply` | | `WhoMayApply`, e.g. `public`, `all`. |
| `--jobage` | | `DatePosted`: days back. Passthrough — verify accepted values against the live API. |
| `--sort` | | `SortField`, e.g. `DatePosted`. Passthrough. |
| `--sort-dir` | | `SortDirection`: `Asc` \| `Desc`. |
| `--page` | | 1-indexed page. Default 1. |
| `--limit` | `-n` | `ResultsPerPage` (API max 500). Default 25. |
| `--format` | | `json` \| `table` \| `plain`. |
