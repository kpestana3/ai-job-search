#!/usr/bin/env python3
"""
Job Search Dashboard Generator

Reads job_search_tracker.csv, networking_tracker.csv (both untracked, personal
data), next_steps.csv, and the upskill/ folder (reports + earned certificates),
and renders a single self-contained HTML dashboard with a left-nav sidebar
(Dashboard / Applications / Networking / Upskill).

Usage:
    python tools/build_dashboard.py [output_path]

Default output: dashboard.html (repo root, gitignored).
Re-run any time the trackers are amended, then re-open the file.
"""
import csv
import json
import re
import sys
from datetime import date, datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ASSETS = Path(__file__).resolve().parent / "dashboard_assets"

# SETUP: shown in the dashboard's browser-tab title and sidebar branding.
# Reads your name from CLAUDE.md's Candidate Profile if present, so most
# users never need to touch this - override the fallback below only if
# CLAUDE.md isn't populated yet or you want a different display name here.
def _owner_name() -> str:
    claude_md = REPO_ROOT / "CLAUDE.md"
    if claude_md.exists():
        match = re.search(r"\*\*Name:\*\*\s*(.+)", claude_md.read_text(encoding="utf-8"))
        if match and "[YOUR_NAME]" not in match.group(1):
            return match.group(1).strip()
    return "Your Name"


DASHBOARD_OWNER_NAME = _owner_name()


def load_font(name: str) -> str:
    return (ASSETS / f"{name}.b64").read_text().strip()


def read_csv(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def verdict_for(score: float | None) -> str:
    if score is None:
        return "Unscored"
    if score >= 75:
        return "Strong Fit"
    if score >= 60:
        return "Good Fit"
    if score >= 45:
        return "Moderate Fit"
    if score >= 30:
        return "Weak Fit"
    return "Poor Fit"


### Ordered longest/most-specific prefix first: status_tier() checks these in
### order and returns on first match, so a more specific key (e.g.
### "interview_only") must be listed before a shorter key it also starts with
### (e.g. "interview") or the shorter one will shadow it.
STATUS_TIER = {
    "interview_only": "resolved",
    "offer_declined": "resolved",
    "offer declined": "resolved",
    "no_response": "resolved",
    "no response": "resolved",
    "applied": "complete",
    "interview": "active",
    "offer": "active",
    "hired": "resolved",
    "rejected": "resolved",
    "withdrawn": "resolved",
    "materials_ready": "pending",
    "not_submitted": "pending",
    "evaluated_not_applied": "evaluated",
}


def status_tier(status: str) -> str:
    status = (status or "").strip()
    for key, tier in STATUS_TIER.items():
        if status.startswith(key):
            return tier
    return "evaluated"


def status_label(status: str) -> str:
    status = (status or "").strip()
    if status.startswith("applied"):
        return "Applied"
    if status.startswith("not_submitted"):
        return "Not submitted"
    if status.startswith("evaluated_not_applied"):
        return "Evaluated only"
    if status.startswith("materials_ready"):
        return "Materials ready"
    if status.startswith("interview_only"):
        return "Interview only (stalled)"
    if status.startswith("offer_declined") or status.startswith("offer declined"):
        return "Offer declined"
    if status.startswith("no_response") or status.startswith("no response"):
        return "No response"
    if not status:
        return "Unknown"
    # Generic fallback covers interview / offer / hired / rejected / withdrawn
    # and any future single-word status without needing a dedicated branch.
    return status.replace("_", " ").title()


def build_applications(rows: list[dict]) -> list[dict]:
    out = []
    for r in rows:
        raw_score = (r.get("fit_rating") or "").strip()
        score = float(raw_score) if raw_score else None
        out.append({
            "date": r.get("date", ""),
            "company": r.get("company", ""),
            "sector": r.get("sector", ""),
            "role": r.get("role", ""),
            "roleType": r.get("role_type", ""),
            "channel": r.get("channel", ""),
            "status": status_label(r.get("status", "")),
            "statusTier": status_tier(r.get("status", "")),
            "contact": r.get("contact_person", ""),
            "score": score,
            "verdict": verdict_for(score),
            "notes": r.get("notes", ""),
            "cvFile": r.get("cv_file", ""),
            "coverLetterFile": r.get("cover_letter_file", ""),
            "source": r.get("source", ""),
        })
    return out


def build_next_steps(rows: list[dict]) -> list[dict]:
    out = []
    for r in rows:
        if (r.get("status") or "").strip().lower() != "open":
            continue
        out.append({
            "item": r.get("item", ""),
            "category": (r.get("category") or "").strip().lower(),
            "dateAdded": r.get("date_added", ""),
        })
    return out


def build_networking(rows: list[dict]) -> list[dict]:
    return [{
        "date": r.get("date", ""),
        "company": r.get("company", ""),
        "contactName": r.get("contact_name", ""),
        "contactTitle": r.get("contact_title", ""),
        "channel": r.get("channel", ""),
        "status": r.get("status", ""),
        "notes": r.get("notes", ""),
    } for r in rows]


# ── Upskill: parse the latest report's markdown tables + list earned certs ────

def _strip_md(text: str) -> str:
    """[label](url) -> label; strip stray ** bold markers."""
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text or "")
    return text.replace("**", "").strip()


def _parse_pipe_table(lines: list[str]) -> list[dict]:
    """Parse a markdown pipe table (header, separator, data rows) into dicts."""
    if len(lines) < 2:
        return []

    def split_row(line: str) -> list[str]:
        return [c.strip() for c in line.strip().strip("|").split("|")]

    headers = split_row(lines[0])
    rows = []
    for line in lines[2:]:
        if not line.strip().startswith("|"):
            break
        cells = split_row(line)
        if len(cells) != len(headers):
            continue
        rows.append(dict(zip(headers, cells)))
    return rows


def _extract_section_table(md_text: str, heading_contains: str) -> list[dict]:
    lines = md_text.splitlines()
    start = None
    for i, line in enumerate(lines):
        if line.strip().startswith("#") and heading_contains.lower() in line.lower():
            start = i + 1
            break
    if start is None:
        return []
    table_lines = []
    for line in lines[start:]:
        if line.strip().startswith("#"):
            break
        if line.strip().startswith("|"):
            table_lines.append(line)
    return _parse_pipe_table(table_lines)


