# Repair demo products seed for partial tenants + checker

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Tenant 1 demo hygiene assumes a usable menu for Take Away / public menu / `test-demo-data.mjs` (≥10 products). **`seed_demo_products.run()`** only seeds tenants with **zero** products — same class of bug as **`NEW-0-20260712-1614-repair-demo-tables-t01-t10`**. Locally tenant 1 has **7** catalog-import products and **none** of the ten `DEMO_PRODUCTS` names, so the seeder prints “already have products” and never fills the default demo menu. There is a **`check_demo_tables`** module but **no `check_demo_products`**.

## Evidence (008 preflight / review)

- Sibling SIGNAL: `demo_tables_check=fail` (tables task already queued); products gap found while investigating demo seeds
- `docker compose … exec back` count: tenant 1 products **7**; missing all of Enchiladas…Coffee from `DEMO_PRODUCTS` in `back/app/seeds/seed_demo_products.py`
- `_seed_tenant_products` already creates **by missing name**; `run()` never calls it when the tenant has any product row
- Docs: `AGENTS.md` Demo products; `docs/testing.md` seed/check tables section (products seed only, no checker)

## High-level instructions for coder

- Fix **`seed_demo_products.run()`** so tenants missing any `DEMO_PRODUCTS` name (at least tenant **1**) get `_seed_tenant_products`, not only empty tenants. Keep idempotent; do not delete existing catalog/wine/beer rows
- Add **`back/app/seeds/check_demo_products.py`** (exit 0 when tenant 1 has all `DEMO_PRODUCTS` names, or a clear documented minimum aligned with `test-demo-data.mjs`)
- One-line index under demo seeds in **`docs/testing.md`** / **`AGENTS.md`** Demo products section for the new checker
- Pass criteria: after seed, checker exits **0**; tenant 1 still retains existing non-demo products; `test-demo-data.mjs` product count threshold still met when credentials available
- Append **Testing instructions** when implementation is complete
- Related but separate: **`NEW-0-20260712-1614-repair-demo-tables-t01-t10`** (tables only) — do not merge unless implementing both in one PR intentionally
