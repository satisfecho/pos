# Align AGENTS.md and cursor-rule task paths to agents2

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Live agent queue is **`agents2/tasks/`** / **`agents2/TASKS-README.md`**, but root **`AGENTS.md`** still tells agents to sync/edit **`agents/tasks/`**. Two always-applied cursor rules also name the legacy path. Agents following AGENTS.md alone look in the wrong tree. Sibling NEWs already cover **`docs/agent-loop.md`** and **`docs/agent-cursor-rules.md`** — not these files.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23: `SIGNAL docs_stale×14` already owned; queue-health / path-drift scan under NEW≈51
- `rg 'agents/tasks' AGENTS.md` — Branches bullet still says task markdown under **`agents/tasks/`**
- `.cursor/rules/agent-response-language.mdc` and `.cursor/rules/security-untrusted-input-no-exfiltration.mdc` still cite **`agents/tasks/`** for the live queue
- Related open: **`NEW-0-20260723-0752-align-agent-loop-paths-to-agents2`** (agent-loop only); **`NEW-0-20260722-1412-fix-agent-cursor-rules-task-paths`** (agent-cursor-rules catalog only)

## High-level instructions for coder

- In **`AGENTS.md`**, change active-queue wording from **`agents/tasks/`** → **`agents2/tasks/`** (and point at **`agents2/TASKS-README.md`** if a README is mentioned)
- In the two cursor rules above, name **`agents2/tasks/`** for the live queue (keep any intentional “do not put secrets in task files” meaning; do not weaken security wording)
- Do **not** rewrite **`docs/agent-loop.md`** here (owned by sibling NEW); do not touch product code
- Optional one-line comment fix in **`scripts/move-agent-task-to-done.sh`** usage examples to show **`agents2/tasks/`** paths (script already accepts any path)
- Pass/fail: `rg 'agents/tasks' AGENTS.md` has no active-queue hits; same for the two `.mdc` files unless a deliberate legacy note remains
