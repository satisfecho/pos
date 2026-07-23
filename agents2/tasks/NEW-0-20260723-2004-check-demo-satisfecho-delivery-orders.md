# Assert demo Satisfecho Delivery samples in seed check

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Tenant 1 now seeds a Satisfecho Delivery order mix on reset, but **`check_demo_tables`** (and preflight) only verify T01–T10. A regression that drops delivery seeding still reports `demo_tables_check=ok`, so ops and **008** miss empty Delivery/courier demos until a human opens the UI.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T20:04Z: SIGNAL docs/changelog owned; `demo_tables_check=ok` after **2.1.30** Delivery seed — no automated count check
- CLOSED-1952 testing used ad-hoc SQL `count(*) … order_channel='satisfecho_delivery'`; not wired into a seed check module
- `docs/testing.md` documents `seed_demo_orders` Delivery mix but only lists `check_demo_tables` under demo checks
- Sibling **`NEW-0-20260723-2004-seed-demo-courier-user-tenant-1`** owns courier user creation — this task owns the **assertion** only

## High-level instructions for coder

- Extend **`check_demo_tables`** **or** add `python -m app.seeds.check_demo_delivery_orders` (exit 0/1) that asserts tenant 1 has ≥1 (or the documented seed minimum) `order_channel=satisfecho_delivery` rows after a normal demo state
- Document the one-liner next to existing demo checks in **`docs/testing.md`** / **`AGENTS.md`** Demo tables section
- Optional: soft-warn (non-fail) when no courier is assigned if courier-user seed is still open — prefer fail only on missing delivery orders
- Pass/fail: after `reset_demo_data`, the new check exits 0; with delivery rows deleted, exits 1; no product UI changes
