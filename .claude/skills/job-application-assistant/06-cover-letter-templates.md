# Cover Letter Templates and Tailoring Guide

## Template: Custom cover.cls (XeLaTeX)

Cover letters use a custom LaTeX document class (`cover.cls`) with Lato/Raleway fonts.

**Output file:** `applications/<Company>_<RoleSlug or JobID>/[YOUR_NAME]_CoverLetter_<Company>_<id or slug>.tex` (see `.claude/commands/apply.md` for the folder/naming convention)
**Compile with:** XeLaTeX (cover.cls requires fontspec)
**Font directory:** `cover_letters/OpenFonts/fonts/` (shared resource — see the compile command below for how the per-application file, two directories away, still finds it)

### Compile command

Cover letters now live in `applications/<Company>_<RoleSlugOrJobID>/`, not next to `cover.cls`. `cover.cls` hardcodes `Path = OpenFonts/fonts/...` throughout as plain filesystem paths relative to the compiling process's **working directory** (not resolved via kpathsea/TEXINPUTS, and not relative to the `.tex` file's own location — confirmed by testing). So the fix is to keep `cover_letters/` as the working directory and redirect output with `-output-directory`, rather than pointing TEXINPUTS at the class file:

```bash
cd cover_letters
xelatex -interaction=nonstopmode -output-directory="$(pwd)/../applications/<Company>_<RoleSlugOrJobID>" "../applications/<Company>_<RoleSlugOrJobID>/[YOUR_NAME]_CoverLetter_<Company>_<id or slug>.tex"
```

(PowerShell — use an absolute path for `-output-directory`; a bare relative `../applications/...` value was observed to fail to resolve:
```powershell
cd cover_letters
$outDir = (Resolve-Path "..\applications\<Company>_<RoleSlugOrJobID>").Path
& xelatex -interaction=nonstopmode "-output-directory=$outDir" "../applications/<Company>_<RoleSlugOrJobID>/[YOUR_NAME]_CoverLetter_<Company>_<id or slug>.tex"
```)

Expected output: `Output written on ...[YOUR_NAME]_CoverLetter_<Company>_<id or slug>.pdf (1 page)`. Any page count other than 1 is a failure that must be fixed before presenting to the user.

**Do not modify the `\fontspec[Path = ...]` lines** in the cover letter `.tex` file (including the bullet-list font block below) — they stay exactly as written in this template. The working-directory trick above is what makes the unmodified relative paths resolve correctly.

**Raleway has no italic font file, and bold/italic must be declared explicitly, not just requested with `FakeSlant`.** The bundled `OpenFonts/fonts/raleway/` directory only ships upright weights (Bold, ExtraBold, ExtraLight, Heavy, Light, Medium, Regular, SemiBold, Thin); there is no `Raleway-Italic`. A bare `\fontspec[Path=...]{Raleway-Medium}` declares only the upright shape — `\textit{}` and `\textbf{}` then have no shape to switch to and silently render as plain upright Medium (confirmed via `LaTeX Font Warning: Font shape .../m/it undefined` / `.../b/n undefined` in the compile log). Adding a top-level `FakeSlant` key alone does **not** fix this — `FakeSlant` only synthesizes a slant for a shape that's explicitly declared via `ItalicFont=`/`ItalicFeatures=`; it does nothing on its own. A first fix attempt that added only bare `FakeSlant=0.2` was confirmed (via the `LaTeX Font Warning` in the compile log) to still produce no visible slant.

The correct, complete font declaration — real bold from the bundled `Raleway-Bold.otf`, synthetic italic (and bold-italic) via `FakeSlant` since no true italic file exists:
```latex
\fontspec[
  Path = OpenFonts/fonts/raleway/,
  BoldFont = Raleway-Bold,
  ItalicFont = Raleway-Medium,
  ItalicFeatures = {FakeSlant=0.2},
  BoldItalicFont = Raleway-Bold,
  BoldItalicFeatures = {FakeSlant=0.2}
]{Raleway-Medium}
```
`\lettercontent{}` in `cover.cls` already carries this full declaration. Any inline `\fontspec[Path = OpenFonts/fonts/raleway/]{Raleway-Medium}` block outside `\lettercontent{}` (i.e. the bullet-list font wrapper below, where `\textbf{}` labels and `\textit{}` species names both appear) must carry the same full set of keys, or bold/italic inside bullets will silently fail to render.

