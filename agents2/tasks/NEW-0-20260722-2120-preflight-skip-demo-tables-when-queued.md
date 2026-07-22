# Preflight: skip demo_tables_check SIGNAL when repair task is already queued

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Preflight always emits `SIGNAL demo_tables_check=fail` when `check_demo_tables` exits non-zero. The repair work is already owned by **`NEW-0-20260712-1614-repair-demo-tables-t01-t10`**, so every agent-loop tick re-wakes **008** on the same owned failure. Mirror the queued-docs skip pattern: keep the check output visible, but do not count an owned fail as a wake SIGNAL.

## Evidence (008 preflight / review)

- Digest: `SIGNAL demo_tables_check=fail (run seed_demo_tables)` every run
- Re-check 2026-07-22T21:20Z: still Missing `T05`/`T07`/`T10`, Wrong `T08` seats (expected 2, got 6) — unchanged; root cause documented on the repair NEW (`run()` skips partial tenants)
- Sibling: **`NEW-0-20260722-1433-preflight-skip-queued-stale-docs.md`** already covers `docs_stale` ownership; demo has no equivalent
- Product repair remains on **`NEW-0-20260712-1614-repair-demo-tables-t01-t10.md`** (and products on **`NEW-0-20260722-1320-repair-demo-products-partial-tenant.md`**)

## High-level instructions for coder

- In `scripts/enhancement-reviewer-preflight.sh`, after a failing `check_demo_tables`, **skip** `SIGNAL demo_tables_check=fail` / `G008_DEMO_SIGNALS` increment if any root `agents2/tasks/{NEW,FEAT,WIP,UNTESTED,TESTING}-*.md` already covers demo-table repair (filename or body mentions `check_demo_tables`, `seed_demo_tables`, or `repair-demo-tables`)
- Still print a non-SIGNAL line such as `demo_tables_check=fail (owned by open task …)` so humans see the health status
- If no open owner exists, keep today’s SIGNAL behaviour
- Do not implement the seed repair in this task
- Pass criteria: with the current repair NEW present, readonly preflight shows fail as informational and does not increment `G008_DEMO_SIGNALS` / wake-only SIGNAL count for that fail; removing/renaming the owner restores SIGNAL
