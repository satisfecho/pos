# Seed demo tenant 1 Satisfecho Delivery zone/fee settings

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**2.1.32** added tenant `delivery_fee_cents` / `delivery_radius_meters` / `delivery_postal_codes` and checkout validation, but **demo seeds / `reset_demo_data` never set them** for tenant 1. After daily reset, Settings → Payments and public `/delivery/1` show **fee 0** and **no zone**, so demos of fee display and postal rejection require manual setup each time.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T21:03Z: follow-on from shipped **CLOSED-306** / changelog **2.1.32**; demo_tables_check=ok; Delivery **orders** already seeded (2.1.30)
- `rg delivery_fee|delivery_postal|delivery_radius back/app/seeds` → no matches
- Sibling **`NEW-0-20260723-2004-check-demo-satisfecho-delivery-orders`** / courier seed NEWs own **orders/users** — do **not** merge; this task is **tenant delivery settings** only
- Sibling **`NEW-0-20260723-2027-refresh-0001-daily-demo-reset-scope`** owns **docs/0001** wording — optional one-line mention of fee/zone seed if this lands first

## High-level instructions for coder

- In demo seed / `reset_demo_data` path for **tenant 1 only**, set a small demo fee (e.g. 250 cents) and at least one allowed postal code (and/or a modest radius if lat/lng already exist) so public checkout shows a fee and rejects an out-of-zone code
- Keep idempotent and safe on amvara9 daily reset; do not change other tenants
- Optionally add a tiny check helper (or extend an existing `check_demo_*`) asserting fee/postal are non-empty for tenant 1
- Pass/fail: after `python -m app.seeds.reset_demo_data`, tenant 1 has non-zero fee or configured postal/radius; `/delivery/1` address step shows fee (manual or smoke); other tenants untouched
