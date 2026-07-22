# Preflight: SIGNAL when NEW task backlog is deep

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

008 guidance says to defer large **FEAT-*** when the queue is heavy, but preflight only emits `SIGNAL task_backlog` for **WIP+TESTING > 8**. A deep **NEW** pile (currently **36**) does not signal, so weekly sweeps keep adding more doc-hygiene NEWs while demo repair and other older NEWs sit unstarted. Operators and the agent loop need an explicit backlog pause signal.

## Evidence (008 preflight / review)

- Digest: `NEW=36 FEAT=0 WIP=1 UNTESTED=0 TESTING=0` — no `SIGNAL task_backlog`
- Code: only `wip_n + testing_n > 8` increments `G008_TASK_SIGNALS`
- Same-day 008 runs already queued dozens of NEW doc-status tasks; SIGNAL `docs_stale` / `demo_tables_check` remain owned by earlier NEWs

## High-level instructions for coder

- In `scripts/enhancement-reviewer-preflight.sh`, when `NEW` root task count exceeds a threshold (suggest **20**, document in a one-line comment), emit e.g. `SIGNAL task_backlog new=${new_n} (prefer drain NEW before more FEAT/doc tasks)` and increment `G008_TASK_SIGNALS`
- Optionally print a soft hint in the task-queue section even below threshold; SIGNAL only above threshold
- Do not auto-delete or close tasks; signal only
- Align wording with existing WIP+TESTING backlog SIGNAL
- Pass criteria: with NEW≥20, readonly preflight shows the new SIGNAL; with NEW low, it does not
