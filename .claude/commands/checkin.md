# /checkin - End-of-Session Next-Steps Handoff

You are closing out a session by identifying what's genuinely unresolved, recording it so it survives into the next session, and surfacing it at the top of the dashboard. This is the durable version of "any unresolved things before I exit?" - instead of a one-off answer that vanishes when the conversation ends, it lands in `next_steps.csv` and renders as a banner the next time `dashboard.html` is opened.

Follow these steps **in order**.

---

## Step 1: Review the Session for Open Threads

Scan back across the conversation (and, if this is a fresh session with no prior context, across `job_search_tracker.csv`, `networking_tracker.csv`, and any `outcome.md` files under `applications/*/`) for items in three categories:

1. **Blockers** - waiting on someone else (a reply, a scheduled call, a referral) - nothing to do but wait, but worth remembering who/what.
2. **Decisions** - something only the user can resolve (a number, a preference, a placeholder left in a document) that's blocking progress on an application.
3. **Followups** - available but optional next actions (an unrun `/rank`, an uncommitted tooling change, a suggested-but-not-taken step).

Do not pad the list. An application sitting normally in "submitted, awaiting response" with nothing to decide is not an open item - only surface things that actually need attention or a decision.

---

## Step 2: Confirm the List

Present the punch-list to the user, grouped by category, the same way you would answer "anything unresolved before I exit?" directly in chat. Let them correct, add, or drop items before you write anything.

---

## Step 3: Reconcile `next_steps.csv`

Read `next_steps.csv` (create it with this header if it doesn't exist):
```
date_added,item,category,status,date_resolved
```

- **Mark resolved:** for any existing `status=open` row whose item was addressed this session (or that the user confirms is no longer relevant), set `status=resolved` and `date_resolved` to today. Never delete rows - `resolved` rows are the history of what got handled.
- **Append new:** for each confirmed item from Step 2 that isn't already an open row (match loosely on content, not exact string), add a new row with `status=open`, `date_added` = today, `date_resolved` empty.
- **Leave untouched:** any open row not addressed this session and not confirmed resolved - it stays open and will surface again next time.

Never rewrite or reorder existing rows beyond the `status`/`date_resolved` update described above.

---

## Step 4: Rebuild the Dashboard

Run `python tools/build_dashboard.py` so the Next Steps banner reflects the reconciled file. If this fails, tell the user - do not silently skip it.

---

## Step 5: Confirm

Summarize what was recorded, in the same shape as a normal check-in answer, plus confirmation the dashboard is current:

> **Checked in.** `next_steps.csv` updated: `<N>` item(s) marked resolved, `<M>` new open item(s) recorded. Dashboard rebuilt - open items are pinned at the top next time you load it.

---

## Important Rules

1. **No padding.** A normal in-progress application is not an open item. Only blockers, decisions, and genuine optional followups qualify.
2. **Resolve, don't delete.** `next_steps.csv` is an append-and-resolve log like the other trackers, not an overwritten snapshot - history matters here too.
3. **Confirm before writing.** Step 2 happens before Step 3. Don't write items to the CSV the user hasn't seen and had a chance to correct.
4. **Always rebuild.** A reconciled CSV with a stale `dashboard.html` defeats the purpose - Step 4 is not optional.
