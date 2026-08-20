# CV Templates and Tailoring Guide

<!-- BEGIN ACTIVE-TEMPLATE (managed by /add-template - do not edit by hand) -->
> **Active template override: `ats-resume`**
>
> A custom template is active for the **industry resume** (not the academic CV, which stays on moderncv). Where this block conflicts with the stock guidance below, this block wins. Structural advice below (tailoring, page-budget, cutting rules) still applies.
>
> - **Template skeleton:** `templates/cv/ats-resume/template.tex` — use this as the structural reference instead of the stock moderncv template
> - **Manifest:** `templates/cv/ats-resume/TEMPLATE.md` — read this for style rules and known pitfalls before drafting
> - **Compile with:** `lualatex` (same engine as before — fontawesome5 still needs it, pdflatex still fails on modern MiKTeX)
> - **Fonts:** Latin Modern (`lmodern`, system/TeX-distribution font) + FontAwesome5 icon glyphs — no bundled font files
> - **Page limit:** exactly **1 page** (tighter than the stock template's 2-page limit — see "Page Budget - Hard 1-Page Limit" below for the revised content budget this requires)
> - **Output file:** naming convention changes — the industry resume's DocType token is now **`Resume`**, not `CV`, to keep it visually distinct from `AcademicCV` at a glance: `applications/<Company>_<RoleSlugOrJobID>/[YOUR_NAME]_Resume_<Company>_<id or slug>.tex` (see `.claude/commands/apply.md`, which has been updated to match). The master reference file stays at `cv/main_example.tex` (rebuilt in the new template's structure) — only the per-application generated filename token changed.
<!-- END ACTIVE-TEMPLATE -->

<!-- SETUP: Profile statements and section ordering are personalized by running /setup -->

## Document Type Decision: Industry Resume vs. Academic CV

Two CV formats are available. Decide which (or both) to generate before drafting anything.

| Format | Output file | Master reference | Length |
|--------|-------------|-------------------|--------|
| Industry resume | `applications/<Company>_<RoleSlug or JobID>/[YOUR_NAME]_Resume_<Company>_<id or slug>.tex` | `cv/main_example.tex` | Hard 1-page limit; content is cut per posting (see "Relevance-weighted cutting" below) |
| Academic CV | `applications/<Company>_<RoleSlug or JobID>/[YOUR_NAME]_AcademicCV_<Company>_<id or slug>.tex` | `cv/academic_cv_template.tex` | No page limit; full publication list, all conference presentations, teaching/mentoring experience, and grants — never cut for length |

See `.claude/commands/apply.md` for the full per-application output folder structure and naming convention. `cv/main_example.tex` and `cv/academic_cv_template.tex` are master reference templates and stay in `cv/` — only per-application tailored copies move into `applications/`.

**Decision rule**, based on posting signals:

| Posting signal | Generate |
|---|---|
| University/research institute, postdoc/faculty/research-scientist title, PI-run lab, grant-funded (NIH/NSF/Gates/etc.), academic department | **Academic CV** (+ cover letter). Add the industry resume too only if the user asks for it. |
| Industry biotech/pharma/diagnostics company, standard corporate HR process, "Scientist"/"Research Associate" title at a for-profit | **Industry resume** only |
| Ambiguous (e.g., a company-funded academic collaboration, a government research role, an industry-run postdoc-equivalent program) | Ask the user, or default to generating **both** — the cost of an extra document is low relative to guessing wrong |

