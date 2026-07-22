# Fix agent-cursor-rules task path (agents2)

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`docs/agent-cursor-rules.md` Related section still points at **`agents/tasks/README.md`**, but the active agent pipeline and **008** task queue live under **`agents2/tasks/`** with **`agents2/TASKS-README.md`**. Agents following the catalog land on a stale or wrong README and miss current status conventions.

## Evidence (008 preflight / review)

- Doc age >90d; unqueued while other stale docs were marked (continuation of `docs_stale` sweep)
- Catalog table already lists all 14 `.cursor/rules/*.mdc` files (no missing rule rows)
- Wrong Related link: `agents/tasks/README.md` vs live **`agents2/TASKS-README.md`** / **`agents2/tasks/`**
- Preflight: weekly_due + high NEW backlog → keep this a one-file path fix (no bulk agent-loop rewrite)

## High-level instructions for coder

- Update the Related bullet in **`docs/agent-cursor-rules.md`** to **`agents2/TASKS-README.md`** (task status pipeline) and mention **`agents2/tasks/`** as the active queue if helpful in one line.
- Optionally add a one-line note that legacy **`agents/tasks/`** may still appear in older docs — do **not** rewrite all of **`docs/agent-loop.md`** in this task.
- Pass criteria: Related links resolve to the agents2 README; rule category table unchanged unless a real `.mdc` is missing (verify with `ls .cursor/rules`).
