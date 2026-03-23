# TenantProduct `price_cents` cleared to NULL (DB NOT NULL violation)

## Source

- **Service:** `pos-postgres`
- **UTC window:** after prior log review (`2026-03-23T16:04:01Z`); errors at **2026-03-23 16:08:07.691–16:08:07.960 UTC** (pid **49844**).
- **Representative lines:**
  - `ERROR:  null value in column "price_cents" of relation "tenantproduct" violates not-null constraint`
  - `STATEMENT:  UPDATE tenantproduct SET price_cents = NULL WHERE id = $1`
  - `DETAIL:  Failing row contains (…, Pozole, …)` (multiple rows / ids)

This is separate from the earlier **`orderitem.price_cents`** INSERT incident (tracked in `done/` as **CLOSED-20260323-1604-…**): here the failing statement is an **UPDATE** that sets **`tenantproduct.price_cents`** to **NULL**.

## High-level instructions for coder

- Find every code path that issues **`UPDATE tenantproduct … SET price_cents = NULL`** (or ORM equivalent that persists NULL). Decide whether NULL should ever be allowed; schema says **NOT NULL**, so the app must not send that update.
- Trace what user/API flow triggered this (likely menu/catalog sync, product edit, or import) around **16:08 UTC**; align with **`pos-back`** request logs for the same window if needed.
- Fix by either: (1) stop clearing **`price_cents`** when a price is unknown—keep previous value or compute a new non-null price; or (2) if “no price” is valid product policy, that would require a schema/migration change (prefer fixing the writer unless product explicitly allows nullable menu prices).
- Add or extend tests so **`tenantproduct`** rows are never updated to NULL **`price_cents`** when the column is NOT NULL.

## Implementation notes (coder, 2026-03-23)

- **`Session.before_flush` guard** (`back/app/main.py`): Any `TenantProduct` in `new`/`dirty` with `price_cents is None` is coerced via `_price_cents_from_tenant_product_row` (provider product → linked product). If nothing resolves, flush raises **`InvalidRequestError`** so PostgreSQL never sees `UPDATE tenantproduct SET price_cents = NULL`.
- **`PUT /tenant-products/{id}`:** Uses `model_dump(exclude_unset=True)` so an **explicit JSON `price_cents: null`** does not clear the column (NOT NULL); only non-null values apply.
- **Menu order shadow `Product` link:** When linking a catalog-only `TenantProduct` to a new `Product`, copy **`link_price`** onto the row if `price_cents` was missing in memory.
- **`GET /products` backfill:** When creating a `Product` from a `TenantProduct` without `product_id`, selling price uses **`_price_cents_from_tenant_product_row`** if the row has no price in memory; skip creating that `Product` if still unresolved.
- **Tests:** `back/tests/test_tenant_product_price_not_null.py` (Postgres `TestClient` + flush guard + PUT null).

---

## Testing instructions

### What to verify

- Flushing a `TenantProduct` with `price_cents=None` in memory does **not** emit a NULL `price_cents` when provider or linked product can supply a price.
- **`PUT /tenant-products/{id}`** with **`{"price_cents": null}`** leaves the stored selling price unchanged.
- Flush fails with **`InvalidRequestError`** when a `TenantProduct` would persist with null price and no fallback chain exists.

### How to test

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back \
  python3 -m pytest /app/tests/test_tenant_product_price_not_null.py \
  /app/tests/test_menu_order_line_price_fallback.py -v
```

### Pass/fail criteria

- **Pass:** Both pytest modules exit **0** (10 tests total with the two files above).
- **Fail:** Any failure in those modules, or PostgreSQL **`tenantproduct.price_cents`** null violations on menu/catalog flows after deploy.
