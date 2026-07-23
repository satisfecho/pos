---
## Closing summary (TOP)

- **What happened:** Daily demo reset only seeded table orders, so tenant 1 had no Satisfecho Delivery samples after reset.
- **What was done:** Extended `seed_demo_orders` with `_seed_demo_delivery_orders` (5 paid + 4 active, optional courier assignment) and documented the mix in docs/0053, seed/reset docstrings, and docs/testing.md.
- **What was tested:** `reset_demo_data` PASS (49 orders); delivery_count=9; `check_demo_tables` OK; no secrets — overall PASS.
- **Why closed:** All acceptance criteria passed; tester overall PASS.
- **Closed at (UTC):** 2026-07-23 19:56
---

# Seed demo Satisfecho Delivery orders (tenant 1)

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Daily demo reset (`reset_demo_data` → `seed_demo_orders` + `seed_demo_reservations`) only creates **table** orders. Tenant 1 never gets `order_channel=satisfecho_delivery` rows, so sales demos of the Delivery tab, courier Mine list, and kitchen “Satisfecho Delivery” cards look empty after every cron/manual reset even though the product is shipped.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T19:52Z: SIGNAL `docs_stale×14` + `changelog_sparse` already owned; `demo_tables_check=ok`; NEW backlog≈106 — product/demo gap, not a bulk doc rewrite
- `back/app/seeds/seed_demo_orders.py`: creates `Order` with `table_id` only; no `OrderChannel.satisfecho_delivery`, `delivery_address`, or `courier_user_id`
- `reset_demo_data.py` re-seeds orders+reservations only; no delivery-specific seed
- `rg` on `agents2/tasks`: no open task owns demo Delivery seed (staff/public Delivery smokes are separate NEWs)

## High-level instructions for coder

- Extend **`seed_demo_orders`** (preferred) or add a small idempotent helper called from **`reset_demo_data`** so tenant 1 gets a **small** mix of Satisfecho Delivery orders after reset (e.g. a few active + a few paid/completed over the report window)
- Set `order_channel=satisfecho_delivery`, `table_id=None`, realistic `delivery_address` / `customer_phone`; optional `courier_user_id` only if a courier-role user already exists for tenant 1 (do not invent passwords or commit secrets)
- Keep idempotent with existing seed rules (reset path already clears tenant 1 orders); do not touch other tenants
- Document one line in **`docs/0053`** or seed module docstring that demo reset includes Delivery samples
- Pass/fail: after `python -m app.seeds.reset_demo_data`, `SELECT count(*) FROM "order" WHERE tenant_id=1 AND order_channel='satisfecho_delivery'` ≥ 1; `check_demo_tables` still OK; no secrets in repo

## Implementation notes (feature coder)

- Extended `back/app/seeds/seed_demo_orders.py` with `_seed_demo_delivery_orders`: 5 paid + 4 active Satisfecho Delivery orders (pending/preparing/ready/out_for_delivery when a courier exists).
- Looks up existing `UserRole.courier` for tenant 1; assigns some orders; never creates users/passwords.
- Documented in `docs/0053-satisfecho-delivery-order-channel.md` § Demo seed, seed/reset docstrings, and `docs/testing.md`.
- No GitHub issue (#0) — skipped issue label/comment.

## Testing instructions

1. From repo root with stack up:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python -m app.seeds.reset_demo_data
   ```
2. Confirm delivery samples exist:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python -c '
   from sqlalchemy import text
   from sqlmodel import Session
   from app.db import engine
   with Session(engine) as s:
       n = s.execute(text("""SELECT count(*) FROM \"order\" WHERE tenant_id=1 AND order_channel='\''satisfecho_delivery'\''""")).scalar()
       print(n)
       assert n >= 1
   '
   ```
   Expect count ≥ 1 (typically 9: 5 paid + 4 active).
3. Tables still OK:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python -m app.seeds.check_demo_tables
   ```
   Expect exit 0 / `OK: tenant 1 has T01–T10…`.
4. Optional UI: staff Delivery tab / kitchen should show Satisfecho Delivery cards; if tenant 1 has a courier user, Mine list may show assigned rows.
5. Pass criteria: steps 2–3 green; no new secrets in the repo.

## Test report

1. **Date/time (UTC):** 2026-07-23 19:55:10–19:55:25 UTC. Log window: `docker logs --since 5m pos-back` / `pos-front`.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; branch `development`; `BASE_URL=http://127.0.0.1:4202` (health only); no GitHub issue (#0).
3. **What was tested:** After `reset_demo_data`, tenant 1 Satisfecho Delivery order count ≥ 1; `check_demo_tables` still OK; docs/docstrings present; no new secrets in seed/docs changes.
4. **Results:**
   - **reset_demo_data** — **PASS** — exit 0; stdout: `created 49 demo orders (table + Satisfecho Delivery paid/active)`; `Demo data reset and re-seeded.`
   - **delivery order count ≥ 1** — **PASS** — `delivery_count=9` (5 paid + 4 active: pending/preparing/ready/out_for_delivery); all `table_id=None`, address/phone set; courier_user_id=1859 on paid/ready/out_for_delivery where assigned.
   - **check_demo_tables** — **PASS** — `OK: tenant 1 has T01–T10 with correct seat counts.`
   - **docs / no secrets** — **PASS** — `docs/0053` § Demo seed, seed/reset docstrings, `docs/testing.md` mention Delivery mix; `rg` found no hardcoded passwords/API keys/private keys in touched seed/docs files.
5. **Overall:** **PASS**
6. **Product owner feedback:** Daily demo reset now leaves tenant 1 with a usable Satisfecho Delivery sample set (paid + kitchen/courier statuses), so Delivery/kitchen/courier demos stay populated after cron or manual reset. Courier assignment only when a courier already exists — correct and safe.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/api/health` (200) — stack sanity only; no staff UI browser pass this run.
8. **Relevant log excerpts:**
   ```
   # reset_demo_data (compose exec stdout)
   Tenant 1: removed 49 orders, 114 order items, ... 37 reservations.
   Tenant 1: created 49 demo orders (table + Satisfecho Delivery paid/active) ...
   Demo data reset and re-seeded.

   # SQL verify
   delivery_count= 9
   (… 5× paid, pending, preparing, ready, out_for_delivery; table_id None)

   # check_demo_tables
   OK: tenant 1 has T01–T10 with correct seat counts.

   # pos-back (window)
   GET /health HTTP/1.1 200 OK
   ```