## Compile-and-Inspect Loop (MANDATORY)

After writing the cover letter and before presenting to the user, always compile and visually inspect the PDF. Iterate until the layout is clean:

1. Run the compile command from the "Compile command" section above (working directory `cover_letters/`, output redirected via `-output-directory`)
2. Confirm page count is exactly 1 and compile succeeded
3. Read the PDF via the Read tool and visually check: signature fits at the bottom, no text cut off, bullet font matches body

### Known template pitfall: itemize inside `\lettercontent{}`

The `\lettercontent{}` macro appends `\\` to its argument. This breaks when the argument ends in `\end{itemize}` because `\\` has no line to break after the environment closes, producing `! LaTeX Error: There's no line here to end.` and no PDF output.

**Wrong (breaks compile):**
```latex
\lettercontent{Here is how my experience maps:
\begin{itemize}
    \item ...
\end{itemize}}
```

**Correct — close `\lettercontent{}` before the list and wrap the list in the matching Raleway-Medium font so typography stays consistent:**
```latex
\lettercontent{Here is how my experience maps:}

{\raggedright\fontspec[Path = OpenFonts/fonts/raleway/, BoldFont = Raleway-Bold, ItalicFont = Raleway-Medium, ItalicFeatures = {FakeSlant=0.2}, BoldItalicFont = Raleway-Bold, BoldItalicFeatures = {FakeSlant=0.2}]{Raleway-Medium}\fontsize{11pt}{13pt}\selectfont
\begin{itemize}
    \item ...
\end{itemize}\par}
\vspace{6pt}

\lettercontent{[next paragraph]}
```

