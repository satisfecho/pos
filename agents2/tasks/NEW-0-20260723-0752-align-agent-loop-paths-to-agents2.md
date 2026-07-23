# Align docs/agent-loop.md task paths to agents2

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Live agent queue and README are **`agents2/tasks/`** / **`agents2/TASKS-README.md`**, but **`docs/agent-loop.md`** still mixes legacy **`agents/tasks/`** paths (tables, archive layout, `gh` comment examples, checklist). New agents following the loop doc create or look for tasks in the wrong tree. Sibling **`NEW-0-20260722-1412-fix-agent-cursor-rules-task-paths`** fixed only **`docs/agent-cursor-rules.md`** and explicitly deferred a full agent-loop rewrite — this task owns that follow-up.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23: `SIGNAL docs_stale` basenames already queued; agent-loop path drift is an unqueued theme
- `rg 'agents/tasks' docs/agent-loop.md` — many hits; 008 row correctly says **`agents2/tasks/`** while 001/002/archive sections still say **`agents/tasks/`**
- Orchestrator scripts live under **`agents2/`** (`pos-cursor-loop.sh`); `move-agent-task-to-done.sh` should be documented against the active queue path
- High NEW backlog → keep scope to **path/name corrections + one-line legacy note**, not a redesign of the loop

## High-level instructions for coder

- In **`docs/agent-loop.md`**, replace active-queue references from **`agents/tasks/`** → **`agents2/tasks/`** (and **`agents/tasks/README.md`** → **`agents2/TASKS-README.md`** where it means the live pipeline)
- Keep historical mac-stats / “sources used as basis” wording that intentionally cites upstream `agents/` layouts; add one short note that POS active queue is **`agents2/tasks/`**
- Align archive examples and `move-agent-task-to-done.sh` invocations to **`agents2/tasks/`** (or state the script accepts the path you pass)
- Do **not** edit product code; do **not** reopen **`docs/agent-cursor-rules.md`** unless a cross-link is broken
- Pass/fail: a contributor following agent-loop alone lands on **`agents2/tasks/`**; `rg 'agents/tasks' docs/agent-loop.md` only hits intentional legacy/source mentions
