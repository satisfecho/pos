# Seed demo courier user for tenant 1

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Satisfecho Delivery demo orders now seed on tenant 1 reset (**2.1.30**), but they only assign `courier_user_id` when a **courier-role user already exists**. Fresh demos and amvara9 after bootstrap rarely have one, so courier **Mine** stays empty and `out_for_delivery` samples never appear — Delivery tab looks populated while courier demos still look broken.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T20:04Z: `SIGNAL docs_stale×14` + `changelog_sparse` already owned; `demo_tables_check=ok`; NEW backlog≈108 — demo hygiene follow-on after CLOSED seed-demo Delivery orders
- `back/app/seeds/seed_demo_orders.py` `_existing_courier_user_id` / docstring: “do not create users”
- `rg` on `back/app/seeds/*.py`: no seed creates `UserRole.courier`
- No open `agents2/tasks` owns demo courier user (staff/public Delivery smokes and CLOSED-1952 seed are separate)

## High-level instructions for coder

- Add an **idempotent** helper (new module or call from `reset_demo_data` / bootstrap path) that ensures tenant 1 has **one** courier-role user when missing
- Prefer env-driven email/password (e.g. `COURIER_TEST_EMAIL` / `COURIER_TEST_PASSWORD` or documented demo defaults already used in courier smokes) — **never** commit live production secrets; document the local defaults in `docs/0053` or `docs/testing.md` one-liners
- Call the helper **before** `_seed_demo_delivery_orders` so assignment and `out_for_delivery` can run
- Do not create couriers on other tenants; do not change product courier APIs
- Pass/fail: after `python -m app.seeds.reset_demo_data`, tenant 1 has ≥1 `UserRole.courier` and ≥1 delivery order with `courier_user_id` set when seed intends assignment; `check_demo_tables` still OK
