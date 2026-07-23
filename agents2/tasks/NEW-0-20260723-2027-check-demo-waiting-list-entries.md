# Assert demo waiting-list entries in seed check

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Tenant 1 now seeds a waiting-list sample queue on reset (**2.1.31** / `seed_demo_waiting_list`), but **`check_demo_tables`** (and 008 preflight) only verify T01–T10. A regression that skips waiting-list seeding still reports `demo_tables_check=ok`, so staff Waitlist and public `/waitlist/1` can go empty until a human notices.

## Evidence (008 preflight / review)

- Digest 2026-07-23T20:26Z: `demo_tables_check=ok`; waiting-list seed shipped; live DB has 4 `waiting_list_entry` rows for tenant 1
- `docs/testing.md` documents **seed** `seed_demo_waiting_list` but no exit 0/1 **check** module
- Sibling **`NEW-0-20260723-2004-check-demo-satisfecho-delivery-orders`** owns the Delivery order assertion — this task owns the **waiting-list** assertion only
- CLOSED-2014 seed task is archived; no open task covers `check_demo_waiting_list`

## High-level instructions for coder

- Add `python -m app.seeds.check_demo_waiting_list` (or extend an existing demo check) that asserts tenant 1 has ≥ the seed minimum (e.g. ≥1 `waiting` and ≥1 `notified`, or ≥4 total matching `DEMO_ENTRIES`) after a normal demo state; exit 0/1
- Document the one-liner next to the Demo waiting list seed bullet in **`docs/testing.md`** and the Demo reset blurb in **`AGENTS.md`**
- Optional: call the check from **`scripts/enhancement-reviewer-preflight.sh`** as a soft SIGNAL when it fails (do not block if back container is down)
- Pass/fail: after `reset_demo_data`, check exits 0; with all tenant-1 waiting-list rows deleted, exits 1; no product UI changes
