---
name: job-application-assistant
description: >
  Assists with job applications: evaluating job postings, tailoring CVs, writing cover letters,
  and preparing for interviews. Triggers on keywords like: job posting, job application, CV,
  cover letter, resume, interview prep, job fit, career, application, apply, ansøgning, stilling
allowed-tools: Read, Glob, Grep, WebFetch, WebSearch, Edit, Write, Bash, AskUserQuestion
---

# Job Application Assistant

---

## Workflow

When the user provides a job posting (URL, pasted text, or a local file), follow this workflow:

### Step 0: Detect Input Type

- **URL** → single posting, proceed to Step 1 (fetch with WebFetch).
- **Pasted text** → single posting, proceed to Step 1.
- **Local file path** (`.docx`, `.txt`, `.pdf`, etc.) → the file may hold **one or several** postings pasted in from job boards (e.g. copied LinkedIn listings). Treat this as a standing intake file: the user may reuse the same path across sessions, replacing its contents with a fresh batch each time, so always re-extract and re-triage from scratch rather than assuming prior results still apply.
  1. **Extract text.**
     - `.docx`: no native reader — use Bash with Python's `python-docx` (`import docx; docx.Document(path)`, then join non-empty `paragraph.text` values). Wrap stdout in a UTF-8 `TextIOWrapper` (or write to a file and Read it back) — raw `print` on Windows defaults to `cp1252` and crashes on em-dashes, curly quotes, `≤`, checkmarks, etc. that are common in pasted job ads.
     - `.pdf`, `.txt`, `.md`: use the Read tool directly.
  2. **Split into individual postings.** Postings copied from job boards typically repeat a marker line like "About the job" right before each new listing — use that (or an unambiguous title/company header change) as the boundary. No repeated marker means the file is a single posting.
  3. **Identify each posting's company, role, location, salary, and requirements text.** The company name is often buried mid-paragraph rather than in a header (e.g. a sentence naming the employer, or a distinctive phrase that only one company uses) — read enough of the body to find it. If it genuinely cannot be determined, say so explicitly rather than guessing, and ask the user.
  4. **Check for overlap with existing applications.** Cross-reference each extracted posting's company (and role, if similar) against `job_search_tracker.csv`. Flag likely duplicates or near-duplicates of an already-tracked application (same company, same or very similar role/team) instead of silently treating them as new — the user decides whether it's the same opportunity.
  5. **Triage before deep-evaluating.** Score every extracted posting with a lightweight pass — posting text plus the `04-job-evaluation.md` framework only, no company research — and present one ranked table (score, verdict, title, company, location PASS/FAIL, one-line strength, one-line gap), same shape as `/rank`'s shortlist output. Apply the same location-veto and honesty rules as `/rank`: a deal-breaker location excludes a posting from ranking regardless of score, and gaps are stated plainly, never smoothed over.
  6. **Hand off selectively.** Ask which posting(s) the user wants to pursue. Only for the ones chosen does the full Step 1 (with company research) through Step 4 workflow below actually run — triage scores never substitute for it.

### Step 1: Research & Evaluate Fit
- Fetch the job posting content (use WebFetch for URLs)
- Analyze the posting for required competencies, keywords, and priorities
- Research the company (website, LinkedIn, mission, recent news)
- Score the posting against the candidate's profile using the framework in `04-job-evaluation.md`
- Present the evaluation table and verdict
- Suggest whether the candidate should call the employer before applying (see `04-job-evaluation.md` for guidance)
- Ask the user if they want to proceed with an application

### Step 2: Tailor CV
- Read the most relevant existing CV variant from `cv/` as a starting point
- Follow the guidelines in `05-cv-templates.md`
- Create `cv/main_<company>.tex` with tailored content
- Adjust: profile statement, skills section, experience bullet emphasis, section order

### Step 3: Write Cover Letter
- Follow the writing style rules in `03-writing-style.md` (critical: no em-dashes, no cliches)
- Follow the template structure in `06-cover-letter-templates.md`
- Create `cover_letters/cover_<company>_<role>.tex`
- Ensure the letter connects specific experience to the role requirements
- Also generate a per-posting reference sheet (4-5 references selected by tag match, not the full pool) — follow `08-reference-sheet-templates.md`

### Step 4: Interview Preparation
- Follow the framework in `07-interview-prep.md`
- Prepare STAR-format answers for likely questions
- Identify role-specific talking points
- Draft questions the candidate should ask the interviewer

---

## Reference Files

| File | Purpose |
|------|---------|
| `01-candidate-profile.md` | Education, experience, skills, publications, awards |
| `02-behavioral-profile.md` | Behavioral assessment, strengths, ideal environments |
| `03-writing-style.md` | Tone, structure, do's and don'ts |
| `04-job-evaluation.md` | Scoring framework for job fit |
| `05-cv-templates.md` | LaTeX CV structure and tailoring rules |
| `06-cover-letter-templates.md` | LaTeX cover letter structure and tailoring rules |
| `07-interview-prep.md` | STAR examples, tough questions, roleplay guidelines |
| `08-reference-sheet-templates.md` | Reference pool tag taxonomy, per-posting reference selection, LaTeX template |

---

## Quick Commands

The user may also ask for individual steps without the full workflow:
- "Evaluate this job posting" - Step 1 only
- "Write a CV for [company]" - Step 2 only
- "Write a cover letter for [role] at [company]" - Step 3 only
- "Help me prepare for an interview at [company]" - Step 4 only
- "What jobs should I look for?" - Career strategy discussion using profile + evaluation framework
