# CV Templates and Tailoring Guide

<!-- SETUP: Profile statements and section ordering are personalized by running /setup -->

## Document Type Decision: Industry Resume vs. Academic CV

Two CV formats are available. Decide which (or both) to generate before drafting anything.

| Format | Output file | Master reference | Length |
|--------|-------------|-------------------|--------|
| Industry resume | `applications/<Company>_<RoleSlug or JobID>/[YOUR_NAME]_CV_<Company>_<id or slug>.tex` | `cv/main_example.tex` | Hard 2-page limit; content is cut per posting (see "Relevance-weighted cutting" below) |
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
- References: list the candidate's actual named references with contact info directly in the document (standard academic convention), not "available upon request" (standard industry-resume convention). Only include references the candidate has explicitly confirmed — do not add a research advisor or other unconfirmed name just because it fits the academic framing. **Use the same 4-5 references selected for this posting's standalone reference sheet** (see `08-reference-sheet-templates.md`'s selection logic) — not the full pool. `cv/academic_cv_template.tex` itself keeps the full pool as the reference source; only per-application copies narrow it down.

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
12. References

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
- **Genus/species:** italicize with `\textit{}`, e.g. `\textit{Plasmodium vivax}`.
- **Abbreviation after first mention:** the first full mention in the document is spelled out in full; every subsequent mention abbreviates the genus to its initial and keeps italicizing, e.g. `\textit{Plasmodium vivax}` -> `\textit{P. vivax}`. Track this per document — a genus introduced in the profile statement stays abbreviated for the rest of that same file.
- **Gene names:** italicize, e.g. `\textit{DBP1}`, `\textit{EBP/DBP2}`.
- **Protein names:** do NOT italicize — standard convention distinguishes the italic gene from the roman-text protein it encodes.
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

## Compile-and-Inspect Loop (MANDATORY)

After writing the CV and before presenting to the user, always compile and visually inspect the PDF. Iterate until the layout is clean. Workflow:

1. Run `lualatex -interaction=nonstopmode main_<company>.tex`
2. Check the output page count: must be exactly 2
3. Read the PDF via the Read tool and visually inspect both pages
4. Check for **orphaned entries**: a `\cventry` title line must never sit alone at the bottom of page 1 with its bullets on page 2

### Fixing common page-break problems

**Problem: entry title on page 1, bullets orphaned to page 2**
Add `\needspace{5\baselineskip}` immediately before the problematic `\cventry`:
```latex
\needspace{5\baselineskip}
\item{\cventry{YEAR--YEAR}{Role Title}{Organization}{Location}{}{...}}
```
Include `\usepackage{needspace}` in the preamble.

**Problem: one trailing section spills to page 3 (e.g., References alone on page 3)**
Add `\enlargethispage{2-3\baselineskip}` before a late section (e.g., before `\section{Honors and Awards}`) to stretch page 2 by a few lines. This is the standard LaTeX rescue for near-miss overflows.

**Problem: 3 pages with significant content on page 3**
Cut content — do not compress geometry or `\vspace`. See "Relevance-weighted cutting" below for the rule.

**Problem: content finishes early on page 2 (feels thin)**
Restore the highest-relevance item that was previously cut — a CV that ends mid-page 2 looks incomplete.

## ATS Parseability

Most employers run CVs through an ATS before a human sees them, and the ATS reads the PDF's embedded **text layer**, not the rendered page. A CV can pass visual inspection and still extract as garbage. After the layout passes the compile-and-inspect loop, verify the text layer:

```bash
cd cv && pdftotext -layout main_<company>.pdf main_<company>.txt
```

`pdftotext` comes from [poppler](https://poppler.freedesktop.org/), not the TeX distribution - it is an **optional** dependency. If it is not installed, skip the mechanical check with a warning and rely on the visual PDF read for keyword coverage.

What to check in the extraction:

- **Contact details as literal text.** The stock template's fontawesome contact icons extract as glyph names (`MOBILE-ALT`, `Envelope`) - harmless noise, because the actual address and number are printed beside them. The failure mode is a contact detail carried *only* by an icon or a hyperlink (like the `LinkedIn` link text, whose URL is not in the text layer): invisible to an ATS. The email address must always appear as printed text.
- **No garbled output.** `(cid:NNN)` markers or `�` characters mean a font is embedded without a Unicode mapping - an ATS sees the same garbage. This shows up with unusual fonts in custom templates, not with the stock moderncv setup under lualatex.
- **Reading order.** The stock banking style is single-column, so extraction order matches visual order. Custom templates (via `/add-template`) with sidebars or multi-column layouts can interleave unrelated lines; if extraction order is scrambled, the user is trading ATS compatibility for looks and should be told.
- **Keyword coverage.** Match the posting's required/preferred terms against the extracted text, in the posting's language. Prefer the posting's exact term over a synonym when it is truthfully applicable - ATS matching is often literal. Never add a keyword the profile does not support.

## Page Budget - Hard 2-Page Limit

The CV **must** fit on exactly 2 pages when compiled. Use these content limits as a guide:

| Section | Max budget |
|---------|-----------|
| Profile statement | 3-4 lines |
| Skills | 5 items, each 1-2 lines |
| Most recent role | 4-5 bullets |
| Previous role | 2-3 bullets |
| Older roles | 2 bullets (1 line each) |
| Education | 2-3 entries |
| Publications | 2-3 entries |
| Awards | 3 entries, single line each |
| References | "Available upon request." (single line) |

**If in doubt, cut rather than squeeze.** Reducing `\vspace` or geometry scale to force-fit content makes the CV look cramped.

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
- Do not cut to fit if the fit is borderline (2.02 pages). Prefer `\enlargethispage{2-3\baselineskip}` on a late section for near-misses; reserve content cuts for genuine overflow (content on page 3 that is more than a single trailing section).

## Recommended Section Order

The section order varies by role type:

**For technical / data science / ML roles:**
1. Profile statement / elevator pitch
2. Core competencies / Skills
3. Work Experience (reverse chronological)
4. Education (reverse chronological)
5. Languages
6. Publications & Awards
7. References

**For domain-specific / specialist roles:**
1. Profile statement / elevator pitch
2. Core competencies / Skills
3. Education (reverse chronological) - credentials are a key qualifier
4. Work Experience (reverse chronological)
5. Publications & Awards
6. References
