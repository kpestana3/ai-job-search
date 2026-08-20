---
name: usajobs-search
version: 1.0.0
description: >
  Use this skill to search official USAJOBS listings — federal government job
  announcements (CDC, NIH, FDA, and every other federal agency's direct-hire
  postings) via the government's own public Search API. Trigger phrases:
  USAJOBS, federal government jobs, federal job announcement, direct-hire
  federal position, NIH jobs, CDC jobs, federal civil service jobs.
context: fork
allowed-tools: Bash(bun run .agents/skills/usajobs-search/cli/src/cli.ts *)
---

# USAJOBS Search Skill

Search official federal government job announcements from **USAJOBS**
(`data.usajobs.gov`), the U.S. government's own job board. Every federal
agency's direct-hire postings — not agency contractor roles, which are
separate private-sector listings — live here first.

> Unlike `linkedin-search` and `freehire-search`, this API **requires a free
> API key** (no anonymous reads). See "Getting an API key" below — this is a
> one-time, no-approval registration, not a blocker, but it does mean this
> skill won't work until the env vars are set.

## When to use this skill

- Looking for federal direct-hire positions (research scientist, lab manager,
  data curator, program analyst, etc.) at a specific agency (NIH, CDC, FDA, ...)
  or across all of them
- Federal postings a candidate's target list includes but that don't show up
  reliably via LinkedIn or Google `site:` searches of an agency's careers page
  (government job listings are frequently under-indexed by search engines)
- Checking whether a specific agency/organization currently has open direct-hire
  roles in a given occupational category

## Getting an API key (required, free, no approval process)

1. Register at <https://developer.usajobs.gov/apirequest/> using the email
   address you want to use as your `User-Agent`.
2. USAJOBS emails an `Authorization-Key` immediately.
3. Set both env vars before invoking this skill:
   ```bash
   export USAJOBS_API_KEY="<key from the confirmation email>"
   export USAJOBS_USER_AGENT="<the same email you registered with>"
   ```

Without both set, every command fails fast with a clear stderr error pointing
back to this registration step — it does not hang or retry against a bad key.

## Commands

### Search job listings

```bash
bun run .agents/skills/usajobs-search/cli/src/cli.ts search [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — keyword search (title/body).
- `--location <place>` / `-l <place>` — `LocationName`, e.g. `"Bethesda, Maryland"`. Repeatable (OR).
- `--category <code>` — `JobCategoryCode` (occupational series), e.g. `0401` for biological sciences. Repeatable.
- `--hiring-path <path>` — `HiringPath` code, e.g. `public`, `status`. Repeatable.
- `--organization <code>` — agency subelement code (or free text — see "Notes" below, unverified which USAJOBS actually expects).
- `--who-may-apply <val>` — `WhoMayApply`, e.g. `public`, `all`.
- `--jobage <days>` — `DatePosted`: restrict to postings within N days. **Passthrough, not validated** — see Notes.
- `--sort <field>` / `--sort-dir <Asc|Desc>` — `SortField`/`SortDirection`. Passthrough.
- `--page <n>` — 1-indexed page.
- `--limit <n>` / `-n <n>` — `ResultsPerPage` (API max 500). Default 25.
- `--format json|table|plain` — default `json`.

### Fetch full posting detail

```bash
bun run .agents/skills/usajobs-search/cli/src/cli.ts detail <MatchedObjectId> [--format json|plain]
```

**Read this before reaching for `detail`:** USAJOBS's public API is
search-only — there is no dedicated by-ID lookup endpoint. `search` results
**already carry full detail inline** (job summary, major duties,
requirements, how-to-apply) at no extra request cost, so in most workflows
you never need `detail` at all — just read the `search --format json` output.
`detail <id>` exists as a best-effort convenience only: it re-issues a
keyword search using the ID and returns the item whose `MatchedObjectId`
matches exactly. If the ID isn't indexed in the posting's searchable text,
this returns `NOT_FOUND` — fall back to the `url` field already present in
the `search` result (a normal usajobs.gov webpage).

## Usage examples

```bash
# Genomics-related postings near Bethesda, last 14 days
bun run .agents/skills/usajobs-search/cli/src/cli.ts search -q "genomics" -l "Bethesda, Maryland" --jobage 14 --format table

# Molecular biology roles at Health and Human Services (org code HE)
bun run .agents/skills/usajobs-search/cli/src/cli.ts search -q "molecular biologist" --organization HE --format table

# All open postings in the biological sciences occupational series
bun run .agents/skills/usajobs-search/cli/src/cli.ts search --category 0401 --format table
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use; already includes full detail fields (see above) |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single job's full detail (`detail` command, or pipe one `search` JSON result through) |

All errors are written to **stderr** as `{ "error": "...", "code": "..." }` and the process exits with code `1`.

## Notes (confidence caveats — read before trusting an unfamiliar parameter)

- **Empirically confirmed** during scaffolding: base URL `https://data.usajobs.gov/api/search` exists and returns `401 Unauthorized` without valid `Authorization-Key`/`User-Agent` headers (tested live via `curl`).
- **From stable, long-established public documentation** (not re-verified live in this session — the official `developer.usajobs.gov` docs pages timed out repeatedly when fetched during scaffolding, likely a heavy client-rendered site): the `Keyword`, `LocationName`, `Organization`, `JobCategoryCode`, `HiringPath`, `WhoMayApply`, `Page`, `ResultsPerPage`, `SortField`, `SortDirection`, `DatePosted` parameter names, and the `MatchedObjectDescriptor` response field names this skill reads. This API has been stable for years, so this is a reasonable-confidence gap, not a guess — but the first real run should be sanity-checked against `url-reference.md`'s field list.
- **`--organization`** — unverified whether USAJOBS expects an agency *subelement code* (e.g. a specific NIH institute code) or accepts organization names as free text. Try a known code first (agency codes are published via USAJOBS's separate Code List API, not covered by this skill); fall back to folding the agency name into `--query` if `--organization` returns nothing.
- **`--jobage`** — passed through as the raw `DatePosted` value with no validation. Public documentation historically listed specific accepted values (commonly 1/3/7/10/15/30/60) rather than arbitrary day counts; if a given number returns unexpectedly broad or empty results, try one of those instead.
- **No remote/telework filter** — deliberately omitted rather than guessed. If telework-eligible-only results matter, filter client-side on the returned `PositionOfferingType` fields once visible in a sample response.
