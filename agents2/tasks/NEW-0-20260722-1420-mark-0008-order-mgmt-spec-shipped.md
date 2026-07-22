# Mark 0008 order-management spec as shipped design

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`docs/0008-order-management-logic.md` is a large design/spec (session-scoped orders, lifecycle, edge cases) with no status banner. Core behaviour (`session_id` on orders, per-browser isolation) has shipped. Alongside historical **`docs/0007-…`**, agents may treat the whole file as unfinished work or re-implement from the problem statement.

## Evidence (008 preflight / review)

- `SIGNAL docs_stale` continuation — **>90d**, deferred by earlier 2026-07-22 008 sweeps; not covered by a dedicated NEW (0007 historical NEW only references 0008)
- Code: `Order.session_id` / session checks in `back/app/main.py`; item `added_by_session` in models
- `docs/README.md` lists 0008 as live “lifecycle, session rules…” without shipped/design-history cue

## High-level instructions for coder

- Add a short top banner: **shipped core / design reference** — do not re-open the original “shared unpaid order” problem as backlog; treat remaining edge-case sections as reference, not a todo list. Point readers to current code/tests for behaviour.
- Optionally one-line README index tweak (“design reference / shipped session rules”).
- Do **not** bulk-rewrite or renumber the ~1.4k-line spec in this task.
- Pass/fail: banner (and optional README line) clear; no product code changes.
