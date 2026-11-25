---
## Closing summary (TOP)

- **What happened:** Daily demo reset for tenant 1 failed on `order_payment_item_order_item_id_fkey` when deleting `orderitem` before split-payment child rows.
- **What was done:** `reset_demo_data` now deletes `order_payment_item` then `order_payment` for tenant 1 before `orderitem` / `order`; explicit deletes required because live FKs lack CASCADE.
- **What was tested:** Local reset with seeded blocking payment lines exited 0, no FK ERROR in `pos-postgres`, demo delivery/waiting-list checks passed, tables/products/users preserved - **PASS**.
- **Why closed:** All pass/fail criteria met; tester overall **PASS**.
- **Closed at (UTC):** 2026-11-25 20:02
---

# Demo reset: orderitem delete hits order_payment_item FK

## GitHub Issues
- None (log incident). Use issue **0**.

## Problem / goal
Daily demo data reset for tenant 1 fails partway: PostgreSQL logs show

`ERROR: update or delete on table "orderitem" violates foreign key constraint "order_payment_item_order_item_id_fkey" on table "order_payment_item"`

Observed around **04:00 UTC** on consecutive days (e.g. 2026-11-24 and 2026-11-25). `app.seeds.reset_demo_data` deletes `orderitem` (and orders) without first deleting `order_payment_item` (and likely related payment rows added by split-payment migration `20260726180000_order_payment_split.sql`).

Digest heuristic also showed stale `role "postgres" does not exist` from 2026-11-10 - that is **not** in scope (0 hits in last 7d; wrong role name for this DB).

## High-level instructions for coder
- Read `back/app/seeds/reset_demo_data.py` and the `order_payment` / `order_payment_item` schema.
- Extend the reset delete order so payment-line children are removed before `orderitem` / `order` deletes (tenant 1 only), matching other child cleanup already in the script.
- Keep the seed idempotent and safe while the stack is up; do not wipe tables/products/users.
- Verify with a local `python -m app.seeds.reset_demo_data` (or compose exec) and confirm `pos-postgres` no longer logs that FK error for the run.
- Work on **`development`**. No secrets in commits.

## Status
- **WIP** started 2026-11-25 (UTC).
- **Implemented:** `reset_demo_data` now deletes `order_payment_item` then `order_payment` for tenant 1 before `orderitem` / `order`. Live DB FKs lack `ON DELETE CASCADE` despite migration text (`CREATE TABLE IF NOT EXISTS`), so explicit deletes are required.
- Verified locally: reset removed 2 payment items + 2 payments, then orders; `pos-postgres` had no FK ERROR for the run.

## Testing instructions

### What to verify
- `python -m app.seeds.reset_demo_data` completes for tenant 1 without
  `order_payment_item_order_item_id_fkey` (or related payment FK) errors.
- Tables, products, and users are not wiped; demo orders/reservations/waiting list are re-seeded.

### How to test
From repo root with the stack up (`docker-compose.yml` + `docker-compose.dev.yml`):

```bash
# Optional: ensure tenant 1 has payment lines that would block the old path
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -c "
from sqlalchemy import text
from app.db import engine
with engine.connect() as c:
    print(c.execute(text('SELECT count(*) FROM order_payment_item WHERE tenant_id=1')).scalar())
"

docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python -m app.seeds.reset_demo_data

docker logs pos-postgres --since 5m 2>&1 | grep -iE 'order_payment_item_order_item_id_fkey|foreign key constraint' || echo OK_no_fk

docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python -m app.seeds.check_demo_delivery_orders
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python -m app.seeds.check_demo_waiting_list
```

### Pass/fail criteria
- **Pass:** Reset exits 0; stdout shows payment items/payments removed (when present); no `order_payment_item` FK ERROR in `pos-postgres` logs; demo checks exit 0.
- **Fail:** Reset raises / rolls back on `order_payment_item_order_item_id_fkey`, or postgres logs that FK error during the run.

## Test report

1. **Date/time (UTC):** 2026-11-25T20:01:31Z start → 2026-11-25T20:01:55Z end. Log window: `pos-postgres --since 5m` covering the reset run.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; containers `pos-back`, `pos-postgres` healthy; branch `development` (synced). No browser / `BASE_URL` N/A.
3. **What was tested:** Demo reset deletes `order_payment_item` / `order_payment` before `orderitem` / `order` for tenant 1; no FK violation; demo delivery + waiting-list re-seed; tables/products/users preserved.
4. **Results:**
   - Seed blocking payment lines first: **PASS** - inserted 1 `order_payment` + 1 `order_payment_item` for tenant 1 (would block old delete path).
   - `reset_demo_data` exit 0: **PASS** - stdout: `removed 49 orders, 116 order items, 1 payment items, 1 payments, ...` then re-seeded orders/reservations/waiting list.
   - No `order_payment_item_order_item_id_fkey` / FK ERROR in `pos-postgres`: **PASS** - `OK_no_fk`.
   - `check_demo_delivery_orders` exit 0: **PASS** - 9 `satisfecho_delivery` orders.
   - `check_demo_waiting_list` exit 0: **PASS** - 3 waiting, 1 notified.
   - Tables/products/users not wiped: **PASS** - tables=12, products=18, users=5 after reset; payment rows cleared (opi=0, op=0).
5. **Overall:** **PASS**
6. **Product owner feedback:** Daily demo reset no longer dies on split-payment FK children. Payment lines are cleared first, then orders rebuild as before, so the 04:00 UTC cron should stay green for this failure mode.
7. **URLs tested:** N/A - no browser
8. **Relevant log excerpts:**
   ```
   Tenant 1: removed 49 orders, 116 order items, 1 payment items, 1 payments, ...
   Demo data reset and re-seeded.
   RESET_EXIT=0
   OK_no_fk
   OK: tenant 1 has 9 order_channel=satisfecho_delivery order(s).
   OK: tenant 1 has 3 waiting, 1 notified waiting-list entries (total=4).
   ```
