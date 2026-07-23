# Point move-agent-task-to-done.sh usage examples at agents2/tasks

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Live queue is **`agents2/tasks/`**, but **`scripts/move-agent-task-to-done.sh`** header comments and usage examples still show only **`agents/tasks/…`** and **`agents/tasks/README.md`**. Closers copy the legacy path; the script already accepts both trees, so this is comment/example drift only.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23: agents2 path hygiene follow-up after path NEWs for AGENTS.md / TASKS-README / pos-cursor-loop
- `head` of **`scripts/move-agent-task-to-done.sh`**: lines 2–7 still say `agents/tasks/` and `agents/tasks/README.md`
- Script body already loops `agents/tasks` and `agents2/tasks` (~L41+)
- Sibling **`NEW-0-20260723-1138-align-agents-md-task-paths-to-agents2`** lists an **optional** one-liner on this script — **this task owns the script header/examples**; skip the optional there when this is done
- Sibling **`NEW-0-20260723-1155-fix-tasks-readme-archive-paths-agents2`** owns **TASKS-README.md** examples only — do not merge

## High-level instructions for coder

- In **`scripts/move-agent-task-to-done.sh`** header:
  - Prefer **`agents2/tasks/`** (and **`agents2/TASKS-README.md`**) in the summary and Usage examples
  - Keep one example or note that **`agents/tasks/`** still works via the **`agents → agents2`** symlink / dual-root check
- Do not change move logic unless a comment/path bug is obvious; no product code
- Pass/fail: `head -20 scripts/move-agent-task-to-done.sh` shows **`agents2/tasks/`** as the primary example; script still moves a CLOSED file under agents2