**Academic CV generation notes:**
- Base off `cv/academic_cv_template.tex`, not `cv/main_example.tex`.
- **Section order is fixed** (see "Academic CV Section Order" below) — do not reorder sections per posting. Per-posting targeting happens *within* sections instead: reweight bullet emphasis and lead with the most relevant sub-item (e.g., which Research Skills category is listed first, which Work Experience bullets are expanded) — same targeting logic as the resume, just applied inside the fixed structure rather than by moving whole sections around.
- Do **not** cut content for length. Publications, Posters and Presentations, Teaching Experience, Mentoring Experience, and Grants and Funding always stay complete, regardless of relevance to the specific posting.
- Still compile-and-inspect (see below): no strict page count, but check for orphaned entries and section headers isolated at the bottom of a page. See "Section-Heading Orphan Prevention" below — this is a longer document with more page breaks than the resume, so it needs its own `\needspace{...}` before every `\section{...}`, not just before individual `\cventry` entries.
- References: **omit the References section from the per-application Academic CV by default.** Only include it if the specific posting explicitly asks for references to be submitted as part of the application/CV itself — a standalone reference sheet (`08-reference-sheet-templates.md`) is generated for every application regardless, and that already covers the standard case. When a posting does explicitly request references in the CV, list the candidate's actual named references with contact info directly in the document (standard academic convention), not "available upon request" (standard industry-resume convention); only include references the candidate has explicitly confirmed, and **use the same 4-5 references selected for this posting's standalone reference sheet** (see `08-reference-sheet-templates.md`'s selection logic) rather than the full pool. `cv/academic_cv_template.tex` itself keeps the full pool as the reference source for when a posting does call for it.

### Academic CV Section Order (standard, fixed)

Applies to every academic CV going forward — `cv/academic_cv_template.tex` and every per-application copy generated from it:

1. Professional Statement
2. Research Skills
3. Work Experience
4. International Training
5. Awards and Funding
6. Teaching and Mentoring (one section; "Teaching Experience" and "Mentoring Experience" as bold sub-labels within it, each with its own itemize list)
7. Education
8. Publications and Posters (one section; "Publications", "Presentations (as presenter)", and "Additional Posters (Co-Author)" as bold sub-labels within it, each with its own itemize list — keep the presenter/co-author distinction, never blur the two)
9. Service and Leadership
10. Professional Memberships
11. Certifications
12. References (conditional — see the References note above; omit unless the posting explicitly asks for references in the application/CV)

Items 9-12 aren't part of the user's original fixed-order request but are kept at the end in this relative order for consistency; if new section types are added later, default to appending them after Certifications and before References unless told otherwise.

### Section-Heading Orphan Prevention (standing rule, academic CV)

**Every `\section{...}` in the academic CV must be preceded by `\needspace{N\baselineskip}`**, sized for the heading plus at least its first entry. This is distinct from (and in addition to) the existing `\needspace{5\baselineskip}` calls placed before individual `\cventry` blocks inside a section — those protect against orphaning *within* a section between entries; this protects the section *heading itself* from being stranded alone at the bottom of a page with all its content pushed to the next page.

**Root cause of the bug this fixes:** placing `\needspace{...}` only *inside* the section (e.g., right before the first `\cventry`, after `\section{Education}` has already been typeset) does not work — by the time LaTeX evaluates that `\needspace` call, the heading has already been committed to the current page. If there isn't room for what follows, the page breaks *after* the heading, leaving it orphaned with a large blank gap and all content on the next page. The `\needspace{...}` must come **before** `\section{...}`, so a page break (if needed) happens before the heading, moving the whole heading+content block together.

Suggested sizes (heading + a reasonably-sized chunk of the first entry — not necessarily the entire first entry if it's long, since the per-entry `\needspace` calls already guard the largest blocks):

| Section | Suggested `\needspace` |
|---|---|
| Research Skills | `5\baselineskip` |
| Work Experience | `9\baselineskip` |
| International Training | `6\baselineskip` |
| Awards and Funding | `5\baselineskip` |
| Teaching and Mentoring | `7\baselineskip` |
| Education | `6\baselineskip` |
| Publications and Posters | `6\baselineskip` (plus `4\baselineskip` before each of the "Presentations" and "Additional Posters" sub-labels, since those are mid-section break points too) |
| Service and Leadership / Certifications | `4\baselineskip` |
| Professional Memberships | `3\baselineskip` |
| References | `6-7\baselineskip` (more if the reference list is long) |

After adding or resizing any `\needspace` call, always recompile and **visually inspect the full document page by page** — `\needspace` sizing is a heuristic, not a guarantee, and a longer document with more page breaks than the 2-page resume is more likely to have a second orphan turn up somewhere else after the first fix.

## Template: LaTeX moderncv (Banking Style)

All CVs use the moderncv LaTeX package with the "banking" style and "blue" color scheme. This section covers the **industry resume**; academic CV specifics are noted inline where they differ.

**Output file:** `applications/<Company>_<RoleSlug or JobID>/[YOUR_NAME]_CV_<Company>_<id or slug>.tex` (see `.claude/commands/apply.md` for the folder/naming convention)
**Compile with:** **lualatex** on MiKTeX/TeX Live. pdflatex often fails on modern MiKTeX installs with `fontawesome5` font-expansion errors; lualatex handles the same sources cleanly.
**Master reference:** `cv/main_example.tex` (comprehensive CV with all competencies, experience, and achievements - use as source when building targeted CVs)

### Compile command

```bash
cd applications/<Company>_<RoleSlug or JobID> && lualatex -interaction=nonstopmode [YOUR_NAME]_CV_<Company>_<id or slug>.tex
```

Expected output: `Output written on [YOUR_NAME]_CV_<Company>_<id or slug>.pdf (2 pages, ...)`. Any page count other than 2 is a failure that must be fixed before presenting to the user. CVs (industry resume and academic CV) have no external file dependencies, so they compile cleanly from any directory — unlike the cover letter, which needs `cover.cls` and `OpenFonts/` from `cover_letters/` (see `.claude/commands/apply.md` for that compile pattern).

## Document Structure

```latex
\documentclass[11pt,a4paper,sans]{moderncv}
\moderncvstyle{banking}
\moderncvcolor{blue}

% Force both first and last name AND section headings to render in moderncv
% blue (color1). Default banking on lualatex+MiKTeX leaves these black, which
% looks inconsistent with the rest of the blue accent scheme.
\renewcommand*{\firstnamestyle}[1]{{\fontsize{34}{36}\bfseries\upshape\color{color1}#1}}
\renewcommand*{\lastnamestyle}[1]{{\fontsize{34}{36}\bfseries\upshape\color{color1}#1}}
\renewcommand*{\sectionstyle}[1]{{\sectionfont\color{color1}#1}}

\usepackage[utf8]{inputenc}
\usepackage{hyperref}
\hypersetup{
    colorlinks=true,
    linkcolor=blue,
    filecolor=magenta,
    urlcolor=blue,
    pdftitle={[YOUR_NAME] - CV},
    pdfpagemode=FullScreen,
}
\usepackage[scale=0.77]{geometry}
\usepackage{import}

% Personal data
\name{[FIRST_NAME]}{[LAST_NAME]}
\address{[YOUR_ADDRESS]}{}{}
\phone[mobile]{[YOUR_PHONE]}
\email{[YOUR_EMAIL]}
\extrainfo{\href{[YOUR_LINKEDIN_URL]}{LinkedIn}, \href{[YOUR_GITHUB_URL]}{GitHub}}

\begin{document}
\makecvtitle

% 1. Profile statement (1-3 sentences, tailored per role)
% 2. Skills section
% 3. Education section
% 4. Work Experience section
% 5. Selected Publications (if applicable)
% 6. Honors and Awards (if applicable)
% 7. References

\end{document}
```

### Icon set override (standing rule, academic CV / moderncv)

**Every academic CV — master template and per-application copies alike — must include `\moderncvicons{marvosym}` immediately after `\moderncvcolor{blue}`.** Without it, moderncv's `banking` style auto-selects FontAwesome5 icons whenever compiling under lualatex/xelatex (`\ifxetexorluatex` in `moderncviconssymbols.sty`). Under this MiKTeX+lualatex setup, those FontAwesome5 glyphs (used for the phone/email contact-line icons) fail to render as icons and instead fall back to literal glyph-name text in the **compiled, rendered PDF itself** — e.g. `MOBILE-ANDROID-ALT` printed before the phone number, and oversized circle-emoji bullet markers throughout the document. This is a more severe version of the same root cause behind the `ats-resume` template's icon-glyph pdftotext issue (see "ATS Parseability" below), except here it's visible on the rendered page, not just in text extraction — caught during visual PDF review on an Exponent application (2026-07-30), where it wasn't noticed until final inspection. `\moderncvicons{marvosym}` uses the classic MarVoSym symbol font instead, which renders correctly under lualatex. Always visually inspect the compiled header (not just page count) to confirm real icon glyphs appear, not text.

**A second, separate issue lives in the same header and needs its own fix.** Even after the icon-set override above, moderncv's `banking` style separates the phone/email/extrainfo fields with `\textbullet` forced into `\rmfamily` (`moderncvheadiii.sty`'s `\makeheaddetailssymbol`). That glyph renders fine visually but extracts via `pdftotext` as a bare `�` (Unicode replacement character) under this MiKTeX+lualatex setup — a real ATS-extraction failure that a visual PDF check alone won't catch (confirmed 2026-07-30, same application). Every academic CV — master template and per-application copies alike — must also include, right after `\moderncvicons{marvosym}`:
```latex
\renewcommand*{\makeheaddetailssymbol}{\hspace{1em}{\rmfamily |}\hspace{1em}}
```
This swaps the bullet for a plain pipe, which extracts cleanly and matches the separator style already used in the `ats-resume` template's contact line. After any header change, always run `pdftotext -enc UTF-8` and check for `�`/`(cid:` in addition to the visual check — this bug was invisible on the rendered page and only showed up in the text layer.

**A third issue, also found in the same review pass: paper size.** The academic CV template used `a4paper` while every other document in this repo (`cv/main_example.tex`, `templates/cv/ats-resume/template.tex`, `cover_letters/cover.cls`) uses `letterpaper`. A4 is ~0.7in taller and narrower than US Letter, which reads as inconsistent/excessive top-bottom spacing when viewed or printed on a US Letter-assuming system — flagged by the user as "the margins look really weird" (2026-07-30). Since the candidate and target employers are US-based, `\documentclass[11pt,letterpaper,sans]{moderncv}` is correct — never `a4paper` for this candidate's documents.

**A fourth issue, found immediately after the paper-size fix: `geometry`'s `scale` mode does not split the top/bottom margin evenly.** Even after switching to `letterpaper`, the user still saw the bottom margin visibly larger than the top ("double the footer than the header," 2026-07-30) — `\usepackage[scale=0.80]{geometry}` computes the margin split from geometry's internal ratio defaults, which don't account for moderncv's own headheight/headsep eating into the top share differently than footskip eats into the bottom. Fixed by replacing it with explicit, symmetric values: `\usepackage[top=1in, bottom=1in, left=0.75in, right=0.75in]{geometry}`. Prefer explicit `top=`/`bottom=`/`left=`/`right=` over `scale=` for this template going forward — it's what `cv/main_example.tex` and `templates/cv/ats-resume/template.tex` already do, and it removes this whole class of ambiguity.

### Color overrides

The three `\renewcommand*` lines in the preamble are required on lualatex+MiKTeX. Without them the firstname, lastname, and section headings render in black even though `\moderncvcolor{blue}` is set, which looks inconsistent with the rest of the blue accent scheme (links, bullet markers, contact icons). The override forces all three to use `color1` (moderncv's accent colour, which becomes blue under `\moderncvcolor{blue}`). Both names render bold; if you prefer the firstname in regular weight, change the firstnamestyle override from `\bfseries` to `\mdseries`. Don't drop the override - on most modern installs the defaults render visibly wrong.

### Spacing inside itemize lists (important)

**Do not place `\vspace{...}` between `\item` entries in an `itemize` list.** Even though the source looks symmetric, this pattern occasionally produces a noticeably oversized gap before a single item: the inter-item `\vspace` creates a paragraph break that interacts unpredictably with the list's internal `\itemsep`, so LaTeX renders one of the gaps wider than the rest. Remove the inter-item `\vspace` and let `itemize` use its native uniform spacing.

```latex
% WRONG - intermittently produces an oversized gap before one bullet
\begin{itemize}
\item \textbf{Foo}: ...
\vspace{1pt}
\item \textbf{Bar}: ...
\vspace{1pt}
\item \textbf{Baz}: ...
\end{itemize}

% RIGHT - uniform spacing using the list's native itemsep
\begin{itemize}
\item \textbf{Foo}: ...
\item \textbf{Bar}: ...
\item \textbf{Baz}: ...
\end{itemize}
```

Two related patterns are fine and should be kept:
- `\vspace{1pt}` immediately after `\section{...}` (between section heading and first item) - this is between the heading and the list, not between list items.
- `\vspace{3pt}` between top-level `\cventry` blocks in Work Experience or Education - this gives breathing room between roles and renders consistently.

## Scientific Notation (Life Sciences / Biomedical Roles)

Apply automatically to every CV (industry resume and academic CV alike) whenever organisms or genes are referenced:
- **Genus/species:** italicize with `\textit{}`, e.g. `\textit{Escherichia coli}`.
- **Abbreviation after first mention:** the first full mention in the document is spelled out in full; every subsequent mention abbreviates the genus to its initial and keeps italicizing, e.g. `\textit{Escherichia coli}` -> `\textit{E. coli}`. Track this per document — a genus introduced in the profile statement stays abbreviated for the rest of that same file.
- **Gene names:** italicize, e.g. `\textit{lacZ}`, `\textit{recA}`.
- **Protein names:** do NOT italicize — standard convention distinguishes the italic gene from the roman-text protein it encodes.
- **Latin phrases:** italicize standard italicized Latin scientific terms, e.g. `\textit{in vivo}`, `\textit{ex vivo}`, `\textit{in vitro}`, `\textit{in situ}`.
- **Exception — Publications/Posters citation entries:** reproduce the original title's wording. Italicize genus/species and gene names for correct notation, but do NOT abbreviate the genus there — abbreviating would misquote the actual published title.

## Section-by-Section Tailoring

### Profile Statement / Elevator Pitch (Best Practice)
This is the most important section to customize. It appears right after `\makecvtitle`.

Write 5-7 lines that function as an "elevator pitch": a concise, compelling introduction explaining why you're qualified for *this specific role*. Focus on what the employer gains from hiring you.

**Create 2-3 profile statement templates for your main role types:**

<!-- SETUP: These are populated based on your background -->
**For [YOUR_PRIMARY_ROLE_TYPE] roles (e.g., [EXAMPLE_TITLE_1], [EXAMPLE_TITLE_2]):**
> [YOUR_PROFILE_STATEMENT_TEMPLATE_1 - Example: "Data scientist with a PhD in [field] and X years of industry experience. Combines deep domain expertise in [domain] with strong applied [skill] skills. Experienced in [key capability], with a track record of [notable outcome type]."]

**For [YOUR_SECONDARY_ROLE_TYPE] roles (e.g., [EXAMPLE_TITLE_3], [EXAMPLE_TITLE_4]):**
> [YOUR_PROFILE_STATEMENT_TEMPLATE_2 - vary the emphasis from template 1: lead with a different strength, target a different audience (e.g. academic/government vs. industry).]

### Target Job Title in Statement (standing rule, ATS)

Every profile/professional statement — industry resume and academic CV alike — must include the **exact job title as written in the posting** (e.g. "Postdoctoral Research Associate"), pulled verbatim from the posting text captured in `/apply` Step 0. This is an ATS keyword-matching requirement (confirmed via Jobscan-style feedback): ATS title-matching is often literal, and a resume that never states the target title in its own words scores worse even when the experience clearly qualifies.

- **Frame it as the target role, not fabricated work history.** Use language like "pursuing a **[Exact Title]** position" or "seeking a **[Exact Title]** role" — never phrase it as though the candidate has already held that title. Bold the title for visual scannability.
- Insert it into the **first sentence** of the profile statement, e.g.: "Biomedical scientist pursuing a **Postdoctoral Research Associate** position, with a Ph.D. in..."
- If the posting's title doesn't cleanly fit a sentence opener (unusual titles, internal req codes), integrate it more naturally elsewhere in the first 1-2 sentences — the requirement is presence in the statement, not a fixed sentence template.
- This applies automatically on every `/apply` run — do not wait for the user to ask.

### Date Format (standing rule, ATS)

All dates in the industry resume and academic CV must use **"Month YYYY"** format consistently (e.g. "March 2019", not "Mar 2019" or "2019"). No mixed formats within a document. This is another Jobscan-style ATS finding: parsers extract employment/education dates most reliably from a single consistent format.

- **`\cventry` date fields** (Education, Work Experience) — always `Month YYYY -- Month YYYY` (or a single `Month YYYY` for one-off entries), using the exact months already recorded in `01-candidate-profile.md`. Never abbreviate ("Jan" → "January") and never drop to year-only when a month is known.
- **International Training entries** (bold-label bullets with a parenthetical date) — same standard: convert to a single "Month YYYY". Where the source only specifies a season (e.g. "Fall 2019"), this requires picking a representative month not literally stated in the source — flag this to the user as a best-effort approximation rather than silently asserting it as fact, and update it if they supply the real month.
- **Exceptions, left as-is (do not force into Month YYYY):**
  - Teaching Experience semester lists (e.g. "Fall 2019, Spring 2020, Summer 2020") — these are recurring-term tags describing multiple non-contiguous instances, not a single date; converting to one month would misrepresent the role as a single day rather than a recurring semester-long commitment.
  - Awards/Grants/Mentoring dates where the source genuinely only records a year (no month exists anywhere in `01-candidate-profile.md`) — do not fabricate a month for these. If the user later supplies the missing month, apply it and remove the exception.
  - Publication/poster citation years — these reproduce the actual publication year as indexed by the journal, not a candidate-controlled date.

### Core Competencies / Skills Section (Best Practice)
Reorder and emphasize based on the role. Use bold category labels.

List **5-7 key competencies** in bullet format, tailored to the specific job. For each competency, briefly explain how it adds value to the position.

### Education
- Always include your highest degrees
- For senior roles, keep education brief (dates and titles only)
- Include thesis topics when relevant to the target role

### Work Experience
- Rewrite bullet points to emphasize aspects most relevant to the target role
- Use 4-6 bullets for most recent role, 3-4 for previous, 2-3 for older
- **Emphasize measurable results** where possible: "Reduced processing time by X%", "Model adopted by the team"

### Handling Employment Gaps (Best Practice)
If there is a gap in your employment history:
- The gap should be explained matter-of-factly if needed
- Describe how professional development continued during the gap
- Frame as deliberate skill-building and career repositioning

### Publications
- Include Google Scholar link if applicable
- Select 3-4 most relevant publications (not always all of them)
- For non-academic roles, keep brief

### Honors and Awards
- Keep format brief, one line each

### References
- List 2-4 references with name, title, company, and contact
- End with: "More references are available upon request."
- **Do not attach reference letters** - employers typically contact references directly

## Compile-and-Inspect Loop (MANDATORY, industry resume / `ats-resume` template)

After writing the CV and before presenting to the user, always compile and visually inspect the PDF. Iterate until the layout is clean. Workflow:

1. Run `lualatex -interaction=nonstopmode [YOUR_NAME]_Resume_<Company>_<id or slug>.tex`
2. Check the output page count: must be exactly 1
3. Read the PDF via the Read tool and visually inspect the page
4. Check for **orphaned entries**: a `\resumeentry` title line must never sit alone at the bottom of the page with its bullets pushed off
5. **Check fill, not just page count.** A page that compiles to 1 page but has visible empty space in the bottom third has not passed inspection — see "Problem: content finishes early" below. This check has been skipped in practice more than once (entire roles and the International Research and Training section silently dropped while real space remained), so treat it as equally mandatory to the orphan check, not optional polish.

(The academic CV uses moderncv/`\cventry` and has its own orphan-prevention rules — see "Section-Heading Orphan Prevention" above. This section covers only the industry resume's `ats-resume` template.)

### Fixing common page-break problems

**Problem: entry title at the bottom of the page, bullets pushed off**
Add `\needspace{N\baselineskip}` immediately before the problematic `\resumeentry`, sized for the title plus its first bullet:
```latex
\needspace{5\baselineskip}
\resumeentry{Role Title}{Date range}{Organization}{Location}
\begin{itemize}
    \item ...
\end{itemize}
```
`\usepackage{needspace}` is already in the template preamble.

**Problem: content spills a few lines onto a second page**
Add `\enlargethispage{2-3\baselineskip}` before a late section to reclaim a few lines — but verify with `pdftotext -layout` afterward if pdftotext is available (see the `ats-resume` template's known-pitfalls note on `\enlargethispage` silently truncating content past the real margin).

**Problem: substantial content genuinely spills to a second page**
Cut content using "Relevance-weighted cutting" below — do not compress geometry or `\vspace`.

**Problem: content finishes early, page has visible empty space (feels thin)**
This is not acceptable as a final state. Before doing anything else, check whether an entire role or section was omitted rather than individually trimmed, this is the most common cause, not a missing bullet here or there. Restore, in order: (1) any omitted role from the master CV, especially older/short-duration ones, (2) the International Research and Training section if it was left out, (3) the full Publications/Awards picture (presentation counts, named awards) if it was compressed to one line. Recompile and re-check fill after each restoration; stop once the page reads as complete, not once it merely reaches 1 page.

## ATS Parseability

Most employers run CVs through an ATS before a human sees them, and the ATS reads the PDF's embedded **text layer**, not the rendered page. A CV can pass visual inspection and still extract as garbage. After the layout passes the compile-and-inspect loop, verify the text layer:

```bash
cd cv && pdftotext -layout main_<company>.pdf main_<company>.txt
```

`pdftotext` comes from [poppler](https://poppler.freedesktop.org/), not the TeX distribution - it is an **optional** dependency. If it is not installed, skip the mechanical check with a warning and rely on the visual PDF read for keyword coverage.

What to check in the extraction:

- **Contact details as literal text.** The `ats-resume` template's header contact line is plain text with no fontawesome icons (removed 2026-07-30 - see below). The email address must always appear as printed text, never carried *only* by a hyperlink (like the `LinkedIn` link text, whose URL is not in the text layer).
- **No leftover icon-glyph noise.** fontawesome icon commands (`\faPhone`, `\faEnvelope`, `\faMapMarker*`, etc.) extract via `pdftotext` as the glyph's internal name (`Envelope`, `Map-mark`) sitting inline with the real contact text. This was previously treated as harmless on the assumption ATS only uses extracted text for backend keyword matching - but a real automated resume-parsing tool (TopResume-style critique, 2026-07-30) surfaced this exact artifact as parsed preview text, confirming some ATS platforms display raw extracted text to recruiters. The `ats-resume` template's header no longer uses icons for this reason. If a future template variant wants icons back, verify the glyph doesn't carry a ToUnicode name into the text layer first.
- **No garbled output.** `(cid:NNN)` markers or `�` characters mean a font is embedded without a Unicode mapping - an ATS sees the same garbage. This shows up with unusual fonts in custom templates, not with the stock moderncv setup under lualatex.
- **Reading order.** The stock banking style is single-column, so extraction order matches visual order. Custom templates (via `/add-template`) with sidebars or multi-column layouts can interleave unrelated lines; if extraction order is scrambled, the user is trading ATS compatibility for looks and should be told.
- **Keyword coverage.** Match the posting's required/preferred terms against the extracted text, in the posting's language. Prefer the posting's exact term over a synonym when it is truthfully applicable - ATS matching is often literal. Never add a keyword the profile does not support.

## Page Budget - Hard 1-Page Limit (industry resume, `ats-resume` template)

**This overrides the stock 2-page moderncv budget** — the active `ats-resume` template (see ACTIVE-TEMPLATE block above) is deliberately dense enough that the industry resume now targets **exactly 1 page**, not 2. The academic CV is unaffected (no page limit, stays on moderncv). Use these tighter content limits as a guide:

| Section | Max budget |
|---------|-----------|
| Profile statement | 2-3 lines |
| Core Competencies | 3-4 items, one line each |
| Most recent role | 3-4 bullets |
| Previous role(s) | 2 bullets each — **every role in the master CV/profile gets an entry by default**, not just the two most recent; a short-duration or older role still gets its 1-2 line entry unless the compile-and-check step below shows genuine overflow |
| International Research and Training | 2-3 entries, one line each — include by default whenever the posting values cross-institutional collaboration, independent field work, or fast self-directed learning (true for nearly every posting evaluated so far); this section has been silently dropped from tailored resumes more than once, treat it as "include unless clearly irrelevant," not "include only if there's room" |
| Education | 2 entries, one line each (drop the descriptive blurb unless space allows) |
| Publications / Awards | Include the full picture by default (publication count, conference/seminar presentation count, named awards) — this is usually 2-3 lines, not 1, and has also been under-filled in past drafts; trim only if the compile-and-check step below shows overflow |
| References | Omit the section entirely — standard practice on a 1-page resume; the standalone reference sheet (`08-reference-sheet-templates.md`) covers this for every application regardless |

**Draft inclusively first, cut only after compiling — never pre-omit from the budget table alone.** This table is a target for the *final* document, not a checklist to prune against before a single page has been rendered. The correct sequence is:

1. Draft every role, section, and achievement from the master CV / `01-candidate-profile.md` that has any plausible relevance to the posting — including older/short-duration roles and the International Research and Training section, which are the two most common casualties of premature cutting.
2. Compile once.
3. **Only then** decide what to cut, using "Relevance-weighted cutting" below, and only if the page has genuinely overflowed (a second page with real content on it, not a line or two).
4. If the page compiles with visible empty space in the bottom third, that is a bug, not a stylistic choice — restore the highest-relevance omitted role/section (see "Problem: content finishes early" below) before presenting the resume as final. Whole roles or sections omitted for no verified space reason (rather than individual bullets trimmed after checking) is the specific failure pattern to watch for.

**If a genuine overflow does happen, cut rather than squeeze.** Reducing `\vspace` or geometry scale to force-fit content makes the resume look cramped — but reaching for that fix (or for omitting a section) before compiling at all is the more common mistake.

## Relevance-weighted cutting (the right way to shrink a CV)

**Cut by signal, not by section.** Static priority lists ("remove oldest education first, then shorten the earliest role...") are wrong when a relevant "lower-priority" item is competing with an irrelevant "higher-priority" item. An older-role bullet that speaks directly to the posting is worth more than a recent-role bullet that does not.

For every candidate line, score three things:

1. **Relevance to THIS posting** — does the line hit a named tool, keyword, or stated responsibility in the job ad?
2. **Uniqueness** — is it the only place this claim appears, or is it duplicated elsewhere in the CV?
3. **Narrative load** — does the cover letter depend on it? If cutting the line would force you to rewrite a cover-letter paragraph, it is load-bearing.

Cut the lowest-total-score line first, regardless of which section it sits in.

### Practical order of cuts (easiest → last resort)

1. **Redundancy.** If an achievement appears in both Core Competencies AND a role bullet, the Core Competencies version is usually the cleaner cut (the experience bullet is more concrete evidence).
2. **Profile-statement fluff.** A sentence that just restates what Publications or Skills will show. ("Peer-reviewed publications on X..." is already a Publications entry — profile can claim it once and stop.)
3. **Low-relevance experience bullets.** A bullet about work that does not touch posting keywords, wherever it sits. This cuts across sections before touching the structural list.
4. **Low-relevance supporting content.** An older-role bullet that does not speak to the target role. A certification that does not touch the posting's stack. A language entry that can be condensed to one line.
5. **Low-relevance publications.** Keep 1-2 publications that best match the posting. Cut the rest before touching experience bullets.
6. **Last-resort structural cuts.** Oldest education entry, tightening an older role to 2 bullets, collapsing Certifications into a single line. These only happen if the relevance-weighted cuts above have already been exhausted.

### Pitfalls to avoid

- Do not mechanically cut from the bottom of a static section list without checking relevance. "Cut the oldest role first" is wrong if that role is literally about the skill the posting asks for.
- Do not cut the one concrete example the cover letter leans on. Relevance is measured against the cover letter you wrote, not just the job posting — interviewers will have read both.
- Do not cut to fit if the fit is borderline (e.g. spilling a few lines past 1 page). Prefer `\enlargethispage{2-3\baselineskip}` on a late section for near-misses; reserve content cuts for genuine overflow (a substantial second page, not a trailing line or two).

## Recommended Section Order

**This section describes the prior moderncv section order.** Under the active `ats-resume` template (see ACTIVE-TEMPLATE block above), the order is fixed by `cv/main_example.tex` (Profile Statement, Core Competencies, Work Experience, [International Research and Training, if applicable], Education, Publications & Awards) and does **not** include a Languages section or a References section at this length — see "Page Budget - Hard 1-Page Limit" above. The role-type variation below is retained for context on why Education vs. Work Experience ordering differs by role type, but Languages/References are omitted from both regardless of role type now.

The section order varies by role type:

**For technical / data science / ML roles:**
1. Profile statement / elevator pitch
2. Core competencies / Skills
3. Work Experience (reverse chronological)
4. Education (reverse chronological)
5. Publications & Awards

**For domain-specific / specialist roles:**
1. Profile statement / elevator pitch
2. Core competencies / Skills
3. Education (reverse chronological) - credentials are a key qualifier
4. Work Experience (reverse chronological)
5. Publications & Awards
