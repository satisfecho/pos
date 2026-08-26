# Add a stock alert for each product

## Status
- **UNTESTED (2026-08-26):** Product stock alerts implemented on Products UI. Ready for tester.

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