def build_upskill(upskill_dir: Path) -> dict:
    reports = sorted(upskill_dir.glob("report-*.md"))
    latest = reports[-1] if reports else None
    study_order, gap_heatmap, module_total = [], [], None

    if latest:
        text = latest.read_text(encoding="utf-8")
        for row in _extract_section_table(text, "Suggested Study Order"):
            study_order.append({
                "rank": row.get("#", "").strip(),
                "topic": _strip_md(row.get("Topic", "")),
                "type": row.get("Type", "").strip(),
                "time": row.get("Est. Time", "").strip(),
                "note": _strip_md(row.get("Note", "")),
            })
        for row in _extract_section_table(text, "Gap Heatmap"):
            gap_heatmap.append({
                "priority": _strip_md(row.get("Priority", "")),
                "skill": _strip_md(row.get("Skill / Area", "")),
                "type": row.get("Type", "").strip(),
                "source": _strip_md(row.get("Gap Source", "")),
            })
        m = re.search(r"(\d+)\s+self-paced modules", text)
        if m:
            module_total = int(m.group(1))

    certs_dir = upskill_dir / "Certificates"
    certificates = []
    if certs_dir.exists():
        for f in sorted(certs_dir.glob("*.pdf")):
            name = f.stem.replace("eLearning ", "").replace(" Certificate", "").strip()
            earned = date.fromtimestamp(f.stat().st_mtime).isoformat()
            certificates.append({"name": name, "earnedDate": earned})

    return {
        "reportDate": latest.stem.replace("report-", "") if latest else None,
        "studyOrder": study_order,
        "gapHeatmap": gap_heatmap,
        "certificates": certificates,
        "moduleTotal": module_total,
    }


PRIORITY_STATUS = {"critical": "critical", "high": "serious", "medium": "warning", "low": "good"}


def render(applications: list[dict], networking: list[dict], next_steps: list[dict], upskill: dict) -> str:
    scored = [a for a in applications if a["score"] is not None]
    total = len(applications)
    applied_count = sum(1 for a in applications if a["statusTier"] in ("complete", "active", "resolved"))
    pending_count = sum(1 for a in applications if a["statusTier"] == "pending")
    avg_score = round(sum(a["score"] for a in scored) / len(scored), 1) if scored else 0
    best = max(scored, key=lambda a: a["score"]) if scored else None
    strong_or_good = sum(1 for a in scored if a["score"] >= 60)
    submitted_pct = round(applied_count / total * 100) if total else 0
    good_fit_pct = round(strong_or_good / total * 100) if total else 0
    cert_count = len(upskill["certificates"])
    module_total = upskill["moduleTotal"]
    upskill_pct = round(cert_count / module_total * 100) if module_total else None

    fonts_css = f"""
    @font-face {{
      font-family: 'Source Serif Dash';
      font-weight: 600;
      font-style: normal;
      font-display: swap;
      src: url(data:font/woff2;base64,{load_font('source-serif-600')}) format('woff2');
    }}
    @font-face {{
      font-family: 'Source Serif Dash';
      font-weight: 700;
      font-style: normal;
      font-display: swap;
      src: url(data:font/woff2;base64,{load_font('source-serif-700')}) format('woff2');
    }}
    @font-face {{
      font-family: 'Plex Sans Dash';
      font-weight: 400;
      font-style: normal;
      font-display: swap;
      src: url(data:font/woff2;base64,{load_font('ibm-plex-sans-400')}) format('woff2');
    }}
    @font-face {{
      font-family: 'Plex Sans Dash';
      font-weight: 600;
      font-style: normal;
      font-display: swap;
      src: url(data:font/woff2;base64,{load_font('ibm-plex-sans-600')}) format('woff2');
    }}
    @font-face {{
      font-family: 'Plex Mono Dash';
      font-weight: 400;
      font-style: normal;
      font-display: swap;
      src: url(data:font/woff2;base64,{load_font('ibm-plex-mono-400')}) format('woff2');
    }}
    @font-face {{
      font-family: 'Plex Mono Dash';
      font-weight: 600;
      font-style: normal;
      font-display: swap;
      src: url(data:font/woff2;base64,{load_font('ibm-plex-mono-600')}) format('woff2');
    }}
    """

    html = HTML_TEMPLATE
    html = html.replace("__FONT_FACES__", fonts_css)
    html = html.replace("__APPLICATIONS_JSON__", json.dumps(applications))
    html = html.replace("__NETWORKING_JSON__", json.dumps(networking))
    html = html.replace("__NEXT_STEPS_JSON__", json.dumps(next_steps))
    html = html.replace("__UPSKILL_JSON__", json.dumps(upskill))
    html = html.replace("__PRIORITY_STATUS_JSON__", json.dumps(PRIORITY_STATUS))
    html = html.replace("__GENERATED__", date.today().isoformat())
    html = html.replace("__TOTAL__", str(total))
    html = html.replace("__APPLIED_COUNT__", str(applied_count))
    html = html.replace("__PENDING_COUNT__", str(pending_count))
    html = html.replace("__AVG_SCORE__", str(avg_score))
    html = html.replace("__STRONG_GOOD_COUNT__", str(strong_or_good))
    html = html.replace("__BEST_COMPANY__", best["company"] if best else "—")
    html = html.replace("__BEST_SCORE__", str(best["score"]) if best else "—")
    html = html.replace("__NETWORKING_COUNT__", str(len(networking)))
    html = html.replace("__SUBMITTED_PCT__", str(submitted_pct))
    html = html.replace("__GOOD_FIT_PCT__", str(good_fit_pct))
    html = html.replace("__CERT_COUNT__", str(cert_count))
    html = html.replace("__UPSKILL_PCT__", str(upskill_pct if upskill_pct is not None else 0))
    html = html.replace("__UPSKILL_HAS_PCT__", "true" if upskill_pct is not None else "false")
    html = html.replace("__MODULE_TOTAL__", str(module_total or 0))
    html = html.replace("__OWNER_NAME__", DASHBOARD_OWNER_NAME)
    return html


