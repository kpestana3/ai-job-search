# Reference Sheet Templates and Selection Logic

## Purpose

Every application gets a standalone reference sheet listing **4-5 references selected for that specific posting**, not the same names every time and never the full pool. The full, permanent reference pool (with theme tags) lives in `01-candidate-profile.md`'s References section — this document is only about picking a subset and rendering it.

**Why 4-5, not a tight 2-3:** the candidate's PhD/undergraduate research advisor, Dr. Eugenia Lo, is deliberately excluded from the reference pool for personal reasons (see the memory note on this — do not raise it unprompted). For academic-track applications especially, a search committee would normally expect to hear from the primary research advisor; her absence is a real, known gap. Rather than narrow the reference sheet to the 2-3 tightest keyword matches (which would make that gap more conspicuous by presenting a thin, laser-focused list), default to a broader 4-5 so the reader has enough context to judge for themselves who's most relevant — breadth compensates for the missing advisor reference. This applies to both academic and industry applications. If a posting explicitly specifies a different count (e.g. "provide two references"), that's a case-by-case call with the user — see `.claude/commands/apply.md` Step 2 for how that tension gets flagged rather than silently resolved either way.

## Template: Custom cover.cls (XeLaTeX)

The reference sheet reuses `cover.cls` (same Lato/Raleway branding as the CV and cover letter) so all three documents in an application packet look consistent.

**Master reference template:** `cover_letters/reference_sheet_example.tex`
**Output file:** `applications/<Company>_<RoleSlugOrJobID>/[YOUR_NAME]_References_<Company>_<id or slug>.tex`
**Compile with:** XeLaTeX — identical working-directory/`-output-directory` pattern as the cover letter (see `06-cover-letter-templates.md`'s "Compile command" section; the same `cover.cls`/`OpenFonts/` path resolution applies here since this template also lives conceptually in `cover_letters/`):

```bash
cd cover_letters
xelatex -interaction=nonstopmode -output-directory="$(pwd)/../applications/<Company>_<RoleSlugOrJobID>" "../applications/<Company>_<RoleSlugOrJobID>/[YOUR_NAME]_References_<Company>_<id or slug>.tex"
```

Expected output: `Output written on ...[YOUR_NAME]_References_<Company>_<id or slug>.pdf (1 page)`.

**Known pitfall (applies here too):** if any bullet's description text is placed directly on the next line after a `\\` line break, and that text starts with `[`, XeLaTeX parses `\\[` as the optional-argument form of `\\` (extra vertical space) and throws `Missing number, treated as zero.` / `Illegal unit of measure (pt inserted)`. The template already escapes this with `\\{}` before each description line — preserve that `{}` when filling in real content, especially if a description happens to start with a bracket or parenthesis.

## Document Structure

```latex
\documentclass[]{cover}
\usepackage{fancyhdr}
\pagestyle{fancy}
\fancyhf{}
\rfoot{Page \thepage \hspace{0pt}}
\thispagestyle{empty}
\renewcommand{\headrulewidth}{0pt}
\begin{document}

\namesection{}{\Huge{[YOUR NAME]}}{  \href{mailto:your.email@example.com}{your.email@example.com} | [+XX XXXXXXXXXX] |  \urlstyle{same}\href{https://www.linkedin.com/in/yourprofile}{LinkedIn}
}

\currentdate{\today}
\lettercontent{References -- [Role] at [Company]}

{\raggedright\fontspec[Path = OpenFonts/fonts/raleway/, BoldFont = Raleway-Bold, ItalicFont = Raleway-Medium, ItalicFeatures = {FakeSlant=0.2}, BoldItalicFont = Raleway-Bold, BoldItalicFeatures = {FakeSlant=0.2}]{Raleway-Medium}\fontsize{11pt}{14pt}\selectfont
\begin{itemize}
    \item \textbf{[Name]}, [Title, Institution] -- \href{mailto:[email]}{[email]}, [phone] \\{}
    [One line: what this reference can specifically speak to, tailored to this posting]
    \item \textbf{[Name]}, [Title, Institution] -- \href{mailto:[email]}{[email]}, [phone] \\{}
    [One line, same pattern]
    \item \textbf{[Name]}, [Title, Institution] -- \href{mailto:[email]}{[email]}, [phone] \\{}
    [Continue for 4-5 total entries -- see "Score and select" below]
\end{itemize}\par}

\end{document}
```

4-5 is the target, not a hard cap and not a hard floor — if only 3 references have any real tag overlap with the posting, ship 3 rather than padding with a zero-overlap name. But do not default to a tight 2-3 the way a purely keyword-optimized selection would; breadth is a deliberate choice here, not a fallback (see "Why 4-5" above).

## Selection Logic

### 1. Reuse the posting's extracted themes — don't re-scan

`/apply` Step 1 already extracts the posting's required/preferred skills and priorities for the job-fit evaluation (`04-job-evaluation.md`'s Technical Skills Match dimension) and Step 5d reuses that same list for CV keyword verification. Reference selection reuses it a third time — do not re-derive it from the posting text.

