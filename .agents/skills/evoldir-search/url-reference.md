# EvolDir Jobs URL Reference

Static pages maintained by Brian Golding at McMaster University, mirroring the EvolDir
mailing list's job postings. No JSON API, no query parameters, no authentication.

## Index (all current postings)

```
GET https://evol.mcmaster.ca/brian/Jobs.html
```

Returns one HTML page: an `<h1>Jobs</h1>` header followed by a single `<pre>` block containing
one line per posting, in reverse-chronological order:

```html
<a href="/brian/evoldir/Jobs//UCollege_London.ResTech.sedaDNA">UCollege_London.ResTech.sedaDNA</a>                               1 KB        Apr 18 08:53
```

Per-line fields, in order:
1. `<a href="/brian/evoldir/Jobs//<filename>">` — the href, always `/brian/evoldir/Jobs//<filename>` (double slash is real, not a typo — the server tolerates it).
2. Link text — same `<filename>` as the href, used as the display title / id.
3. File size (`NNN bytes` or `N KB`) — not used by this skill.
4. Date, format `Mon DD HH:MM` (e.g. `Apr 18 08:53`) — **no year present**. The CLI infers the
   year: if the month/day would be in the future relative to today, assume last year; otherwise
   this year (same heuristic as `ls -l` / directory listings).

No pagination, no query string, no filters of any kind on this page — it is a static rolling
window of roughly the last 6-8 weeks of postings (older entries simply disappear from the
`<pre>` block; there is no separate archive endpoint found).

## Detail (single posting)

```
GET https://evol.mcmaster.ca/brian/evoldir/Jobs//<filename>
```

Returns `Content-Type: text/plain; charset=UTF-8` — the raw plain-text posting body (this is a
mailing-list archive; postings are literally the emailed text, unstructured prose). No HTML,
no tags to strip. Confirmed via `Last-Modified` header that this date matches the index page's
listed date for the same file.

There is **no consistent structured format** inside the body: institution, position title,
deadline, and contact vary in placement and phrasing per submitter. The only thing this skill
extracts beyond the raw text is a best-effort email-address regex scan (many postings end with
a contact line like `Stuart Macdonald (sjmac@ku.edu)`), which may find zero, one, or (rarely)
multiple addresses.

## Filename convention (informal, not guaranteed)

Filenames are typically `<Institution>.<PositionType>.<Topic>`, dot-separated, e.g.:
- `UKansas.LabTech.ComplexTraits` → University of Kansas, Lab Tech, Complex Traits
- `Flagstaff_Arizona.MolEcolGenomics` → here the first token is a **location**, not an institution
- `UCollegeLondon.Two.BioinformaticsAnthropology.Mar17` → "Two" indicates two positions in one posting; trailing `.Mar17` is a submitter-added date disambiguator

This convention is informal and submitter-controlled — treat any field derived from it as a
heuristic, not ground truth. This skill uses the first dot-separated token as a best-effort
`company` field for exactly this reason, documented as unreliable in `SKILL.md`.

## Access

`robots.txt` at `evol.mcmaster.ca/robots.txt` does not disallow `/brian/` or `/brian/evoldir/`.
No authentication required. This is a personal academic server, not a commercial job board —
keep request volume low regardless.
