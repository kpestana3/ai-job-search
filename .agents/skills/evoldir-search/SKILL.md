---
name: evoldir-search
version: 1.0.0
description: >
  Use this skill when the user wants to search EvolDir job postings — academic
  positions in evolutionary biology, ecology, population genetics, bioinformatics,
  and genomics, sourced from the EvolDir mailing list archive maintained at McMaster
  University. Trigger phrases: EvolDir, evolutionary biology jobs, population
  genetics postdoc, evolution job postings, academic evolution jobs, genomics
  postdoc listings, ecology and evolution faculty positions.
context: fork
allowed-tools: Bash(bun run .agents/skills/evoldir-search/cli/src/cli.ts *)
---

# EvolDir Job Search Skill

Search academic job postings from **EvolDir**, the long-running evolutionary-biology
mailing list archived as a static page at McMaster University
(`evol.mcmaster.ca/brian/Jobs.html`). Postings cover faculty, postdoc, research
technician, and lab manager positions in evolutionary biology, ecology, population
genetics, and genomics — worldwide, mostly academic institutions.

> This portal has **no search engine, no JSON API, and no structured fields** — it's
> a single flat index page of dated, plain-text postings (an emailed-in-turned-web
> archive). This skill is a best-effort adaptation of the standard portal-skill
> contract; see "Notes" below for exactly what is and isn't reliable.

## When to use this skill

- Looking for evolutionary biology / ecology / population genetics / genomics academic jobs (faculty, postdoc, research tech, lab manager)
- Scanning recent EvolDir postings by keyword
- Reading the full text of a specific EvolDir posting

## Commands

### Search job listings

```bash
bun run .agents/skills/evoldir-search/cli/src/cli.ts search [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — keyword filter. **Matches against the posting's filename slug only** (e.g. `UKansas.LabTech.ComplexTraits`), not the full posting body — see Notes.
- `--jobage <days>` — posted within N days. The index page has no year in its dates; the CLI infers the year (future month/day relative to today → last year) and filters from there.
- `--page <n>` — 1-indexed page over the (filtered) result list. There is only one source page on the portal side; pagination here is entirely client-side.
- `--limit <n>` / `-n <n>` — cap results emitted.
- `--format json|table|plain` — default `json`.
- `--location` is **not supported** — the portal has no location parameter and location isn't reliably separable from the filename.

### Fetch full posting detail

```bash
bun run .agents/skills/evoldir-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

`id` is the filename slug from `search` results (e.g. `UKansas.LabTech.ComplexTraits`). Returns
the full plain-text posting body, plus a best-effort extracted contact email if one appears in
the text (regex scan — not guaranteed present or unique).

## Usage examples

```bash
# All recent postings, table view
bun run .agents/skills/evoldir-search/cli/src/cli.ts search --format table

# Genomics-related postings
bun run .agents/skills/evoldir-search/cli/src/cli.ts search -q genomics --format table

# Postings from the last 14 days
bun run .agents/skills/evoldir-search/cli/src/cli.ts search --jobage 14 --format table

# Full text of a specific posting
bun run .agents/skills/evoldir-search/cli/src/cli.ts detail UKansas.LabTech.ComplexTraits --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use, passing filenames to `detail` |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single posting's full text (`detail` command) |

All errors are written to **stderr** as `{ "error": "...", "code": "..." }` and the process exits with code `1`.

## Notes (portal quirks — read before trusting a field)

- **`title`** is the raw filename slug (e.g. `Flagstaff_Arizona.MolEcolGenomics`). This is the
  only reliably-present identifier; EvolDir readers are used to reading these directly.
- **`company`** is a *heuristic guess*: the first dot-separated token of the filename, underscores
  replaced with spaces (e.g. `UKansas` → "UKansas", `Flagstaff_Arizona` → "Flagstaff Arizona").
  This is sometimes an institution, sometimes a location, sometimes neither — always verify
  against the full posting via `detail` before relying on it.
- **`location`** is always `null` — not reliably separable from the filename or body.
- **`date`** is parsed from the index page's `Mon DD HH:MM` column with an inferred year (the
  page itself has no year). Treat as approximate.
- **`--query` only matches filenames**, not posting body text. Fetching all ~20-25 posting
  bodies for full-text search was deliberately not implemented, to keep request volume low
  against a personal academic server — use `detail` to read a promising posting's full text.
- The index page is a **rolling window** (roughly the last 6-8 weeks of postings, older ones
  drop off) — there is no archive/pagination on the portal side.
- No authentication required; `robots.txt` does not block these paths. Still, keep request
  volume low — this is a personal server, not a commercial job board.
