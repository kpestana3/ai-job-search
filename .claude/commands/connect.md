# /connect - Draft and Log a LinkedIn Connection Request

You are drafting a LinkedIn connection-request note for a new contact and logging the outcome to `networking_tracker.csv`. This is the repeatable version of the manual "draft a note for X, then log it" workflow used throughout a networking campaign - same templates, same tracker schema, now in one command.

Follow these steps **in order**.

---

## Step 0: Parse Input

`$ARGUMENTS` should contain a name, title/role, and company - e.g. `/connect Jane Doe, Senior Recruiter at Acme Pharma` or three separate contacts pasted in one message for a rapid-fire batch. If any of name/title/company is missing for a contact, ask before drafting rather than guessing.

Multiple contacts in one invocation are expected and normal (networking campaigns frequently come in batches of 2-5) - process each one through Steps 1-3, then present all drafts together in Step 4.

---

## Step 1: Classify the Contact

For each contact, determine which category it falls into - this decides which template applies:

1. **External/agency recruiter** - works at a staffing/search firm (placement across many client companies), title contains "Recruiter," "Talent Acquisition" *at a staffing agency*, "Recruiting," etc. Check the company name against known staffing/search firms already in `networking_tracker.csv` if the type is ambiguous.
2. **Internal talent acquisition** - "Talent Acquisition," "Recruiter," or similar title, but the company is a real employer (not a staffing firm) - e.g. a named target company from `CLAUDE.md`.
3. **Peer/bench scientist** (or peer practitioner in the candidate's field) - title indicates a working role in the candidate's own domain, not recruiting. Not a recruiter or TA contact at all.
4. **Other/genuine specific connection** - doesn't fit the above (e.g. a language-services manager, someone reacting to a specific post, an executive-search contact who may only place C-suite). Flag this to the user and ask what should be referenced, rather than forcing a template.

For executive-search-titled contacts specifically, flag before drafting: these often only place senior/leadership candidates - note the caveat but still draft if the user wants to proceed.

---

## Step 2: Check for a Genuine Connection Point

Before defaulting to a generic template, check for real overlap - **never fabricate enthusiasm or a connection that doesn't exist**. Check saved memory for any standing feedback the user has already given about this (e.g. a dislike of manufactured company enthusiasm) before drafting.

- **Niche specialty match**: does the contact's title name a specialty that genuinely overlaps the candidate's core skills? If so, the note can reference that specialty directly.
- **Named target company**: is the company explicitly listed in `CLAUDE.md`'s Target Sectors section? If so, internal TA/peer-scientist notes can reference genuine interest in the company. If the company is *not* on that list, do not invent company-specific enthusiasm - use the general template even for internal TA contacts. Genuine domain relevance is fine to note; fabricated excitement about a specific employer is not.
- **Peer scientist/practitioner overlap**: does their role description share concrete technical ground with the candidate's actual skills? Reference the specific overlap, and frame their role as aspirational where genuinely true, not generic flattery.

---

## Step 3: Draft the Note

Write a connection note under 300 characters (LinkedIn's connection-note limit) for each contact, following the established templates. Fill `[YOUR_DEGREE/BACKGROUND]` and `[YOUR_TARGET_DOMAIN]` from the candidate's actual profile (`CLAUDE.md`) - never leave the bracket literal in a sent note.

**Standard external-recruiter template** (no niche specialty):
> Hi {Name}, I recently completed [YOUR_DEGREE/BACKGROUND] and I'm building out my network with recruiters in the [YOUR_TARGET_DOMAIN] space. Would love to connect.

**Niche-specialty template** (genuine overlap exists):
> Hi {Name}, I recently completed [YOUR_DEGREE/BACKGROUND] [+ specific overlap detail]. Your focus on {specialty} caught my eye. Would love to connect.

**Internal TA, named target company:**
> Hi {Name}, I recently completed [YOUR_DEGREE/BACKGROUND]. [Genuine, specific reason tied to the company - verified fact only]. Would love to connect.

**Internal TA, company not on target list:**
> Hi {Name}, I recently completed [YOUR_DEGREE/BACKGROUND] and I'm building out my network in the [YOUR_TARGET_DOMAIN] space. Would love to connect.

**Peer/bench scientist (or peer practitioner):**
> Hi {Name}, I recently completed [YOUR_DEGREE/BACKGROUND], with hands-on {specific skill} experience. Your work in {their specialty} is exactly the kind of role I'm working toward. Would love to connect.

Apply the writing-style rules in `.claude/skills/job-application-assistant/03-writing-style.md` (no em-dashes, no cliches, plain conversational phrasing, hedge anything unconfirmed) plus any standing feedback saved in memory about the user's preferred tone. Report the exact character count for each draft.

---

## Step 4: Present and Confirm

Show all drafted notes together (numbered if a batch), with character counts and a one-line note on which template/classification was used and why. Let the user edit, approve, or drop any before proceeding - never log a note that hasn't been shown to the user.

---

## Step 5: Log to the Tracker

**Only after the user confirms a note was actually sent** (e.g. "sent," "log it," "log all") - never log preemptively.

Read `networking_tracker.csv` (header: `date,company,contact_name,contact_title,channel,status,notes,` - note the trailing empty column, preserve it). Create the file with that header if it doesn't exist yet. Append one row per confirmed contact:

```
YYYY-MM-DD,{Company},{Contact Name},{Contact Title},LinkedIn,sent,"{classification: external/agency recruiter | internal TA | peer scientist | other}. {One line on which template was used and why - niche match, named target company, general template, etc.}",
```

Never rewrite, reorder, or delete existing rows - append only, matching how every other entry in this file has been logged.

---

## Step 6: Confirm

Summarize what was logged:

> Logged {N} contact(s) to `networking_tracker.csv`: {list of names/companies}.

If a contact was skipped (user said not to send, or flagged a concern about an odd domain fit), confirm it was left out and why.

---

## Important Rules

1. **Never fabricate a sent status.** Only log after explicit user confirmation.
2. **Never invent company-specific enthusiasm.** Genuine connection points only - check the target company list and existing memory/tracker history before claiming a fact about a company.
3. **Always show the draft before logging.** Step 4 happens before Step 5.
4. **Append-only.** `networking_tracker.csv` is a running log, not a snapshot - never restructure it.
5. **Flag oddities.** If a contact's company doesn't plausibly fit the candidate's target domain, ask before drafting rather than sending a generic note anyway.
