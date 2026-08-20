---
name: workday-search
version: 1.0.0
description: >
  Use this skill to search job postings across any of the companies in
  companies.json that host their careers site on Workday — a single
  implementation covers all of them via the same public search API each
  Workday career site's own search widget calls internally. Trigger phrases:
  Workday jobs, company career site, "search <company>'s job openings",
  Workday careers search, myworkdayjobs.
context: fork
allowed-tools: Bash(bun run .agents/skills/workday-search/cli/src/cli.ts *)
---

# Workday Search Skill

Search job postings hosted on **Workday Recruiting** career sites — the
platform used by a large share of major employers (Illumina, Jefferson
Health, Merck, GSK, Sanofi, Gilead, LabCorp, Roche/Genentech, Abbott, and
more — see `companies.json`). Unlike the other portal skills in this repo,
this is **one implementation that covers many companies**: every standard
Workday career site exposes the identical unauthenticated JSON search API
(the "CXS" API) that its own job-search widget calls, and the only thing
that differs per company is a `tenant`/`wd`-subdomain/`site` triple.

> No API key needed — this endpoint is public and unauthenticated, the same
> trust tier as `linkedin-search` and `freehire-search`. Confirmed live
> against 9 different companies during scaffolding (2026-07-19).

## When to use this skill

- Checking a specific company (from `companies.json`) for open roles
- A company on a candidate's target list has no dedicated portal skill, but
  is confirmed to run Workday — check the registry first before assuming a
  Google `site:` search fallback is the only option
- Extending coverage: a new target company can often be added here in
  minutes (see "Adding a company" below) rather than needing a whole new
  `/add-portal` build from scratch

## Commands

### List known companies

```bash
bun run .agents/skills/workday-search/cli/src/cli.ts companies [--format json|table]
```

Always check this first — the registry only contains companies verified
live, not every company that might be on Workday.

### Search job listings

```bash
bun run .agents/skills/workday-search/cli/src/cli.ts search --company <key> [flags]
```

Key flags:
- `--company <key>` / `-c <key>` — a key from `companies.json`, e.g. `illumina`, `jefferson`. **Required, unless using the raw override below.**
- `--tenant <t> --wd <wdN> --site <s>` — raw override for a company not yet in the registry (all three required together). Useful for testing a newly-discovered tenant before adding it to `companies.json`.
- `--query <text>` / `-q <text>` — free-text keyword search.
- `--location <text>` — **best-effort only**, folded into the free-text query. Workday's real faceted location filter needs per-tenant facet UUIDs that aren't simply discoverable — see "Location filtering" below.
- `--page <n>` — 1-indexed page. Default 1.
- `--limit <n>` / `-n <n>` — results per page. Default 20.
- `--format json|table|plain` — default `json`.

### Fetch full posting detail

```bash
bun run .agents/skills/workday-search/cli/src/cli.ts detail --company <key> <externalPath|url> [--format json|plain]
```

`externalPath` is the `id` field from a search result (a `/job/...` path) — a
full posting URL also works, the CLI extracts the path automatically.

## Usage examples

```bash
bun run .agents/skills/workday-search/cli/src/cli.ts companies --format table
bun run .agents/skills/workday-search/cli/src/cli.ts search --company illumina -q "genomics" --format table
bun run .agents/skills/workday-search/cli/src/cli.ts search --company jefferson -q "research scientist" --format table
bun run .agents/skills/workday-search/cli/src/cli.ts detail --company illumina "/job/US---California---San-Diego/Sr-Director---Population-Genomics_43041-JOB-1" --format plain
```

## Adding a company

1. Find the company's Workday careers URL (search `"myworkdayjobs.com" <company> careers`) — it looks like `https://{tenant}.{wdN}.myworkdayjobs.com/{site}`.
2. **Verify live before adding to the registry** — a wrong tenant/site guess doesn't error clearly (see "Known pitfall" below), it either 422s or silently returns zero results:
   ```bash
   curl -s -X POST "https://{tenant}.{wdN}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs" \
     -H "Content-Type: application/json" -H "User-Agent: Mozilla/5.0" \
     -d '{"appliedFacets":{},"limit":3,"offset":0,"searchText":"scientist"}'
   ```
   A real `total` count and `jobPostings` array confirms it. `{"errorCode":"HTTP_422",...}` or `"total":0` on a broad keyword for a large company both mean the site name guess is wrong — the marketing/login URL's path segment isn't always the real site identifier (see `companies.json`'s `_unverified_needs_followup` section for three companies where this happened: CHOP, QIAGEN, Novavax).
3. Add a confirmed entry to `companies.json`'s `companies` object.

## Location filtering (important limitation)

Workday's real location filter (the facet chips on the career site's own
search UI) requires per-tenant facet UUIDs discovered via a separate
`/facets` API call, not simple free text. This skill does **not** implement
that — `--location` is folded into the free-text `searchText` query instead,
which works reasonably well for most tenants (Workday's search tends to
full-text-match against location strings too) but is **not a guaranteed
filter**. Always check the `location` field on returned results rather than
trusting `--location` to have filtered precisely.

## Rate limiting

Workday sites sit behind bot-detection/WAF layers (often Akamai) that can
temporarily throttle (429/403) a burst of rapid requests. This is typically a
short cooldown, not a lasting block, at the request volumes a personal job
search generates. The CLI retries 429/5xx with backoff (same pattern as
`freehire-search`/`usajobs-search`); keep volume low regardless, same
discipline as `linkedin-search`.

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single job's full detail (`detail` command) |

All errors are written to **stderr** as `{ "error": "...", "code": "..." }` and the process exits with code `1`.

## Known pitfall: silent wrong-tenant failures

Unlike a typical REST API, a wrong `site` name for a *real* `tenant`/`wd`
often does **not** 404 — Workday sometimes returns `HTTP_422` with an opaque
error body, and sometimes just returns `"total":0` even for a broad keyword
that should obviously match something at a company of any size. Neither is a
reliable "you have the wrong site name" signal on its own — always verify a
new company with the `curl` command above using a *broad, common* keyword
(e.g. "scientist" or "manager") before trusting a zero-result response.
