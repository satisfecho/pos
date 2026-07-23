# Fix docs/README agent-loop blurb to agents2

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`docs/README.md`** Reference row for **`agent-loop.md`** still says the multi-agent workflow uses an **`agents/`** layout. The live queue is **`agents2/tasks/`** (see open path-alignment NEWs for `agent-loop.md` / `AGENTS.md`). Contributors scanning the docs index keep landing on the wrong mental model even after those siblings land.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23: docs_stale SIGNAL basenames already owned; path-drift scan under NEW backlog ≈71
- `docs/README.md` line ~84: “`agents/` layout” in the agent-loop description
- Related open (do **not** duplicate their scopes): **`NEW-0-20260723-0752-align-agent-loop-paths-to-agents2`** (body of agent-loop.md), **`NEW-0-20260723-1138-align-agents-md-task-paths-to-agents2`**

## High-level instructions for coder

- In **`docs/README.md`** only, change the agent-loop row blurb from **`agents/`** → **`agents2/`** (or “`agents2/tasks/` + prompts”) in one short phrase
- Optional: add that legacy **`agents/`** may appear in older notes — one clause max
- Do **not** rewrite **`docs/agent-loop.md`** here (owned by sibling NEW)
- Pass/fail: `rg 'agents/' docs/README.md` has no active-queue “layout” claim; agent-loop row still links `agent-loop.md`
