---
## Closing summary (TOP)

- **What happened:** Tenant 1 demo waitlist and Satisfecho Delivery orders were empty even though tables, products, and delivery settings checks still passed.
- **What was done:** Local `reset_demo_data` restored tenant-1 waitlist mix, Delivery samples, and the demo courier; `seed_demo_orders` now gap-fills Delivery rows when table orders already exist; docs and changelog updated. amvara9 daily reset was already documented.
- **What was tested:** All five `check_demo_*` modules exited 0 (waitlist 3 waiting + 1 notified; 9 Delivery orders; tables/products/settings OK); public `/waitlist/1` and `/delivery/1` returned 200. Staff UI Puppeteer not run (no demo credentials in tester env). Overall PASS.
- **Why closed:** All pass/fail criteria met for the local/dev live-data incident; no GitHub issue (0).
- **Closed at (UTC):** 2026-10-04 17:18
---

# Restore tenant 1 demo waiting list and Satisfecho Delivery orders

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Status
- **WIP → UNTESTED** after local restore + seed gap-fill (2026-10-04)
- **TESTING → CLOSED** after tester PASS (2026-10-04 17:18 UTC)

## Problem / goal

Demo restaurant (tenant 1) has **zero** waiting-list rows and **zero** `order_channel=satisfecho_delivery` orders. Staff Waitlist, public `/waitlist/1`, the Delivery tab, kitchen Satisfecho Delivery cards, and courier Mine look empty even though tables, products, and delivery fee/zone checks still pass. Seeds and `reset_demo_data` already exist; the live DB is out of the documented demo mix.

## Evidence (008 preflight / review)

- Digest `2026-10-04T17:12:24Z`: `SIGNAL demo_waiting_list_check=fail`, `SIGNAL demo_delivery_orders_check=fail`; `demo_tables_check=ok`, `demo_products_check=ok`, `demo_delivery_settings_check=ok`; `G008_NEW_BACKLOG_PAUSE=0`; no open repair owner
- Live checks (dev compose `back`): waiting=0, notified=0, total=0; Satisfecho Delivery orders got 0, need ≥1
- Repair path: `python -m app.seeds.reset_demo_data` (or `seed_demo_waiting_list` when the waitlist table is empty). **Do not rely on `seed_demo_orders` alone** if tenant 1 already has table orders — that seed is idempotent and skips when any order exists
- Archived seed/check work is **CLOSED** (July/Sept); this is a **live data** incident, not a missing module
- Open queue: only unrelated `FEAT-388-…-remove-redundant-products-category-buttons.md`

## High-level instructions for coder

- Restore tenant **1 only**. Prefer `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python -m app.seeds.reset_demo_data` (clears tenant-1 orders/reservations/waiting-list, then re-seeds including waitlist + Delivery samples). Production: existing `scripts/reset-demo-data-on-server.sh` / documented amvara9 cron — do not invent a new cron unless ops is actually missing
- If full reset is too heavy and waitlist is empty, `python -m app.seeds.seed_demo_waiting_list` is enough for that SIGNAL. Delivery samples still need `reset_demo_data` (or equivalent) when table orders already exist
- Do **not** add new seed modules unless reset/seed is broken; do not touch other tenants; do not wipe tables/products/users
- Confirm `docs/0001-ci-cd-amvara9.md` daily reset is documented; if local/dev is the only failing env, fix local data and note that in the task
- Tester pass/fail: `python -m app.seeds.check_demo_waiting_list` exit 0 (≥1 waiting and ≥1 notified); `python -m app.seeds.check_demo_delivery_orders` exit 0 (≥1 Satisfecho Delivery order); `check_demo_tables` / `check_demo_products` / `check_demo_delivery_settings` still OK

## Coder notes

- **Local/dev only for this run.** `reset_demo_data` on the dev compose `back` container: tenant 1 had **0** orders, **0** waitlist rows, and **no** courier user. Reset created 49 orders (table + Delivery), 37 reservations, 4 waitlist entries (3 waiting + 1 notified), and the missing demo courier. Tables/products/delivery fee-zone were already OK and were not wiped.
- **amvara9 daily reset** is already documented in `docs/0001-ci-cd-amvara9.md` (`scripts/reset-demo-data-on-server.sh`, 04:00 cron). No new cron. This incident was the local DB, not a missing production job.
- **Seed gap-fill (no new module):** `seed_demo_orders` still skips when Delivery samples already exist. If tenant 1 has table orders but **zero** `satisfecho_delivery` rows, it now seeds Delivery samples only (does not delete table orders). Docs: `docs/testing.md`, `docs/0053-satisfecho-delivery-order-channel.md`. Changelog `[Unreleased]` Fixed.

## Testing instructions

### What to verify

- Tenant **1** has a demo waitlist mix (≥1 `waiting` and ≥1 `notified`).
- Tenant **1** has ≥1 `order_channel=satisfecho_delivery` order.
- Tables, products, and delivery fee/zone checks still pass (T01–T10, demo product names, fee/postal).
- Optional UI: public `/waitlist/1` and `/delivery/1` load; staff Waitlist and Delivery tab show sample rows.

### How to test

