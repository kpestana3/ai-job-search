# USAJOBS Search API reference

The endpoint, parameters, and response shape this skill depends on. This is
the file to update if the USAJOBS API changes.

## Verification status (read this first)

Two different confidence levels are mixed in this document, and they're
labeled inline:

- **[LIVE]** — confirmed against the real endpoint during scaffolding (2026-07-19), via direct `curl`.
- **[DOCS]** — from long-stable, widely-used public USAJOBS API documentation and third-party client libraries (e.g. the `jobapis/jobs-usajobs` PHP wrapper's parameter names), but **not re-confirmed live in this session** — the official `developer.usajobs.gov` API reference pages repeatedly timed out when fetched (likely a heavy client-rendered docs site, not an API outage). This API has been stable for years, so [DOCS] entries are reasonable-confidence, not guesses — but the first real authenticated run should be diffed against this file, and any mismatch should update this file.

## Authentication — [LIVE] required, [DOCS] header names

```
GET https://data.usajobs.gov/api/search
Host: data.usajobs.gov
User-Agent: <your registered email>
Authorization-Key: <key from developer.usajobs.gov registration>
```

**[LIVE]** Confirmed: a request with no `Authorization-Key` header returns
`401 Unauthorized` with body
`{"type":"https://tools.ietf.org/html/rfc9110#section-15.5.2","title":"Unauthorized","status":401,"traceId":"..."}`.
A request with an invalid key returns the identical 401 — the API does not
distinguish "missing" from "wrong" in the error body, so this skill's error
message covers both cases with the same registration pointer.

Register (free, no approval process) at <https://developer.usajobs.gov/apirequest/>.

## `GET /api/search` — [DOCS] parameters

| Param | Maps to CLI flag | Notes |
|-------|------------------|-------|
| `Keyword` | `--query` / `-q` | Full-text keyword search. |
| `LocationName` | `--location` / `-l` | Repeatable for multiple locations, e.g. `"Bethesda, Maryland"`. |
| `Organization` | `--organization` | Agency subelement code per USAJOBS's separate Code List API — **unverified** whether free-text organization names also work; see SKILL.md Notes. |
| `JobCategoryCode` | `--category` | Occupational series code, e.g. `0401` (General Biological Science). Repeatable. |
| `HiringPath` | `--hiring-path` | e.g. `public`, `status`, `vet`. Repeatable. |
| `WhoMayApply` | `--who-may-apply` | e.g. `public`, `all`. |
| `DatePosted` | `--jobage` | Days back. Historically documented as accepting a specific small set of values (commonly 1/3/7/10/15/30/60) rather than arbitrary integers — passed through unvalidated by this skill. |
| `SortField` | `--sort` | e.g. `DatePosted`. Passthrough, not validated. |
| `SortDirection` | `--sort-dir` | `Asc` \| `Desc`. |
| `Page` | `--page` | 1-indexed. |
| `ResultsPerPage` | `--limit` / `-n` | API max is 500 per **[DOCS]**; default 25 in this CLI. |

Not implemented: remote/telework filtering (no confirmed parameter name — see
SKILL.md Notes), and `Organization`'s exact expected value format.

### Response shape — [DOCS]

```jsonc
{
  "LanguageCode": "EN",
  "SearchParameters": { /* echoes the request */ },
  "SearchResult": {
    "SearchResultCount": 20,       // items in this page
    "SearchResultCountAll": 143,   // total matches across all pages
    "SearchResultItems": [
      {
        "MatchedObjectId": "12345678",         // -> result.id, and detail's <id>
        "MatchedObjectDescriptor": {
          "PositionID": "HE-12345-25-AB",       // agency's own req ID (not usable for detail lookup)
          "PositionTitle": "Genomics Data Curator",
          "PositionURI": "https://www.usajobs.gov/job/12345678",  // -> result.url, a normal webpage
          "OrganizationName": "National Institutes of Health",     // -> result.company
          "DepartmentName": "Department of Health And Human Services", // -> result.department
          "PositionLocationDisplay": "Bethesda, Maryland",         // -> result.location
          "PositionRemuneration": [
            { "MinimumRange": "70000", "MaximumRange": "95000", "RateIntervalCode": "Per Year" }
          ],                                                        // -> result.salary (formatted)
          "PublicationStartDate": "2026-07-01",                    // -> result.date
          "ApplicationCloseDate": "2026-08-01",                    // -> result.closes
          "UserArea": {
            "Details": {
              "JobSummary": "…",           // -> detail.jobSummary
              "MajorDuties": ["…", "…"],   // -> detail.majorDuties (array or single string; both seen in docs/wrappers)
              "Requirements": "…",         // -> detail.requirements
              "HowToApply": "…",           // -> detail.howToApply
              "WhoMayApply": { "Name": "Public" }, // -> detail.whoMayApply
              "HiringPath": ["public"]     // -> result.hiringPaths
            }
          }
        }
      }
    ]
  }
}
```

**Key architectural point**: full detail (`JobSummary`, `MajorDuties`,
`Requirements`, `HowToApply`) is already present in every **search** result —
this is unlike freehire/linkedin, where search returns a lightweight card and
a second `detail` request is needed for the full posting text. This skill's
`toDetail()` just reshapes fields already in hand; it costs nothing extra
when called from `search`'s own JSON output. The `detail` **command**, by
contrast, has to re-query (see below) because it only has an ID, not the
original response.

## No by-ID endpoint — how `detail` compensates

**[DOCS]**: USAJOBS's public API does not expose a `GET /api/search/{id}` or
equivalent. `detail <id>` in this skill works around that by re-issuing
`Keyword=<id>` and scanning the results for an exact `MatchedObjectId` match.
This is genuinely best-effort — there's no guarantee an ID string is indexed
in a posting's searchable text — so a `NOT_FOUND` result is expected
sometimes, not a bug. The reliable path to a specific posting's full text is
either (a) keep the original `search` JSON, which already has everything, or
(b) fetch the `PositionURI` URL directly as a normal webpage.

## Parsing notes

- No HTML to strip — the API returns clean JSON text fields (unlike freehire's
  HTML `description`).
- `MajorDuties` has been seen documented as both a string array and a single
  string depending on API version/client library; `toDetail()` handles both
  (`joinIfArray`).
- Empty organization/location/salary fields are surfaced as `null`, never
  omitted, matching the other portal skills' contract.
