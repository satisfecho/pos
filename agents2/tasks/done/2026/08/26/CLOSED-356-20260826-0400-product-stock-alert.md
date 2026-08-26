---
## Closing summary (TOP)

- **What happened:** Issue #356 asked for per-product stock alerts on `/products`, not only on inventory items.
- **What was done:** Added `stock_alert_enabled`, `stock_qty`, and `stock_alert_level` on `Product` (migration, API, form fields); products list shows **Low** / **OK** badges when alert is enabled.
- **What was tested:** Migration applied; landing smoke PASS; Puppeteer verified form save, DB persistence, Low badge (qty ≤ level), OK badge (qty > level); no backend errors; Angular build PASS.
- **Why closed:** All pass–fail criteria met per tester report.
- **Closed at (UTC):** 2026-08-26 04:06
---

# Add a stock alert for each product

## Status
- **CLOSED (2026-08-26):** Verification **PASS** — see Test report below.

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/356
- **356**
- **Discussion:** https://github.com/orgs/satisfecho/discussions/21

## Problem / goal

Stock alerts existed mainly on inventory items. Staff who manage the menu need a stock alert **on each product** where products live (`/products`).

## High-level instructions for coder

- Add `stock_alert_enabled`, `stock_qty`, `stock_alert_level` on `Product` (migration + model + create/update API).
- Expose on Products form and show a low-stock badge in the products list when enabled and `stock_qty <= stock_alert_level`.
- Keep tenant scoping. Do not remove inventory reorder levels.

## Implementation notes

- Migration `20260826040000_product_stock_alert.sql`.
- Fields on `Product` / `ProductUpdate`; validated on create/update in `main.py`.
- Products form: enable checkbox + qty / alert level; list column with OK/Low badge.
- Inventory ingredient reorder levels unchanged.

## Testing instructions

### What to verify
- Edit a product on `/products`: enable stock alert, set current stock and alert level; save.
- List shows stock badge; when qty ≤ level, badge is **Low**.
- Migration applied (`schema_version` includes `20260826040000`).
- Landing still loads.

### How to test
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.migrate --check
# Log in as staff owner → /products → edit product → enable stock alert → save
BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front
```

### Pass–fail criteria
- **PASS:** Fields persist; low badge when qty ≤ level; no Angular build errors; landing smoke PASS.
- **FAIL:** Fields missing, 500 on update, badge wrong, compile errors.

---

## Test report

**Date/time (UTC):** 2026-08-26 04:02–04:05 UTC  
**Log window:** `docker logs --since 15m pos-front pos-back` (same UTC window)

### Environment
- **Branch:** `development` @ `c2ab1c04`
- **Compose:** `docker-compose.yml` + `docker-compose.dev.yml`
- **BASE_URL:** `http://127.0.0.1:4202`

### What was tested
1. Migration `20260826040000_product_stock_alert.sql` applied (`app.migrate --check`).
2. Landing smoke (`npm run test:landing-version --prefix front`).
3. Products UI: enable stock alert, save, verify **Low** badge (qty ≤ level) and **OK** badge (qty > level).
4. Angular build health in `pos-front` logs.
5. DB persistence of stock fields after save.

### Results
| Criterion | Result | Evidence |
|-----------|--------|----------|
| Migration applied (`20260826040000`) | **PASS** | `Database schema version (max applied): 20260826040000`; migration status `applied` |
| Landing smoke | **PASS** | `>>> RESULT: Landing version OK; demo restaurant card OK; demo login (tenant=1) OK; sidebar nav OK.` |
| Stock alert form save + fields persist | **PASS** | DB: `Coffee` qty=3 level=5; `Due.Zero` qty=10 level=5 with `stock_alert_enabled=True` |
| Low badge when qty ≤ level | **PASS** | Puppeteer: `{ text: 'Low 3 / 5', low: true }` on first row after save |
| OK badge when qty > level | **PASS** | Puppeteer: `{ text: 'OK 10 / 5', low: false }` after second save |
| No 500 on product update | **PASS** | No errors in `pos-back` logs for test window |
| Angular build (current state) | **PASS** | Latest: `Application bundle generation complete` at 2026-08-26T04:00:27Z (earlier transient `TS2339 isProductLowStock` during hot reload resolved before test) |

### Overall
**PASS** — all pass–fail criteria met.

### Product owner feedback
Staff can set stock alert levels directly on each product in `/products`, without going to inventory. The **Low** / **OK** badge in the list gives a quick read before service. The feature fits the existing products workflow and did not break landing or login smoke tests.

### URLs tested
1. `http://127.0.0.1:4202/`
2. `http://127.0.0.1:4202/login?tenant=1`
3. `http://127.0.0.1:4202/dashboard`
4. `http://127.0.0.1:4202/products`

### Relevant log excerpts
```
# migrate --check
INFO: Database schema version (max applied): 20260826040000
INFO: Database is up to date (version 20260826040000)

# pos-front (final build state)
Application bundle generation complete. [2.749 seconds] - 2026-08-26T04:00:27.421Z

# tmp/test-product-stock-alert.mjs
After save (3/5): { text: 'Low 3 / 5', low: true }
After save (10/5): { text: 'OK 10 / 5', low: false }
>>> RESULT: Product stock alert UI PASS
```