From repo root, with `docker compose -f docker-compose.yml -f docker-compose.dev.yml` up. HAProxy host port is whatever `docker compose ps` shows (often `4202`; this workspace mapped `127.0.0.1:14202`).

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python -m app.seeds.check_demo_waiting_list
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python -m app.seeds.check_demo_delivery_orders
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python -m app.seeds.check_demo_tables
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python -m app.seeds.check_demo_products
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python -m app.seeds.check_demo_delivery_settings
```

Optional HTTP:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:14202/waitlist/1
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:14202/delivery/1
```

Optional Puppeteer (`docs/testing.md`): `BASE_URL=<haproxy> TENANT_ID=1 npm run test:waiting-list --prefix front` (needs staff `LOGIN_EMAIL` / `LOGIN_PASSWORD` or `DEMO_LOGIN_*` for the staff Waitlist tab). Do not paste credentials into this file.

Gap-fill (optional): if Delivery rows are deleted but table orders remain, `python -m app.seeds.seed_demo_orders` should recreate Delivery samples without wiping table orders.

Do **not** run `reset_demo_data` on production unless ops explicitly wants a tenant-1 wipe; local restore is already done.

### Pass/fail criteria

- **Pass:** all five `check_demo_*` modules above exit **0**. Waitlist: ≥1 waiting and ≥1 notified. Delivery: ≥1 Satisfecho Delivery order. Tables/products/settings still OK.
- **Fail:** any check exits 1, or waitlist/Delivery UI for tenant 1 is still empty after the checks pass (stale client). Other tenants must be unchanged.

## Test report

1. **Date/time (UTC) and log window:** Verification started **2026-10-04 17:16:42 UTC**; finished **2026-10-04 17:18:00 UTC**. Container logs reviewed with `docker logs --since 15m` for `pos-back`, `pos-front`, `pos-haproxy`.
2. **Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml`; HAProxy `127.0.0.1:14202->4202/tcp`; `BASE_URL=http://127.0.0.1:14202`; branch **`development`** (synced with `./scripts/git-sync-development.sh`, already up to date). Local/dev only — production/amvara9 not in scope. GitHub issue **0** (no issue comment/labels).
3. **What was tested:** Tenant 1 demo waitlist mix; Satisfecho Delivery orders; tables T01–T10; demo products; delivery fee/zone; optional HTTP shells for `/waitlist/1` and `/delivery/1`. Staff Waitlist/Delivery tab Puppeteer not run (no `DEMO_LOGIN_*` / `LOGIN_*` in `config.env`; host has no `npm`; front container has no Chrome).
4. **Results:**
   - Tenant 1 waitlist ≥1 waiting and ≥1 notified — **PASS** — `check_demo_waiting_list` exit 0: `3 waiting, 1 notified (total=4)`.
   - Tenant 1 ≥1 `order_channel=satisfecho_delivery` — **PASS** — `check_demo_delivery_orders` exit 0: `9` orders (`4` with `courier_user_id`).
   - Tables T01–T10 still OK — **PASS** — `check_demo_tables` exit 0.
   - Demo products still OK — **PASS** — `check_demo_products` exit 0: `all 10 demo products`.
   - Delivery fee/zone still OK — **PASS** — `check_demo_delivery_settings` exit 0: `fee_cents=250`, `postal_codes=['28001', '28013']`.
   - Optional public pages load — **PASS** — `GET /waitlist/1` and `GET /delivery/1` both HTTP **200**.
   - Contrast (UI chrome) — **N/A** — no colour/branding change in this task.
5. **Overall:** **PASS**
6. **Product owner feedback:** The local demo restaurant again has a mixed waitlist queue and Satisfecho Delivery sample orders, so Waitlist and Delivery demos are usable without wiping tables or products. The five `check_demo_*` modules are the right gate for this live-data incident. Staff UI row rendering was not exercised in this run because demo staff credentials are not in the tester environment.
7. **URLs tested:**
   1. `http://127.0.0.1:14202/` (200)
   2. `http://127.0.0.1:14202/waitlist/1` (200)
   3. `http://127.0.0.1:14202/delivery/1` (200)
   4. `http://127.0.0.1:14202/api/public/tenants/1` (200, tenant id=1 Demo Restaurant)
   5. `http://127.0.0.1:14202/api/public/tenants/1/menu` (200)
8. **Relevant log excerpts**

```
# check_demo_* (compose exec back), 2026-10-04 17:16:54 UTC
OK: tenant 1 has 3 waiting, 1 notified waiting-list entries (total=4).
OK: tenant 1 has 9 order_channel=satisfecho_delivery order(s).
  (4 with courier_user_id assigned)
OK: tenant 1 has T01–T10 with correct seat counts.
OK: tenant 1 has all 10 demo products (10 total products).
OK: tenant 1 delivery settings fee_cents=250, postal_codes=['28001', '28013'], radius_meters=None.

# pos-haproxy
172.23.0.1 ... "GET /waitlist/1 HTTP/1.1" 200
172.23.0.1 ... "GET /delivery/1 HTTP/1.1" 200

# pos-back
INFO: ... "GET /public/tenants/1 HTTP/1.1" 200 OK
INFO: ... "GET /public/tenants/1/menu HTTP/1.1" 200 OK

# pos-front (since 15m): no TS/NG compile errors
```

