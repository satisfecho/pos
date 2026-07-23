# Archive superseded demo-tables repair NEW

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`NEW-0-20260712-1614-repair-demo-tables-t01-t10.md`** is marked superseded by **#305** / **`CLOSED-305-20260723-0621-missing-tables.md`**, but it still sits in the root **NEW** queue. That inflates **NEW≈50**, keeps preflight/meta tasks pointing at a dead owner, and risks a second coder re-touching `seed_demo_tables` after the repair already shipped.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23: `demo_tables_check=ok`; `SIGNAL docs_stale×14` already owned — investigating queue health under deep NEW backlog
- Root task still present with banner: “Superseded by FEAT-305 / … Do **not** implement again”
- **CLOSED-305** asked to close/supersede that NEW once the FEAT shipped; archive under **`agents2/tasks/done/`** never happened
- Sibling **`NEW-0-20260722-2120-preflight-skip-demo-tables-when-queued.md`** still cites the superseded NEW as the repair owner

## High-level instructions for coder

- Rename **`NEW-0-20260712-1614-repair-demo-tables-t01-t10.md`** → **`CLOSED-0-20260712-1614-repair-demo-tables-t01-t10.md`** (keep original `YYYYMMDD-HHMM-slug`; only change status prefix)
- Prepend a short **Closing summary**: superseded by **#305** / archived CLOSED-305; no separate implementation; `check_demo_tables` now OK
- Move with **`./scripts/move-agent-task-to-done.sh agents2/tasks/CLOSED-0-20260712-1614-repair-demo-tables-t01-t10.md`**
- In **`NEW-0-20260722-2120-preflight-skip-demo-tables-when-queued.md`**, retarget “repair owner” wording to **CLOSED-305** / any future fail + open repair task (do not block that preflight task on this archive)
- Do **not** change `seed_demo_tables` / product seeds; do **not** reopen #305
- Pass criteria: superseded NEW absent from root `agents2/tasks/`; present under `done/2026/07/12/` (or the date folder from its filename); root NEW count drops by 1; `check_demo_tables` still exit 0
