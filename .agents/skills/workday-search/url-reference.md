# Workday CXS API reference

The endpoint, parameters, and response shapes this skill depends on. This is
the file to update if Workday's CXS API changes shape.

## Verification status

Everything in this document is **[LIVE]** — confirmed via direct `curl`
against 9 real companies during scaffolding (2026-07-19), not inferred from
third-party docs (unlike `usajobs-search/url-reference.md`, where the
official docs site was unreachable). This endpoint isn't officially
documented by Workday at all — it's the internal API each career site's own
search widget calls, reverse-engineered the same way every other Workday
job-scraping tool does.

## Authentication

None. Every request tested succeeded with no API key, no cookies, no prior
page load — just a `User-Agent` header (some tenants may be pickier about
this than the ones tested; `Mozilla/5.0` worked for all 9).

## `POST /wday/cxs/{tenant}/{site}/jobs`

Full base URL: `https://{tenant}.{wd}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs`

Request body:
```json
{
  "appliedFacets": {},
  "searchText": "genomics",
  "limit": 20,
  "offset": 0
}
```

- `appliedFacets` — this skill always sends `{}` (no faceted filtering — see "Location filtering" in SKILL.md for why).
- `searchText` — free-text keyword query. Empty string is accepted by some tenants but returned `HTTP_422` on others during testing (see "Tenant quirks" below) — always send a non-empty value when in doubt.
- `limit`/`offset` — standard pagination. `offset = (page - 1) * limit`.

### Response shape

```jsonc
{
  "total": 127,
  "jobPostings": [
    {
      "title": "Sr Director,  Population Genomics",
      "externalPath": "/job/US---California---San-Diego/Sr-Director---Population-Genomics_43041-JOB-1",
      "locationsText": "US - California - San Diego",   // or "N Locations" when multi-site
      "postedOn": "Posted 26 Days Ago",                  // relative text only, no absolute date here
      "bulletFields": ["43041-JOB"],                      // [0] is the requisition ID
      "timeType": "Full time"                             // present on some tenants (e.g. Jefferson), absent on others (e.g. Illumina) — treat as optional
    }
  ],
  "facets": [ /* facet definitions with IDs/counts — not used by this skill, see Location filtering */ ]
}
```

**Tenant quirks observed**: `timeType` appears in some tenants' search
results and not others (schema isn't perfectly uniform across companies) —
this skill treats it as optional everywhere. `locationsText` is `"N
Locations"` (not a place name) for multi-site postings.

## `GET /wday/cxs/{tenant}/{site}{externalPath}`

`externalPath` already starts with `/job/...` as returned by search — append
it directly to the base path, no extra slash.

### Response shape (fields this skill reads)

```jsonc
{
  "jobPostingInfo": {
    "id": "627b8e4c1fe410011d6da936f0380000",
    "title": "Sr Director,  Population Genomics",
    "jobDescription": "<p>What if the work you did...</p>",  // HTML, stripped by this skill's cleanHtml()
    "location": "US - California - San Diego",                // simple string, unlike search's locationsText
    "postedOn": "Posted 26 Days Ago",                          // same relative text as search
    "startDate": "2026-06-23",                                 // absolute ISO date — ONLY available here, not in search results
    "timeType": "Full time",
    "jobReqId": "43041-JOB",                                   // matches search's bulletFields[0]
    "jobPostingId": "Sr-Director---Population-Genomics_43041-JOB-1",
    "jobPostingSiteId": "illumina-careers",
    "country": { "descriptor": "United States of America", "id": "..." },
    "canApply": true,
    "posted": true,
    "jobRequisitionLocation": { "descriptor": "US - California - San Diego - HQ", "country": { "descriptor": "...", "alpha2Code": "US" } },
    "externalUrl": "https://illumina.wd1.myworkdayjobs.com/illumina-careers/job/US---California---San-Diego/Sr-Director---Population-Genomics_43041-JOB-1",
    "questionnaireId": "36eda403f2331001ffa2cbb476710000"
  }
}
```

**Key point**: `startDate` (an absolute date) is only available from
`detail`, not `search` — if a caller needs a real sortable date rather than
"Posted N Days Ago" text, it has to call `detail`.

## Error responses

- **`{"errorCode":"HTTP_422","httpStatus":422,...}`** — wrong tenant/site
  combination for that request shape. This is the main failure mode when
  adding a new company with a guessed site name. This skill surfaces it as a
  clear `SEARCH_FAILED`/`DETAIL_FAILED` error pointing back at the registry,
  rather than a generic HTTP error.
- **`"total":0` with an empty `jobPostings` array** — can mean either a
  genuinely empty result set, OR (confirmed during scaffolding, e.g. the
  Novavax attempt) a subtly wrong site name that doesn't trigger a 422 but
  never returns real data either. Not distinguishable from the response
  alone — always sanity-check a new company with a broad keyword before
  trusting either outcome.
- **404** on the detail endpoint — the specific posting has likely closed or
  the externalPath was mistyped.

## Companies checked but not added

See `companies.json`'s `_unverified_needs_followup` (CHOP, QIAGEN, Novavax —
tenant found, but the standard site-name guess didn't resolve; needs a real
browser's network tab to find the actual site identifier) and
`_confirmed_not_on_workday` (Thermo Fisher, AbbVie, 10x Genomics — verified
during scaffolding to use their own custom career sites, not Workday at all).
