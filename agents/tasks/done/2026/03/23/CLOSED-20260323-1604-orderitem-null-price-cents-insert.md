---
## Closing summary (TOP)

- **What happened:** Staff/guest menu orders hit PostgreSQL NOT NULL on `orderitem.price_cents` (e.g. Pozole on order 431) because some lines were inserted without a resolved selling price.
- **What was done:** `POST /menu/{table_token}/order` now resolves line price from tenant menu row → linked provider product → linked product (and related fallbacks), and returns **400** with a clear “no selling price” message instead of committing null `price_cents`; regression coverage was added in `test_menu_order_line_price_fallback.py`.
- **What was tested:** Pytest on `test_menu_order_line_price_fallback.py` and `test_public_menu_order_response.py` — **7 passed**; tester recorded overall **PASS** against the task’s pass/fail criteria.
- **Why closed:** Verification passed; no open failure against stated acceptance criteria.
- **Closed at (UTC):** 2026-03-23 16:11
---

# Order item INSERT fails: `price_cents` null violates NOT NULL

## Source

- **Service:** `pos-postgres` (Docker)
- **UTC window:** since prior log review (`2026-03-23T15:51:52Z`); incident at **`2026-03-23 15:54:28.561 UTC`**
- **Representative lines:**
  ```
  ERROR:  null value in column "price_cents" of relation "orderitem" violates not-null constraint
  DETAIL:  Failing row contains (445, 431, 7, Pozole, 1, null, null, null, f, preparing, ...
  STATEMENT:  INSERT INTO orderitem (order_id, product_id, product_name, quantity, price_cents, ...
  ```

`pos-back` tail in the same window showed no matching Python traceback in the sampled grep (request may have failed at DB layer or been logged elsewhere); confirm with full back logs around **15:54:28Z** if needed.

## High-level instructions for coder

- Trace the code path that builds **`OrderItem`** / executes **`INSERT INTO orderitem`** for staff orders (context: **order_id 431**, **product_id 7**, name **Pozole**).
- Ensure **`price_cents`** (and related monetary fields if required) are always set before insert: resolve from product/catalog, order snapshot, or explicit API payload; reject or default only if product policy allows — **do not** rely on nullable DB values where the column is NOT NULL.
- Reproduce by repeating the UI/API action that added Pozole to that order; add a regression test or assertion if the project has patterns for order-line creation.
- If this is tied to **modifiers / non-catalog lines / imported products**, align with `docs/` and existing order-item create endpoints.

## Implementation notes (coder, 2026-03-23)

- **Insert path:** The only application code path that inserts **`OrderItem`** rows is **`POST /menu/{table_token}/order`** in `back/app/main.py` (`create_order`). Staff and guests both use this endpoint for the table’s shared order.
- **Change:** Added **`_price_cents_from_tenant_product_row`** and **`_finalize_menu_order_line_price_cents`** to resolve a line price from tenant menu row → linked **ProviderProduct** → linked **Product**, and (if needed) other **TenantProduct** rows for the same tenant/product. If still unresolved, respond **400** with a clear message instead of committing a null **`price_cents`**. Catalog-only **TenantProduct** rows (no **`product_id`**) now require a resolvable price before creating a shadow **`Product`** row (same resolution order).
- **Tests:** `back/tests/test_menu_order_line_price_fallback.py` — unit tests with mocked **`Session`** (current schema keeps **`tenantproduct.price_cents`** NOT NULL, so NULL scenarios are exercised on in-memory instances).

---

## Testing instructions

### What to verify

- Adding items via **`POST /menu/{token}/order`** never violates **`orderitem.price_cents`** NOT NULL.
- Menu lines with missing in-memory / inconsistent pricing resolve from provider or linked product when possible; otherwise the API returns **400** with **“no selling price”** in the detail.

### How to test

- **Backend (Docker):**
  ```bash
  docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back \
    python3 -m pytest /app/tests/test_menu_order_line_price_fallback.py \
    /app/tests/test_public_menu_order_response.py -v
  ```
- **Manual (optional):** With stack up, activate a table and POST the same menu payload that previously failed; expect **200** if a price can be resolved, or **400** if the menu item truly has no price chain.

### Pass/fail criteria

- **Pass:** Both test modules above exit **0**; no PostgreSQL **`orderitem.price_cents`** null violations on order placement.
- **Fail:** Any pytest failure, or **500** on order place when a valid price exists on provider or product.

---

## Test report

1. **Date/time (UTC):** 2026-03-23T16:10:25Z. **Log window sampled:** same UTC minute ± few minutes for `pos-postgres` / `pos-back` tails.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **BASE_URL** N/A (no browser); branch **development**, commit **7c65cbb**.
3. **What was tested:** Per “What to verify”: menu order placement must not insert null `orderitem.price_cents`; unresolved price must yield **400** with “no selling price” in detail (per tests).
4. **Results:**
   - `POST /menu/{token}/order` does not violate `orderitem.price_cents` NOT NULL (covered by regression tests). **PASS** — evidence: `7 passed` from pytest below.
   - Fallback / **400** with “no selling price” when nothing resolves. **PASS** — evidence: `test_raises_400_when_nothing_resolves` asserts `"no selling price" in ctx.exception.detail.lower()` (`test_menu_order_line_price_fallback.py`).
5. **Overall:** **PASS**
6. **Product owner feedback:** Menu order lines now have explicit price resolution before insert, with automated tests guarding the Pozole-style failure mode. Operators should see a clear **400** if a menu row has no resolvable selling price instead of a database error. Optional manual replay of the failing UI flow was not run in this pass; pytest is the primary gate.
7. **URLs tested:** **N/A — no browser** (optional manual step skipped).
8. **Relevant log excerpts:**
   - Pytest: `tests/test_menu_order_line_price_fallback.py` … **6 passed**; `tests/test_public_menu_order_response.py::TestPublicMenuOrderResponse::test_first_order_created_second_updated_same_order_id` **PASSED**; `============================== 7 passed in 0.67s ==============================`
   - `pos-postgres`: historical incident remains logged at **`2026-03-23 15:54:28.561 UTC`** (`orderitem` … `price_cents` null); no new `orderitem` `price_cents` null **INSERT** errors observed in the verification window after pytest run.