The font wrapper is mandatory — if you just move `\begin{itemize}` outside `\lettercontent{}` without the `\fontspec` block, bullets render in the default body font (Lato) and visually mismatch the rest of the letter. Leave the `Path` exactly as `OpenFonts/fonts/raleway/` even though the file lives in `applications/<Company>_<RoleSlugOrJobID>/` — see "Compile command" above for why (compile with `cover_letters/` as the working directory, not the file's own location).

## Document Structure

```latex
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% Cover Letter - [Company], [Role]
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

\documentclass[]{cover}
\usepackage{fancyhdr}

\pagestyle{fancy}
\fancyhf{}

\rfoot{Page \thepage \hspace{0pt}}
\thispagestyle{empty}
\renewcommand{\headrulewidth}{0pt}
\begin{document}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%     TITLE NAME
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\namesection{}{\Huge{[YOUR_NAME]}}{  \href{mailto:[YOUR_EMAIL]}{[YOUR_EMAIL]} | [YOUR_PHONE] |  \urlstyle{same}\href{[YOUR_LINKEDIN_URL]}{LinkedIn}
}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%     MAIN COVER LETTER CONTENT
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

\currentdate{\today}
\lettercontent{Dear [Name/Team],}

\lettercontent{[Opening paragraph - role, connection to background, 2-3 sentences]}

\lettercontent{[Body paragraph - most relevant experience, then bullet list]

\begin{itemize}
    \item [Concrete achievement/skill 1]
    \item [Concrete achievement/skill 2]
    \item [Concrete achievement/skill 3]
\end{itemize}

[Connection to company - why this role, why this company specifically]}

\lettercontent{[Personal fit paragraph - behavioral strengths, team contribution, 2-3 sentences]}

\lettercontent{I look forward to hearing from you.}

\begin{flushright}
% No trailing \\ inside \closing{} - cover.cls appends its own \\, and a
% doubled break triggers "! LaTeX Error: There's no line here to end."
\closing{Kind regards,}

\signature{[YOUR_NAME]}
\end{flushright}
\end{document}
```

## Key Commands Reference

| Command | Purpose |
|---------|---------|
| `\namesection{}{Name}{contact info}` | Header with name and contact |
| `\currentdate{date}` | Date field (use `\today` or explicit date) |
| `\lettercontent{text}` | Body paragraph (adds spacing after) |
| `\closing{text}` | Closing line |
| `\signature{name}` | Printed name below signature |

## Tailoring Guidelines

### Salutation
- If you know the hiring manager's name: "Dear [First Last],"
- If you know the team: "Dear [Company] hiring team,"
- Generic: "Dear [Company]," (avoid "To whom it may concern")

### Target Job Title (standing rule, ATS)
The opening paragraph must state the **exact job title as written in the posting**, pulled verbatim from the posting text captured in `/apply` Step 0 (e.g. "I am writing to apply for the **Postdoctoral Research Associate** position..."). This is an ATS keyword-matching requirement — title matching is often literal, and cover letters that paraphrase the role ("this research position," "the opening on your team") instead of naming it exactly score worse. Frame it as the role being applied for, never as though the title is already held. This applies automatically on every `/apply` run.

### Length - Hard 1-Page Limit
- Target: 1 page including signature block
- Maximum: **never exceed 1 page**
- **Word budget: 250-300 words** of body text (not counting LaTeX markup). This is the safe maximum. 350 words will overflow.
- **Always count**: opening paragraph + bullet list paragraph + closing paragraph = 3 blocks. Add a 4th only if the others are short.
- When adding company-specific content, trim other content to compensate rather than adding net length

### Line Spacing
- Add `\usepackage{setspace}` and `\setstretch{1.0}` if the letter is long and needs to fit on one page
- Use `\vspace{.5cm}` between major sections for readability (only if space permits)

### Bullet Lists
- Place `\begin{itemize}...\end{itemize}` **outside** a `\lettercontent{}` block (see "Known template pitfall" above), wrapped in the matching Raleway-Medium `\fontspec` so the bullet font matches the body
- 3-5 bullets is ideal
- Start each bullet with bold label or action verb
- Use `\textbf{Label:}` for category-style bullets

### LaTeX Special Characters
- Underscore: `\_`
- Ampersand: `\&`

### Scientific Notation (Life Sciences / Biomedical Roles)
Apply automatically whenever the cover letter references organisms or genes:
- **Genus/species:** italicize with `\textit{}`, e.g. `\textit{Plasmodium vivax}`.
- **Abbreviation after first mention:** the first full mention in the document is spelled out in full; every subsequent mention abbreviates the genus to its initial and keeps italicizing, e.g. `\textit{Plasmodium vivax}` -> `\textit{P. vivax}`. Track this per document (a genus mentioned in the CV and again in the cover letter is a fresh "first mention" in each file).
- **Gene names:** italicize, e.g. `\textit{DBP1}`, `\textit{EBP/DBP2}`.
- **Protein names:** do NOT italicize — standard convention distinguishes the italic gene from the roman-text protein it encodes.

### Non-English Cover Letters
- Same template structure, just write content in the posting's language
- Adjust date format to local convention
- Adjust closing to local convention (e.g. "Med venlig hilsen," for Danish)

## Checklist Before Finalizing
- [ ] No em-dashes (use commas or periods instead)
- [ ] No cliches or empty filler
- [ ] Every claim backed by specific example
- [ ] Forward-looking framing: focuses on tasks you'll solve, not just past duties
- [ ] Motivation section references this specific company's mission/values
- [ ] Company name and role are correct throughout
- [ ] Date is current
- [ ] Fits on one page
- [ ] Language matches the job posting language
- [ ] Salutation is appropriate (named person if possible)
- [ ] Headline is engaging and specific, not generic

## Submission Guidelines (Best Practice)
- Submit only the documents the employer requests
- Export as PDF to preserve formatting
- Name files clearly: "[Your Name] CV" and "[Your Name] Cover Letter"
- Follow all employer instructions regarding anonymity or specific materials