### 2. Map posting themes to the canonical tag taxonomy

`01-candidate-profile.md`'s References section defines the fixed tag taxonomy (Mentorship & Trainee Development, Teaching & Instruction, Technical/Bench Skills Training, Quantitative & Computational Analysis, Cross-Functional/Cross-Disciplinary Collaboration, Field Research & Cross-Cultural Adaptability, Scientific Writing & Communication, Character & Professionalism, Leadership & Team/Program Management, Grant Writing & Funding). Map the posting's extracted themes onto these tags semantically — e.g. "trains junior scientists" -> Mentorship & Trainee Development; "biostatistics" or "custom analysis pipelines" -> Quantitative & Computational Analysis; "multi-country program" or "field deployment" -> Field Research & Cross-Cultural Adaptability. Do not invent new tags on the fly — if nothing fits, that's a signal for step 4 below, not a reason to stretch a tag's meaning.

### 3. Score and select

For each reference in the pool, count how many of the posting's mapped themes their tags cover, weighted toward themes that are **required** (not just "nice to have") in the posting. Rank the full pool by score and select the top 4-5 — since the pool currently has only 7 people total, this usually means including everyone with any real relevance and leaving out only the one or two names with the weakest tie to the posting, rather than aggressively cutting down to a "top 2-3" shortlist.

- Order entries on the sheet by score (strongest match first), not alphabetically or by pool order.
- Selection must still vary by posting — even at 4-5 out of 7, which names get cut should track the posting's actual emphasis, not habit. If the same person gets cut every time regardless of posting content, that's worth double-checking.
- Do not include a reference with truly zero tag overlap just to hit 5 — 4 (or fewer, per the "not a hard floor" rule above) is fine if the fifth name would be a stretch.

### 4. Flag uncovered emphasis — do not force a weak match

Even with a broader 4-5 selection, if the posting strongly emphasizes a theme no reference's tags cover well (see the two flagged gaps in `01-candidate-profile.md`: Leadership & Team/Program Management, Grant Writing & Funding), do **not** select a loosely-related reference to paper over it — breadth is about giving the reader more context among genuinely relevant people, not about disguising a real gap. Surface it plainly in the Step 6 report to the user instead, e.g.:

> "This posting emphasizes grant-writing experience, which no current reference is tagged to cover — the reference sheet includes the four strongest matches instead (W, X, Y, Z). Let me know if you have someone who could speak to this."

### 5. Academic CV consistency

When an academic CV is also generated for the application, its built-in References section (see `05-cv-templates.md`'s Academic CV Section Order) uses the **same selected subset** as the standalone reference sheet — not the full 7-person pool. This keeps the two documents in one application packet consistent. The master template `cv/academic_cv_template.tex` itself keeps the full pool (it's the reference source, read fresh each `/apply` run, not a per-application output).

### 6. Consent

Only select references who are already confirmed and (where noted in `01-candidate-profile.md`) aware they're listed. Never select from the "Pending" list in memory (references awaiting contact info or confirmation).
