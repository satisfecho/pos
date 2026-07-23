# Fix 0025 one-empty-table scenario seat math

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`docs/0025-test-scenario-one-empty-table.md`** says demo seat total is `10×4 + 10×2 … = 30`. That formula equals **60**, while the parenthetical (T01–T05 = 4, T06–T10 = 2) correctly implies **5×4 + 5×2 = 30**. Agents and testers copying the formula get the wrong capacity for overbooking checks.

## Evidence (008 preflight / review)

- `SIGNAL docs_stale` — **`docs/0025-test-scenario-one-empty-table.md`** untouched >90d
- Demo table contract (AGENTS.md / `check_demo_tables`): T01–T05 four seats, T06–T10 two seats → **30** seats
- Scenario still points at `python -m app.seeds.check_overbooking_0025` (module exists); **`docs/testing.md`** has no overbooking/0025 entry

## High-level instructions for coder

- Fix the seat arithmetic line in **`docs/0025-test-scenario-one-empty-table.md`** to **`5×4 + 5×2 = 30`** (keep T01–T10 naming)
- Optionally add one line under Test scripts in **`docs/testing.md`** for `docker compose exec back python -m app.seeds.check_overbooking_0025` (and/or the unittest) — do not conflict with **NEW-0-20260722-1142-index-courier-delivery-smokes-in-testing-doc** beyond a single overbooking bullet
- Do not change product overbooking logic unless the checker fails after the doc fix (then file separately)
- Pass criteria: doc math matches demo seat totals; optional testing.md line copy-pastable
