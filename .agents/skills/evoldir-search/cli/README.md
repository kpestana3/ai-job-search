# evoldir-cli

CLI for searching **EvolDir** academic job postings — evolutionary biology, ecology,
population genetics, and genomics positions, mirrored as static pages at McMaster University.

**Data source**: `evol.mcmaster.ca/brian/Jobs.html` (index) and `evol.mcmaster.ca/brian/evoldir/Jobs/` (postings).
**Authentication**: None required.
**Dependencies**: None (plain `bun` + `fetch`). `bun install` is optional and only pulls dev type defs.

> **No search engine, no JSON API, no structured fields.** This portal is a single flat
> index page of dated plain-text postings. `search` filters by filename only (not full
> posting text), and `company`/`location` are heuristic guesses at best. See `../SKILL.md`
> and `../url-reference.md` for exactly what is and isn't reliable.

## Installation

```bash
cd .agents/skills/evoldir-search/cli
bun install   # optional — only installs TypeScript dev types
```

The CLI runs without any install because it has zero runtime dependencies.

## Commands

| Command | Description |
|---------|-------------|
| `search` | List/filter current postings from the index page |
| `detail` | Fetch the full plain-text body of a single posting |

`search` accepts `--format json|table|plain` (default `json`); `detail` accepts `--format json|plain`.
All errors are written to **stderr** as `{ "error": "...", "code": "..." }` with exit code `1`.

## Quick examples

```bash
# All recent postings
bun run src/cli.ts search --format table

# Genomics-related postings
bun run src/cli.ts search -q genomics --format table

# Postings from the last 14 days
bun run src/cli.ts search --jobage 14 --format table

# Full text of a specific posting
bun run src/cli.ts detail UKansas.LabTech.ComplexTraits --format plain
```

See `../SKILL.md` for the full flag reference and portal-quirk notes.

## Search flags

| Flag | Alias | Description |
|------|-------|--------------|
| `--query` | `-q` | Filter by filename slug. Matches filenames only, not posting body text. |
| `--jobage` | | Posted within N days (year inferred from the index page's dateless format). |
| `--page` | | 1-indexed page over the filtered result list (client-side; the portal has one index page). |
| `--limit` | `-n` | Cap results emitted. |
| `--format` | | `json` \| `table` \| `plain`. |

## Testing

```bash
bun run test        # runs both unit tests (tests/parsing.test.ts) and live smoke tests (tests/live.test.ts)
bun run typecheck
```

`tests/live.test.ts` hits the real EvolDir server (two requests: one search, one detail). Keep
this in mind if running the suite repeatedly in quick succession — this is a personal academic
server, not a load-test target.