HTML_TEMPLATE = r"""<!doctype html>
<meta charset="utf-8" />
<title>Job Search Dashboard — __OWNER_NAME__</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
__FONT_FACES__

/* Deliberately single-theme (dark) by request — not the usual light/dark pair. */
:root {
  color-scheme: dark;
  --page: #0d0817;
  --sidebar: #0f0a1c;
  --surface: #1a1030;
  --surface-2: #241a42;
  --surface-3: #2e2152;
  --ink: #f5f2fb;
  --ink-muted: #b6aad1;
  --ink-faint: #8577a3;
  --line: rgba(255,255,255,0.08);
  --line-strong: rgba(255,255,255,0.16);

  /* Validated categorical set (dark surface #1a1030) - see dataviz skill
     validator: all-pairs PASS on lightness band, chroma floor, CVD ΔE, and
     contrast. Fixed order, never cycled. */
  --cyan: #22b8d8;
  --cyan-deep: #0891b2;
  --cyan-glow: rgba(34,184,216,0.35);
  --violet: #8b5cf6;
  --violet-deep: #7c3aed;
  --violet-glow: rgba(139,92,246,0.35);
  --magenta: #ec4899;
  --magenta-deep: #db2777;
  --magenta-glow: rgba(236,72,153,0.35);
  --amber: #e08a1e;
  --amber-deep: #d97706;
  --amber-glow: rgba(224,138,30,0.35);

  /* Fixed status palette - never reused for series identity. */
  --good: #22c55e;
  --warning: #fab219;
  --serious: #ec835a;
  --critical: #f0555a;

  --focus: var(--cyan);
  --shadow: 0 1px 2px rgba(0,0,0,0.4), 0 10px 32px rgba(0,0,0,0.5);
  --glow-shadow: 0 0 0 1px var(--line), 0 8px 28px rgba(0,0,0,0.45);
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: var(--page);
  background-image:
    radial-gradient(ellipse 900px 500px at 15% -10%, rgba(139,92,246,0.16), transparent 60%),
    radial-gradient(ellipse 700px 500px at 100% 0%, rgba(34,184,216,0.10), transparent 55%);
  background-attachment: fixed;
  color: var(--ink);
  font-family: 'Plex Sans Dash', ui-sans-serif, system-ui, sans-serif;
  font-size: 15px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
::selection { background: var(--violet-glow); }
a { color: var(--cyan); }
a:hover { color: var(--ink); }
:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
code {
  font-family: 'Plex Mono Dash', monospace;
  background: var(--surface-2);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 0.92em;
}

/* ── Shell: sidebar + content ─────────────────────────────────────────── */
.shell { display: flex; min-height: 100vh; }

.sidebar {
  width: 224px;
  flex: none;
  background: var(--sidebar);
  border-right: 1px solid var(--line);
  padding: 24px 14px;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 10px 22px;
  margin-bottom: 10px;
  border-bottom: 1px solid var(--line);
}
.brand-mark {
  width: 30px; height: 30px;
  border-radius: 9px;
  background: linear-gradient(135deg, var(--cyan), var(--violet));
  box-shadow: 0 0 18px var(--violet-glow);
  flex: none;
}
.brand-text {
  font-family: 'Source Serif Dash', Georgia, serif;
  font-weight: 700;
  font-size: 15.5px;
  line-height: 1.2;
  color: var(--ink);
}
.brand-text small { display: block; font-family: 'Plex Sans Dash', sans-serif; font-weight: 400; font-size: 11px; color: var(--ink-faint); margin-top: 2px; }

.nav-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 3px; }
.nav-item {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 9px;
  border: none;
  background: transparent;
  color: var(--ink-muted);
  font-family: 'Plex Sans Dash', sans-serif;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s ease, color 0.12s ease;
  position: relative;
}
.nav-item svg { width: 17px; height: 17px; flex: none; opacity: 0.85; }
.nav-item:hover { background: var(--surface); color: var(--ink); }
.nav-item[aria-current="true"] {
  background: var(--surface);
  color: var(--ink);
  box-shadow: inset 3px 0 0 0 var(--cyan);
}
.nav-item[aria-current="true"] svg { opacity: 1; color: var(--cyan); }
.nav-badge {
  margin-left: auto;
  font-family: 'Plex Mono Dash', monospace;
  font-size: 10.5px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--surface-3);
  color: var(--ink-muted);
}
.nav-badge.urgent { background: rgba(250,178,25,0.18); color: var(--warning); }
.sidebar-footer {
  margin-top: auto;
  padding: 14px 10px 4px;
  font-family: 'Plex Mono Dash', monospace;
  font-size: 10.5px;
  color: var(--ink-faint);
  border-top: 1px solid var(--line);
}

.content { flex: 1; min-width: 0; padding: 32px 36px 80px; max-width: 1240px; }
.page { display: none; }
.page.active { display: block; }

.page-header { margin-bottom: 26px; }
.eyebrow {
  font-family: 'Plex Mono Dash', monospace;
  font-size: 11.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--cyan);
  margin: 0 0 6px;
}
h1 {
  font-family: 'Source Serif Dash', Georgia, serif;
  font-weight: 700;
  font-size: 30px;
  line-height: 1.15;
  margin: 0;
  text-wrap: balance;
  color: var(--ink);
}
.subtitle { color: var(--ink-muted); margin: 6px 0 0; font-size: 14px; max-width: 68ch; }

section.block { margin-bottom: 40px; }
h2.section-title {
  font-family: 'Source Serif Dash', Georgia, serif;
  font-weight: 600;
  font-size: 19px;
  margin: 0 0 4px;
  color: var(--ink);
}
p.section-note {
  margin: 0 0 16px;
  color: var(--ink-muted);
  font-size: 13.5px;
  max-width: 68ch;
}

/* ── Stat tiles ────────────────────────────────────────────────────────── */
.tiles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 28px;
}
@media (max-width: 720px) { .tiles { grid-template-columns: 1fr 1fr; } }
.tile {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 16px 18px;
  box-shadow: var(--glow-shadow);
}
.tile .label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ink-faint);
  margin: 0 0 8px;
}
.tile .value {
  font-family: 'Plex Mono Dash', monospace;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  font-size: 26px;
  color: var(--ink);
}
.tile .value small { font-size: 14px; font-weight: 400; color: var(--ink-muted); }

/* ── Progress rings ────────────────────────────────────────────────────── */
.rings {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 32px;
}
@media (max-width: 720px) { .rings { grid-template-columns: 1fr; } }
.ring-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 18px;
  box-shadow: var(--glow-shadow);
}
.ring-wrap { position: relative; width: 96px; height: 96px; flex: none; filter: drop-shadow(0 0 10px var(--ring-glow, transparent)); }
.ring-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.ring-track { fill: none; stroke: var(--surface-3); stroke-width: 9; }
.ring-fill { fill: none; stroke-width: 9; stroke-linecap: round; transition: stroke-dashoffset 0.7s ease; }
.ring-center {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Plex Mono Dash', monospace;
  font-weight: 600;
  font-size: 17px;
  color: var(--ink);
}
.ring-meta .ring-title { font-weight: 600; font-size: 13.5px; color: var(--ink); margin: 0 0 4px; }
.ring-meta .ring-sub { font-size: 12.5px; color: var(--ink-muted); line-height: 1.4; }

/* ── Next steps ────────────────────────────────────────────────────────── */
.next-steps-banner {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 18px 22px;
  box-shadow: var(--glow-shadow);
}
.next-steps-headline {
  font-family: 'Source Serif Dash', Georgia, serif;
  font-weight: 700;
  font-size: 17px;
  margin: 0 0 12px;
  color: var(--ink);
}
.next-steps-headline .n { color: var(--amber); }
.next-steps-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.next-steps-list li {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 13.5px;
  color: var(--ink);
  flex-wrap: wrap;
  padding: 9px 12px;
  background: var(--surface-2);
  border-radius: 9px;
}
.next-steps-tabs {
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--line);
  margin: 2px 0 14px;
}
.next-steps-tab {
  font-family: 'Plex Sans Dash', sans-serif;
  font-size: 12.5px;
  padding: 7px 12px;
  border: none;
  background: transparent;
  color: var(--ink-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  white-space: nowrap;
  transition: color 0.12s ease, border-color 0.12s ease;
}
.next-steps-tab:hover { color: var(--ink); }
.next-steps-tab .count { font-family: 'Plex Mono Dash', monospace; opacity: 0.65; margin-left: 5px; }
.next-steps-tab[aria-selected="true"] { color: var(--amber); border-bottom-color: var(--amber); font-weight: 600; }
.next-steps-text { flex: 1; min-width: 200px; }
.next-steps-date { font-family: 'Plex Mono Dash', monospace; font-size: 11.5px; color: var(--ink-faint); white-space: nowrap; }
.next-steps-empty { color: var(--ink-faint); font-style: italic; background: transparent !important; padding: 4px 12px !important; }

/* ── Fit score chart ───────────────────────────────────────────────────── */
.chart {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 20px 24px 28px;
  box-shadow: var(--glow-shadow);
  position: relative;
  overflow-x: auto;
}
.chart-thresholds {
  position: relative;
  height: 20px;
  margin-left: 190px;
  margin-bottom: 4px;
  font-family: 'Plex Mono Dash', monospace;
  font-size: 10.5px;
  color: var(--ink-faint);
  min-width: 360px;
}
.threshold-label { position: absolute; transform: translateX(-50%); white-space: nowrap; text-transform: uppercase; letter-spacing: 0.04em; }
.chart-rows { min-width: 560px; }
.chart-row { display: grid; grid-template-columns: 190px 1fr 46px; align-items: center; gap: 10px; padding: 5px 0; border-radius: 6px; position: relative; }
.chart-row:hover { background: var(--surface-2); }
.chart-row .co { font-size: 13px; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chart-track { position: relative; height: 16px; background: var(--surface-3); border-radius: 4px; overflow: visible; }
.chart-track::before, .chart-track::after, .chart-track .tick { content: ""; position: absolute; top: -3px; bottom: -3px; width: 1px; background: var(--line-strong); }
.chart-fill { position: absolute; top: 0; left: 0; bottom: 0; border-radius: 4px; background: var(--bar-color, var(--cyan)); }
.chart-score { font-family: 'Plex Mono Dash', monospace; font-variant-numeric: tabular-nums; font-weight: 600; font-size: 13px; text-align: right; color: var(--ink); }

#tooltip {
  position: fixed; pointer-events: none;
  background: var(--surface-3); color: var(--ink);
  border: 1px solid var(--line-strong);
  font-size: 12.5px; padding: 8px 10px; border-radius: 8px; max-width: 260px;
  box-shadow: var(--shadow); opacity: 0; transition: opacity 0.1s ease; z-index: 50; line-height: 1.4;
}
#tooltip.show { opacity: 1; }
#tooltip b { font-weight: 600; }
#tooltip .tt-score { font-family: 'Plex Mono Dash', monospace; }

/* ── Controls ──────────────────────────────────────────────────────────── */
.controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
.chip-group { display: flex; gap: 6px; flex-wrap: wrap; }
.chip {
  font-family: 'Plex Sans Dash', sans-serif;
  font-size: 12.5px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--line-strong);
  background: var(--surface);
  color: var(--ink-muted);
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}
.chip[aria-pressed="true"] { background: var(--cyan-deep); border-color: var(--cyan-deep); color: #fff; }
.search {
  margin-left: auto;
  font-family: 'Plex Sans Dash', sans-serif;
  font-size: 13px;
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px solid var(--line-strong);
  background: var(--surface);
  color: var(--ink);
  min-width: 200px;
}
.search::placeholder { color: var(--ink-faint); }

/* ── Table ─────────────────────────────────────────────────────────────── */
.table-wrap { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; box-shadow: var(--glow-shadow); overflow-x: auto; }
table { width: 100%; border-collapse: collapse; min-width: 760px; }
thead th {
  position: sticky; top: 0;
  background: var(--surface-2);
  text-align: left;
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ink-muted);
  padding: 10px 14px;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  border-bottom: 1px solid var(--line);
}
thead th .arrow { opacity: 0.35; margin-left: 3px; font-size: 10px; }
thead th[data-active="true"] .arrow { opacity: 1; color: var(--cyan); }
tbody tr.row { border-bottom: 1px solid var(--line); cursor: pointer; }
tbody tr.row:hover { background: var(--surface-2); }
tbody td { padding: 11px 14px; vertical-align: top; font-size: 13.5px; }
td.company { font-weight: 600; }
td.role { color: var(--ink-muted); }
td.date, td.score { font-family: 'Plex Mono Dash', monospace; font-variant-numeric: tabular-nums; white-space: nowrap; }
td.score { text-align: right; font-weight: 600; }

.pill { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; padding: 3px 9px; border-radius: 999px; white-space: nowrap; }
.pill .dot { width: 6px; height: 6px; border-radius: 50%; flex: none; }
.pill.complete { background: rgba(34,184,216,0.16); color: var(--cyan); }
.pill.complete .dot { background: var(--cyan); }
.pill.pending { background: rgba(224,138,30,0.16); color: var(--amber); }
.pill.pending .dot { background: var(--amber); }
.pill.evaluated { background: var(--surface-3); color: var(--ink-muted); }
.pill.evaluated .dot { background: var(--ink-muted); }
.pill.active { background: rgba(236,72,153,0.16); color: var(--magenta); }
.pill.active .dot { background: var(--magenta); }
.pill.resolved { background: rgba(139,92,246,0.16); color: var(--violet); }
.pill.resolved .dot { background: var(--violet); }

tr.details-row td { background: var(--surface-2); font-size: 13px; color: var(--ink); padding: 14px 18px 18px; line-height: 1.55; }
tr.details-row { display: none; }
tr.details-row.open { display: table-row; }
.details-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 4px 20px; margin-bottom: 10px; font-size: 12.5px; color: var(--ink-muted); }
.details-grid b { color: var(--ink); font-weight: 600; }
.details-notes { max-width: 90ch; }
.chevron { display: inline-block; transition: transform 0.15s ease; color: var(--ink-faint); margin-right: 4px; }
tr.row.open .chevron { transform: rotate(90deg); }

/* ── Upskill page ──────────────────────────────────────────────────────── */
.cert-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; margin-bottom: 8px; }
.cert-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  box-shadow: var(--glow-shadow);
}
.cert-icon {
  width: 34px; height: 34px; flex: none; border-radius: 9px;
  background: linear-gradient(135deg, var(--cyan), var(--violet));
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 14px var(--cyan-glow);
}
.cert-icon svg { width: 18px; height: 18px; color: #0d0817; }
.cert-name { font-size: 13.5px; font-weight: 600; color: var(--ink); line-height: 1.35; margin: 0 0 3px; }
.cert-date { font-family: 'Plex Mono Dash', monospace; font-size: 11.5px; color: var(--ink-faint); }
.cert-empty { color: var(--ink-faint); font-style: italic; font-size: 13.5px; }

.study-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.study-item {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 13px 16px;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  box-shadow: var(--glow-shadow);
}
.study-rank {
  font-family: 'Plex Mono Dash', monospace;
  font-weight: 600;
  font-size: 13px;
  color: var(--cyan);
  background: rgba(34,184,216,0.14);
  width: 26px; height: 26px; flex: none;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}
.study-body { flex: 1; min-width: 0; }
.study-topic { font-size: 13.5px; font-weight: 600; color: var(--ink); margin: 0 0 3px; }
.study-meta { display: flex; gap: 8px; align-items: center; margin-bottom: 4px; flex-wrap: wrap; }
.study-type {
  font-family: 'Plex Mono Dash', monospace;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--surface-3);
  color: var(--ink-muted);
}
.study-time { font-family: 'Plex Mono Dash', monospace; font-size: 11.5px; color: var(--ink-faint); }
.study-note { font-size: 12.5px; color: var(--ink-muted); line-height: 1.45; }

.gap-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
.gap-item {
  background: var(--surface);
  border: 1px solid var(--line);
  border-left: 3px solid var(--gap-color, var(--ink-faint));
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
}
.gap-top { display: flex; align-items: center; gap: 9px; margin-bottom: 3px; flex-wrap: wrap; }
.gap-priority {
  font-family: 'Plex Mono Dash', monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  color: var(--gap-color, var(--ink-faint));
}
.gap-skill { font-weight: 600; color: var(--ink); }
.gap-source { color: var(--ink-muted); font-size: 12.5px; line-height: 1.4; }
.upskill-empty { color: var(--ink-faint); font-style: italic; }

footer {
  margin-top: 40px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
  color: var(--ink-faint);
  font-size: 12px;
}

@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }

@media (max-width: 860px) {
  .shell { flex-direction: column; }
  .sidebar { width: 100%; height: auto; position: static; flex-direction: row; align-items: center; overflow-x: auto; padding: 12px; }
  .brand { border-bottom: none; padding: 0 14px 0 0; margin: 0 10px 0 0; border-right: 1px solid var(--line); }
  .nav-list { flex-direction: row; }
  .sidebar-footer { display: none; }
  .content { padding: 24px 18px 60px; }
}
</style>

<div class="shell">
  <nav class="sidebar">
    <div class="brand">
      <div class="brand-mark"></div>
      <div class="brand-text">Dashboard<small>__OWNER_NAME__</small></div>
    </div>
    <ul class="nav-list" id="navList">
      <li><button class="nav-item" type="button" data-page="home" aria-current="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 12 12 4l8 8"/><path d="M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9"/></svg>
        <span>Dashboard</span><span class="nav-badge urgent" id="navBadgeHome"></span>
      </button></li>
      <li><button class="nav-item" type="button" data-page="applications">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/></svg>
        <span>Applications</span><span class="nav-badge" id="navBadgeApps"></span>
      </button></li>
      <li><button class="nav-item" type="button" data-page="networking">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="7" cy="7" r="2.6"/><circle cx="17" cy="7" r="2.6"/><circle cx="12" cy="17" r="2.6"/><path d="M9 8.7 10.4 15M15 8.7 13.6 15"/></svg>
        <span>Networking</span><span class="nav-badge" id="navBadgeNet"></span>
      </button></li>
      <li><button class="nav-item" type="button" data-page="upskill">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 8 12 3l10 5-10 5-10-5Z"/><path d="M6 10.5V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-5.5"/></svg>
        <span>Upskill</span><span class="nav-badge" id="navBadgeUpskill"></span>
      </button></li>
    </ul>
    <div class="sidebar-footer">last built __GENERATED__</div>
  </nav>

  <main class="content">

    <!-- ══════════════════ HOME ══════════════════ -->
    <section class="page active" id="page-home">
      <div class="page-header">
        <p class="eyebrow">Overview</p>
        <h1>Welcome back</h1>
        <p class="subtitle">A snapshot of the search — applications, networking, and upskilling in one place. Re-run <code>tools/build_dashboard.py</code> after amending the CSVs.</p>
      </div>

      <div class="tiles">
        <div class="tile"><p class="label">Total Applications</p><p class="value">__TOTAL__</p></div>
        <div class="tile"><p class="label">Networking Outreach</p><p class="value">__NETWORKING_COUNT__</p></div>
        <div class="tile"><p class="label">Certificates Earned</p><p class="value">__CERT_COUNT__</p></div>
      </div>

      <div class="rings" id="homeRings"></div>

      <section class="block" id="nextStepsBlock">
        <div class="next-steps-banner">
          <p class="next-steps-headline" id="nextStepsHeadline"></p>
          <div class="next-steps-tabs" id="nextStepsTabs" role="tablist"></div>
          <ul class="next-steps-list" id="nextStepsList"></ul>
        </div>
      </section>
    </section>

    <!-- ══════════════════ APPLICATIONS ══════════════════ -->
    <section class="page" id="page-applications">
      <div class="page-header">
        <p class="eyebrow">Job Search</p>
        <h1>Applications</h1>
        <p class="subtitle">Generated from <code>job_search_tracker.csv</code> — a snapshot, not a live view.</p>
      </div>

      <section class="block">
        <h2 class="section-title">Fit Score by Application</h2>
        <p class="section-note">Sorted high to low. Dashed lines mark the scoring framework's own thresholds (Weak / Moderate / Good / Strong Fit) so a score reads against the rubric, not just against other rows.</p>
        <div class="chart">
          <div class="chart-thresholds" id="thresholds"></div>
          <div class="chart-rows" id="chartRows"></div>
        </div>
      </section>

      <section class="block">
        <h2 class="section-title">All Applications</h2>
        <p class="section-note">Click a row to expand notes, files, and contact detail. Click a column header to sort.</p>
        <div class="controls">
          <div class="chip-group" id="statusFilters"></div>
          <input class="search" id="searchBox" type="text" placeholder="Search company or role…" />
        </div>
        <div class="table-wrap">
          <table id="appsTable">
            <thead>
              <tr>
                <th data-key="company">Company <span class="arrow">▾</span></th>
                <th data-key="role">Role <span class="arrow">▾</span></th>
                <th data-key="status">Status <span class="arrow">▾</span></th>
                <th data-key="score">Fit <span class="arrow">▾</span></th>
                <th data-key="date">Date <span class="arrow">▾</span></th>
              </tr>
            </thead>
            <tbody id="appsBody"></tbody>
          </table>
        </div>
      </section>

      <footer>
        Best fit so far: __BEST_COMPANY__ (__BEST_SCORE__).
      </footer>
    </section>

    <!-- ══════════════════ NETWORKING ══════════════════ -->
    <section class="page" id="page-networking">
      <div class="page-header">
        <p class="eyebrow">Relationships</p>
        <h1>Networking Outreach</h1>
        <p class="subtitle">Cold and warm contacts at target companies, tracked separately from application reqs. Generated from <code>networking_tracker.csv</code>.</p>
      </div>

      <section class="block">
        <div class="controls">
          <div class="chip-group" id="channelFilters"></div>
          <input class="search" id="netSearchBox" type="text" placeholder="Search company, contact, or title…" />
        </div>
        <div class="table-wrap">
          <table id="netTable">
            <thead>
              <tr>
                <th>Company</th>
                <th>Contact</th>
                <th>Title</th>
                <th>Channel</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody id="netBody"></tbody>
          </table>
        </div>
      </section>
    </section>

    <!-- ══════════════════ UPSKILL ══════════════════ -->
    <section class="page" id="page-upskill">
      <div class="page-header">
        <p class="eyebrow">Growth</p>
        <h1>Upskill</h1>
        <p class="subtitle">Certificates earned and the current recommended learning plan, generated from <code>upskill/Certificates/</code> and the latest <code>upskill/report-*.md</code>.</p>
      </div>

      <section class="block">
        <h2 class="section-title">Certificates Earned</h2>
        <p class="section-note">Every completed course, pulled straight from the Certificates folder.</p>
        <div class="cert-grid" id="certGrid"></div>
      </section>

      <section class="block">
        <h2 class="section-title">Recommended Study Order</h2>
        <p class="section-note" id="studyOrderNote"></p>
        <ul class="study-list" id="studyList"></ul>
      </section>

      <section class="block">
        <h2 class="section-title">Skill Gap Heatmap</h2>
        <p class="section-note">Every gap identified across evaluated postings, most urgent first.</p>
        <ul class="gap-list" id="gapList"></ul>
      </section>
    </section>

  </main>
</div>

<div id="tooltip"></div>

<script>
const APPLICATIONS = __APPLICATIONS_JSON__;
const NETWORKING = __NETWORKING_JSON__;
const NEXT_STEPS = __NEXT_STEPS_JSON__;
const UPSKILL = __UPSKILL_JSON__;
const PRIORITY_STATUS = __PRIORITY_STATUS_JSON__;
const SUBMITTED_PCT = __SUBMITTED_PCT__;
const GOOD_FIT_PCT = __GOOD_FIT_PCT__;
const UPSKILL_PCT = __UPSKILL_PCT__;
const UPSKILL_HAS_PCT = __UPSKILL_HAS_PCT__;
const MODULE_TOTAL = __MODULE_TOTAL__;

// ── Sidebar navigation ─────────────────────────────────────────────────────
function goToPage(name) {
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("active", p.id === "page-" + name));
  document.querySelectorAll(".nav-item").forEach(b => b.setAttribute("aria-current", b.dataset.page === name ? "true" : "false"));
}
document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => goToPage(btn.dataset.page));
});
document.getElementById("navBadgeApps").textContent = APPLICATIONS.length;
document.getElementById("navBadgeNet").textContent = NETWORKING.length;
document.getElementById("navBadgeUpskill").textContent = UPSKILL.certificates.length;

// ── Progress rings (reusable) ───────────────────────────────────────────────
function renderRing(container, pct, colorVar, glowVar, valueText, title, sub) {
  const r = 40, c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const card = document.createElement("div");
  card.className = "ring-card";
  const wrap = document.createElement("div");
  wrap.className = "ring-wrap";
  wrap.style.setProperty("--ring-glow", glowVar);
  wrap.innerHTML = `
    <svg class="ring-svg" viewBox="0 0 100 100">
      <circle class="ring-track" cx="50" cy="50" r="${r}"></circle>
      <circle class="ring-fill" cx="50" cy="50" r="${r}" stroke="${colorVar}"
        stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - clamped / 100)).toFixed(1)}"></circle>
    </svg>
    <div class="ring-center">${valueText}</div>
  `;
  const meta = document.createElement("div");
  meta.className = "ring-meta";
  meta.innerHTML = `<p class="ring-title">${title}</p><p class="ring-sub">${sub}</p>`;
  card.appendChild(wrap);
  card.appendChild(meta);
  container.appendChild(card);
}

function renderHomeRings() {
  const el = document.getElementById("homeRings");
  el.innerHTML = "";
  const total = APPLICATIONS.length;
  const submittedCount = APPLICATIONS.filter(a => ["complete", "active", "resolved"].includes(a.statusTier)).length;
  const goodFitCount = APPLICATIONS.filter(a => a.score !== null && a.score >= 60).length;
  renderRing(el, SUBMITTED_PCT, "var(--cyan)", "var(--cyan-glow)", SUBMITTED_PCT + "%",
    "Applications Submitted", `${submittedCount} of ${total} tracked postings`);
  renderRing(el, GOOD_FIT_PCT, "var(--violet)", "var(--violet-glow)", GOOD_FIT_PCT + "%",
    "Good Fit or Better", `${goodFitCount} of ${total} score 60+`);
  if (UPSKILL_HAS_PCT) {
    renderRing(el, UPSKILL_PCT, "var(--magenta)", "var(--magenta-glow)", UPSKILL_PCT + "%",
      "GMP Course Progress", `${UPSKILL.certificates.length} of ${MODULE_TOTAL} modules complete`);
  } else {
    renderRing(el, UPSKILL.certificates.length > 0 ? 100 : 0, "var(--magenta)", "var(--magenta-glow)",
      String(UPSKILL.certificates.length), "Certificates Earned", "Keep going — every course counts.");
  }
}

// ── Next steps (home page) ──────────────────────────────────────────────────
const CATEGORY_LABEL = {
  "ready-to-send": "Ready to Send",
  decision: "Decision",
  "interview-prep": "Interview Prep",
  "networking-maintenance": "Networking Maintenance",
  followup: "Follow-up",
  "side-project": "Side Project",
  blocker: "Blocker",
  "awaiting-reply": "Awaiting Reply",
  inactive: "Inactive",
};
// Tabs run left-to-right from "you can act on this right now" to "nothing to
// do but wait" - ready-to-send needs zero thought, awaiting-reply/inactive
// need none at all. Categories not in this list (future additions) fall
// through to the end via the filter below rather than disappearing.
const NEXT_STEPS_ORDER = [
  "ready-to-send", "decision", "interview-prep", "networking-maintenance",
  "followup", "side-project", "blocker", "awaiting-reply", "inactive",
];
const PASSIVE_CATEGORIES = new Set(["awaiting-reply", "inactive"]);
const presentCategories = new Set(NEXT_STEPS.map(s => s.category || "followup"));
const NEXT_STEPS_CATEGORIES = [
  ...NEXT_STEPS_ORDER.filter(c => presentCategories.has(c)),
  ...[...presentCategories].filter(c => !NEXT_STEPS_ORDER.includes(c)),
];
let activeNextStepsTab = NEXT_STEPS_CATEGORIES.find(
  cat => NEXT_STEPS.some(s => (s.category || "followup") === cat)
) || NEXT_STEPS_CATEGORIES[0];

function renderNextStepsTabs() {
  const el = document.getElementById("nextStepsTabs");
  el.innerHTML = "";
  NEXT_STEPS_CATEGORIES.forEach(cat => {
    const count = NEXT_STEPS.filter(s => (s.category || "followup") === cat).length;
    const tab = document.createElement("button");
    tab.className = "next-steps-tab";
    tab.type = "button";
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", cat === activeNextStepsTab);
    tab.innerHTML = `${CATEGORY_LABEL[cat] || cat}<span class="count">${count}</span>`;
    tab.addEventListener("click", () => {
      activeNextStepsTab = cat;
      renderNextStepsTabs();
      renderNextSteps();
    });
    el.appendChild(tab);
  });
}

function renderNextSteps() {
  const block = document.getElementById("nextStepsBlock");
  if (!NEXT_STEPS.length) { block.style.display = "none"; document.getElementById("navBadgeHome").style.display = "none"; return; }
  block.style.display = "";
  const actionable = NEXT_STEPS.filter(s => !PASSIVE_CATEGORIES.has(s.category || "followup")).length;
  document.getElementById("nextStepsHeadline").innerHTML =
    actionable === 0 ? "Nothing to check on right now" :
    actionable === 1 ? '<span class="n">1</span> thing to check on' : `<span class="n">${actionable}</span> things to check on`;
  const badge = document.getElementById("navBadgeHome");
  if (actionable > 0) { badge.textContent = actionable; badge.style.display = ""; } else { badge.style.display = "none"; }
  const list = document.getElementById("nextStepsList");
  list.innerHTML = "";
  const visible = NEXT_STEPS.filter(s => (s.category || "followup") === activeNextStepsTab);
  if (!visible.length) {
    const li = document.createElement("li");
    li.className = "next-steps-empty";
    li.textContent = "Nothing here right now.";
    list.appendChild(li);
    return;
  }
  visible.forEach(s => {
    const li = document.createElement("li");
    const text = document.createElement("span");
    text.className = "next-steps-text";
    text.textContent = s.item;
    li.appendChild(text);
    if (s.dateAdded) {
      const dateEl = document.createElement("span");
      dateEl.className = "next-steps-date";
      dateEl.textContent = s.dateAdded;
      li.appendChild(dateEl);
    }
    list.appendChild(li);
  });
}

// ── Fit score chart ──────────────────────────────────────────────────────
const THRESHOLDS = [
  { at: 30, label: "Weak" },
  { at: 45, label: "Moderate" },
  { at: 60, label: "Good" },
  { at: 75, label: "Strong" },
];

function scoreColor(score) {
  if (score === null || score === undefined) return "var(--ink-faint)";
  const t = Math.max(0, Math.min(1, score / 100));
  // Sequential: one hue (cyan), muted-and-dark -> vivid-and-light with magnitude.
  const low = [90, 74, 130];    // muted violet-gray, low score
  const high = [34, 184, 216];  // vivid cyan, high score
  const mix = low.map((c, i) => Math.round(c + (high[i] - c) * t));
  return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
}

function renderThresholds() {
  const el = document.getElementById("thresholds");
  el.innerHTML = "";
  THRESHOLDS.forEach(th => {
    const span = document.createElement("span");
    span.className = "threshold-label";
    span.style.left = th.at + "%";
    span.textContent = th.label + " " + th.at;
    el.appendChild(span);
  });
}

function renderChart() {
  const rows = document.getElementById("chartRows");
  rows.innerHTML = "";
  const sorted = [...APPLICATIONS].filter(a => a.score !== null).sort((a, b) => b.score - a.score);
  const tooltip = document.getElementById("tooltip");

  sorted.forEach(a => {
    const row = document.createElement("div");
    row.className = "chart-row";

    const co = document.createElement("div");
    co.className = "co";
    co.textContent = a.company;
    co.title = a.company;

    const track = document.createElement("div");
    track.className = "chart-track";
    THRESHOLDS.forEach(th => {
      const tick = document.createElement("div");
      tick.className = "tick";
      tick.style.left = th.at + "%";
      track.appendChild(tick);
    });
    const fill = document.createElement("div");
    fill.className = "chart-fill";
    fill.style.width = Math.max(2, a.score) + "%";
    fill.style.setProperty("--bar-color", scoreColor(a.score));
    track.appendChild(fill);

    const score = document.createElement("div");
    score.className = "chart-score";
    score.textContent = a.score;

    row.appendChild(co);
    row.appendChild(track);
    row.appendChild(score);

    row.addEventListener("mousemove", (e) => {
      tooltip.innerHTML = `<b>${a.company}</b><br>${a.role}<br><span class="tt-score">${a.score}/100</span> — ${a.verdict}`;
      tooltip.style.left = (e.clientX + 14) + "px";
      tooltip.style.top = (e.clientY + 14) + "px";
      tooltip.classList.add("show");
    });
    row.addEventListener("mouseleave", () => tooltip.classList.remove("show"));

    rows.appendChild(row);
  });
}

// ── Applications table ────────────────────────────────────────────────────
let sortKey = "score";
let sortDir = -1;
let activeStatuses = new Set(["complete", "pending", "evaluated", "active", "resolved"]);
let searchTerm = "";

const STATUS_TIERS = [
  { tier: "pending", label: "Pending" },
  { tier: "evaluated", label: "Evaluated only" },
  { tier: "complete", label: "Applied" },
  { tier: "active", label: "In Process" },
  { tier: "resolved", label: "Resolved" },
];

function renderStatusFilters() {
  const el = document.getElementById("statusFilters");
  el.innerHTML = "";
  STATUS_TIERS.forEach(s => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.type = "button";
    chip.textContent = s.label;
    chip.setAttribute("aria-pressed", activeStatuses.has(s.tier));
    chip.addEventListener("click", () => {
      if (activeStatuses.has(s.tier)) activeStatuses.delete(s.tier);
      else activeStatuses.add(s.tier);
      renderStatusFilters();
      renderTable();
    });
    el.appendChild(chip);
  });
}

function filteredSorted() {
  let rows = APPLICATIONS.filter(a => activeStatuses.has(a.statusTier));
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    rows = rows.filter(a => a.company.toLowerCase().includes(q) || a.role.toLowerCase().includes(q));
  }
  rows = [...rows].sort((a, b) => {
    let av = a[sortKey], bv = b[sortKey];
    if (sortKey === "score") { av = av ?? -1; bv = bv ?? -1; }
    if (typeof av === "string") { av = av.toLowerCase(); bv = bv.toLowerCase(); }
    if (av < bv) return -1 * sortDir;
    if (av > bv) return 1 * sortDir;
    return 0;
  });
  return rows;
}

function renderTable() {
  const body = document.getElementById("appsBody");
  body.innerHTML = "";
  const rows = filteredSorted();

  rows.forEach((a, i) => {
    const tr = document.createElement("tr");
    tr.className = "row";
    tr.innerHTML = `
      <td class="company"><span class="chevron">›</span>${a.company}</td>
      <td class="role">${a.role}</td>
      <td><span class="pill ${a.statusTier}"><span class="dot"></span>${a.status}</span></td>
      <td class="score">${a.score !== null ? a.score : "—"}</td>
      <td class="date">${a.date}</td>
    `;

    const details = document.createElement("tr");
    details.className = "details-row";
    const notes = a.notes || "";
    details.innerHTML = `
      <td colspan="5">
        <div class="details-grid">
          <div><b>Sector</b><br>${a.sector || "—"}</div>
          <div><b>Channel</b><br>${a.channel || "—"}</div>
          <div><b>Contact</b><br>${a.contact || "—"}</div>
          <div><b>Source</b><br>${a.source || "—"}</div>
        </div>
        <div class="details-notes">${notes}</div>
      </td>
    `;

    tr.addEventListener("click", () => {
      const isOpen = tr.classList.contains("open");
      document.querySelectorAll("tr.row.open").forEach(r => r.classList.remove("open"));
      document.querySelectorAll("tr.details-row.open").forEach(r => r.classList.remove("open"));
      if (!isOpen) {
        tr.classList.add("open");
        details.classList.add("open");
      }
    });

    body.appendChild(tr);
    body.appendChild(details);
  });
}

document.querySelectorAll("#appsTable thead th").forEach(th => {
  th.addEventListener("click", () => {
    const key = th.dataset.key;
    if (sortKey === key) sortDir *= -1;
    else { sortKey = key; sortDir = key === "score" ? -1 : 1; }
    document.querySelectorAll("#appsTable thead th").forEach(h => h.removeAttribute("data-active"));
    th.setAttribute("data-active", "true");
    renderTable();
  });
});

document.getElementById("searchBox").addEventListener("input", (e) => {
  searchTerm = e.target.value;
  renderTable();
});

// ── Networking table ──────────────────────────────────────────────────────
let netSearchTerm = "";
const ALL_CHANNELS = [...new Set(NETWORKING.map(n => n.channel || "Unknown"))].sort();
let activeChannels = new Set(ALL_CHANNELS);

function renderChannelFilters() {
  const el = document.getElementById("channelFilters");
  el.innerHTML = "";
  ALL_CHANNELS.forEach(ch => {
    const count = NETWORKING.filter(n => (n.channel || "Unknown") === ch).length;
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.type = "button";
    chip.textContent = `${ch} (${count})`;
    chip.setAttribute("aria-pressed", activeChannels.has(ch));
    chip.addEventListener("click", () => {
      if (activeChannels.has(ch)) activeChannels.delete(ch);
      else activeChannels.add(ch);
      renderChannelFilters();
      renderNetworking();
    });
    el.appendChild(chip);
  });
}

function netFiltered() {
  let rows = NETWORKING.filter(n => activeChannels.has(n.channel || "Unknown"));
  if (netSearchTerm) {
    const q = netSearchTerm.toLowerCase();
    rows = rows.filter(n =>
      (n.company || "").toLowerCase().includes(q) ||
      (n.contactName || "").toLowerCase().includes(q) ||
      (n.contactTitle || "").toLowerCase().includes(q)
    );
  }
  return rows;
}

function renderNetworking() {
  const body = document.getElementById("netBody");
  body.innerHTML = "";
  const rows = netFiltered();

  rows.forEach(n => {
    const tr = document.createElement("tr");
    tr.className = "row";
    tr.innerHTML = `
      <td class="company"><span class="chevron">›</span>${n.company}</td>
      <td>${n.contactName}</td>
      <td class="role">${n.contactTitle}</td>
      <td>${n.channel}</td>
      <td><span class="pill complete"><span class="dot"></span>${n.status}</span></td>
      <td class="date">${n.date}</td>
    `;

    const details = document.createElement("tr");
    details.className = "details-row";
    const notes = n.notes || "";
    details.innerHTML = `
      <td colspan="6">
        <div class="details-grid">
          <div><b>Contact</b><br>${n.contactName || "—"}</div>
          <div><b>Title</b><br>${n.contactTitle || "—"}</div>
          <div><b>Channel</b><br>${n.channel || "—"}</div>
          <div><b>Status</b><br>${n.status || "—"}</div>
        </div>
        <div class="details-notes">${notes}</div>
      </td>
    `;

    tr.addEventListener("click", () => {
      const isOpen = tr.classList.contains("open");
      document.querySelectorAll("#netTable tr.row.open").forEach(r => r.classList.remove("open"));
      document.querySelectorAll("#netTable tr.details-row.open").forEach(r => r.classList.remove("open"));
      if (!isOpen) {
        tr.classList.add("open");
        details.classList.add("open");
      }
    });

    body.appendChild(tr);
    body.appendChild(details);
  });
}

document.getElementById("netSearchBox").addEventListener("input", (e) => {
  netSearchTerm = e.target.value;
  renderNetworking();
});

// ── Upskill page ──────────────────────────────────────────────────────────
const CERT_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 3 7l9 5 9-5-9-5Z"/><path d="M3 7v6l9 5 9-5V7"/></svg>`;

function renderCertificates() {
  const el = document.getElementById("certGrid");
  el.innerHTML = "";
  if (!UPSKILL.certificates.length) {
    el.innerHTML = '<p class="cert-empty">No certificates yet — the first one you earn will show up here.</p>';
    return;
  }
  UPSKILL.certificates.forEach(c => {
    const card = document.createElement("div");
    card.className = "cert-card";
    card.innerHTML = `
      <div class="cert-icon">${CERT_ICON}</div>
      <div>
        <p class="cert-name">${c.name}</p>
        <p class="cert-date">Earned ${c.earnedDate}</p>
      </div>
    `;
    el.appendChild(card);
  });
}

function renderStudyOrder() {
  const note = document.getElementById("studyOrderNote");
  const list = document.getElementById("studyList");
  list.innerHTML = "";
  if (!UPSKILL.studyOrder.length) {
    note.textContent = "No study plan on file yet — run /upskill to generate one.";
    return;
  }
  note.textContent = `From the ${UPSKILL.reportDate} upskill report, ranked by priority.`;
  UPSKILL.studyOrder.forEach(item => {
    const li = document.createElement("li");
    li.className = "study-item";
    li.innerHTML = `
      <div class="study-rank">${item.rank || "–"}</div>
      <div class="study-body">
        <p class="study-topic">${item.topic}</p>
        <div class="study-meta">
          <span class="study-type">${item.type}</span>
          <span class="study-time">${item.time}</span>
        </div>
        <p class="study-note">${item.note}</p>
      </div>
    `;
    list.appendChild(li);
  });
}

function renderGapHeatmap() {
  const list = document.getElementById("gapList");
  list.innerHTML = "";
  if (!UPSKILL.gapHeatmap.length) {
    list.innerHTML = '<p class="upskill-empty">No gap heatmap on file yet — run /upskill to generate one.</p>';
    return;
  }
  UPSKILL.gapHeatmap.forEach(g => {
    const statusKey = PRIORITY_STATUS[(g.priority || "").toLowerCase()] || "evaluated";
    const colorVar = `var(--${statusKey === "evaluated" ? "ink-faint" : statusKey})`;
    const li = document.createElement("li");
    li.className = "gap-item";
    li.style.setProperty("--gap-color", colorVar);
    li.innerHTML = `
      <div class="gap-top">
        <span class="gap-priority">${g.priority}</span>
        <span class="gap-skill">${g.skill}</span>
      </div>
      <p class="gap-source">${g.source}</p>
    `;
    list.appendChild(li);
  });
}

renderHomeRings();
renderNextStepsTabs();
renderNextSteps();
renderThresholds();
renderChart();
renderStatusFilters();
renderTable();
renderChannelFilters();
renderNetworking();
renderCertificates();
renderStudyOrder();
renderGapHeatmap();
</script>
"""


def main():
    out_path = Path(sys.argv[1]) if len(sys.argv) > 1 else REPO_ROOT / "dashboard.html"
    applications = build_applications(read_csv(REPO_ROOT / "job_search_tracker.csv"))
    networking = build_networking(read_csv(REPO_ROOT / "networking_tracker.csv"))
    next_steps = build_next_steps(read_csv(REPO_ROOT / "next_steps.csv"))
    upskill = build_upskill(REPO_ROOT / "upskill")
    html = render(applications, networking, next_steps, upskill)
    out_path.write_text(html, encoding="utf-8")
    print(
        f"Wrote {out_path} ({len(applications)} applications, {len(networking)} networking contacts, "
        f"{len(next_steps)} open next steps, {len(upskill['certificates'])} certificates)"
    )


if __name__ == "__main__":
    main()
