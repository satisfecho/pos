# Fix TASKS-README archive paths to agents2

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`agents2/TASKS-README.md`** is the live task-pipeline doc, but its archive section still shows **`agents/tasks/done/…`** and **`move-agent-task-to-done.sh agents/tasks/CLOSED-…`** examples. Coders and closers copy the wrong path into commands and comments. Sibling NEWs update AGENTS.md / agent-loop / cursor-rules — not this file’s body.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23: `SIGNAL docs_stale×14` basenames already owned; NEW backlog≈53 — path hygiene only
- `rg 'agents/tasks' agents2/TASKS-README.md` — archive tree, example CLOSED path, and helper invocation
- Symlink `agents → agents2` makes old paths work today, but the canonical queue is **`agents2/tasks/`**
- Related open: **`NEW-0-20260723-1138-align-agents-md-task-paths-to-agents2`**, **`NEW-0-20260723-0752-align-agent-loop-paths-to-agents2`** (do not merge scopes)

## High-level instructions for coder

- In **`agents2/TASKS-README.md`**, change active-queue and archive examples from **`agents/tasks/`** → **`agents2/tasks/`** (including `done/YYYY/MM/DD` examples and the `move-agent-task-to-done.sh` sample)
- Keep one short note that legacy **`agents/tasks/`** may appear via the **`agents → agents2`** symlink — do not rewrite product docs
- Do **not** edit **`docs/agent-loop.md`** / **`AGENTS.md`** here (owned by sibling NEWs)
- Pass/fail: `rg 'agents/tasks' agents2/TASKS-README.md` has no active-queue hits unless an intentional legacy note remains
