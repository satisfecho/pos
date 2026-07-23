# Add missing agents2/tasks/done/README.md

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`agents2/TASKS-README.md`** tells contributors to see **`done/README.md`** for the archive tree index, but **`agents2/tasks/done/README.md`** does not exist (only year folders like `2026/`). Closers and humans following the README hit a dead link and miss the `YYYY/MM/DD` layout convention.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23: queue-health scan under NEW≈53; `docs_stale` SIGNAL basenames already owned
- `agents2/TASKS-README.md` § Archiving: “See **`done/README.md`** for a short index of the archive tree.”
- `ls agents2/tasks/done/` → dated year dirs only; no README
- Sibling path fixes: **`NEW-0-20260723-1155-fix-tasks-readme-archive-paths-agents2`** (path strings); this task owns the missing file

## High-level instructions for coder

- Add a short **`agents2/tasks/done/README.md`**: explain `done/<YYYY>/<MM>/<DD>/` from the CLOSED filename’s `YYYYMMDD`, point at **`agents2/TASKS-README.md`**, and show one example `./scripts/move-agent-task-to-done.sh agents2/tasks/CLOSED-….md`
- Keep it to a few paragraphs — not a full agent-loop rewrite
- Optionally fix the TASKS-README “See done/README.md” link to **`agents2/tasks/done/README.md`** if the sibling path-fix NEW has not landed yet (coordinate; avoid duplicate edits)
- Pass/fail: the README exists and a reader can archive a CLOSED task without guessing the folder layout
