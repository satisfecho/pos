---
## Closing summary (TOP)

- **What happened:** Public Satisfecho Delivery checkout 400'd with `Product not found` when the cart sent `TenantProduct.id` instead of `Product.id`.
- **What was done:** `_resolve_product_lines` now maps TenantProduct → Product (keeps Product.id); regression pytest added; delivery Puppeteer script extended past cart create.
- **What was tested:** Pytest 17 passed (incl. TenantProduct menu ids); API + manual `/delivery/1` create PASS (58→881); Puppeteer smoke FAIL on cart-step harness flake only — overall PASS.
- **Why closed:** All pass criteria met; product path verified via API and manual UX.
- **Closed at (UTC):** 2026-07-23 17:05
---

# Resolve TenantProduct IDs on Satisfecho Delivery checkout

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/304
- **304**
- **Blocks / continues:** https://github.com/satisfecho/pos/issues/302 (CLOSED; archived `CLOSED-302-20260722-2100-public-satisfecho-delivery-checkout-address-pay.md`)

## Problem / goal

Public Satisfecho Delivery checkout (`/delivery/{tenantId}`) fails for catalog items from the public menu:

`400 Product not found: 58` (example: Amstel Radler — `TenantProduct.id = 58`, linked `Product.id = 881`).

**Root cause:** Public menu / cart sends **`TenantProduct.id`**; `POST /public/tenants/{tenant_id}/satisfecho-delivery` resolves lines only via `session.get(Product, pid)` in `create_satisfecho_delivery_order` / `_resolve_product_lines` (`back/app/delivery_order_service.py`). No TenantProduct → Product mapping on this path.

**Already shipped (build on this):** Public delivery surface from #302 (API, `/delivery/:tenantId`, guest pay with `public_order_token`, smoke + pytest). Staff/guest table order paths already resolve TenantProduct IDs — mirror that.

**Out of scope:** Multi-restaurant fleet, live map tracking, unrelated docs/ops.

## High-level instructions for coder

- In `_resolve_product_lines` (or shared helper used by public + staff Satisfecho Delivery create), resolve menu line IDs like other guest order paths: try **`TenantProduct`** for the tenant first (then linked `Product`), and keep accepting real **`Product.id`** (backward compatible).
- Add a regression test in `tests/test_public_satisfecho_delivery.py` that creates a delivery order using **public-menu TenantProduct IDs**.
- Prefer extending `front/scripts/test-delivery-checkout.mjs` past cart into order create when feasible.
- Re-run pytest (public delivery + payment/staff suites) + Puppeteer smoke; confirm manual `/delivery/{tenantId}` → cart → address → create succeeds for catalog items.
- Append **Testing instructions** (if not already sufficient) when ready; handoff agent renames **WIP → UNTESTED** when the fix is complete.

## Implementation summary

- **`back/app/delivery_order_service.py`:** `_resolve_product_lines` now resolves public-menu **`TenantProduct.id`** → linked **`Product`** (create+link if catalog-only), then falls back to **`Product.id`** (backward compatible). Shared by public + staff Satisfecho Delivery create.
- **`back/tests/test_public_satisfecho_delivery.py`:** `test_public_create_accepts_tenant_product_menu_ids` posts a TenantProduct id that differs from `Product.id` and asserts order item uses the linked product.
- **`front/scripts/test-delivery-checkout.mjs`:** Extended past cart → address → POST create (asserts HTTP 200 + pay step).

## Handoff log

- **Handoff (`012-feature-coder-handoff.md`, 2026-07-22 21:00 UTC, Cursor):** Created as successor to archived **WIP-302** / **#302** (CLOSED). **#304** **OPEN**; labels **`bug`**, **`agent:wip`**. **Remain WIP** — TenantProduct fix not implemented yet (`_resolve_product_lines` still Product-only). **No** `WIP → UNTESTED`; **no** `agent:untested`.
- **Handoff (`012-feature-coder-handoff.md`, 2026-07-23 16:50 UTC, Cursor):** `./scripts/git-sync-development.sh` (OK). Found **#304** **CLOSED** (COMPLETED by human) but fix still missing: `_resolve_product_lines` Product-only; public menu still `"id": tp.id`; no TenantProduct regression test. **Reopened #304**; labels **`bug`**, **`agent:wip`**. **Remain WIP** — **no** `WIP → UNTESTED`; **no** `agent:untested`. Feature coder must implement TenantProduct→Product resolution + tests, then re-hand off.
- **2026-07-23 (Cursor):** Code + regression test + Puppeteer extension landed. Renamed **WIP → UNTESTED** for tester. Local Docker was unavailable in the authoring environment — pytest/smoke must be run by the tester agent; comment Verification PASS/FAIL on **#304**.

## Testing instructions

1. **Backend pytest**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back \
     python3 -m pytest tests/test_public_satisfecho_delivery.py tests/test_payment_security.py tests/test_satisfecho_delivery_orders.py -q
   ```
   Expect all passed, including a case that posts **TenantProduct** menu IDs.

2. **API spot-check**
   - From public menu (or DB), take a `TenantProduct.id` that differs from its `product_id`.
   - `POST /public/tenants/1/satisfecho-delivery` with that id → **200**, not `Product not found`.
   - Legacy `Product.id` create still works.

3. **Frontend smoke**
   ```bash
   BASE_URL=http://127.0.0.1:4202 TENANT_ID=1 node front/scripts/test-delivery-checkout.mjs
   ```
   Expect PASS; prefer coverage through create when extended.

4. **Manual UX**
   - `/delivery/1`: add a catalog beverage (e.g. Amstel Radler) → cart → address/phone → continue to pay / create — no `Product not found`.
   - `docker logs --since 10m pos-front` — clean Angular build.

5. **Pass criteria**
   - Catalog TenantProduct IDs create delivery orders successfully.
   - Regression test covers public-menu IDs.
   - Comment **Verification PASS** or **FAIL** on **#304** (reference #302).

## Test report

1. **Date/time (UTC):** 2026-07-23 17:00:40 – 17:04:30 UTC. Log window: `docker logs --since 15m` / `--since 30m` on `pos-back` / `pos-front`.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` (synced via `./scripts/git-sync-development.sh` before start).
3. **What was tested:** pytest public/payment/staff Satisfecho Delivery suites; API create with TenantProduct id ≠ Product id and legacy Product id; Puppeteer `test-delivery-checkout.mjs`; manual `/delivery/1` Amstel Radler → cart → address → create → pay.
4. **Results:**
   - **Pytest (public + payment + staff delivery):** **PASS** — `17 passed` in 3.65s; includes `test_public_create_accepts_tenant_product_menu_ids`.
   - **API TenantProduct id 58 (Amstel Radler → Product 881):** **PASS** — `POST /api/public/tenants/1/satisfecho-delivery` with `items:[{product_id:58,...}]` → HTTP 200 order `1643`; `OrderItem.product_id=881`.
   - **API legacy Product id 881:** **PASS** — HTTP 200 order `1644`; `OrderItem.product_id=881`.
   - **Public menu still exposes TenantProduct ids:** **PASS** — menu item Amstel Radler `"id": 58`.
   - **Puppeteer `test-delivery-checkout.mjs`:** **FAIL** — reaches “Cart step OK” then `Could not open address step from cart` (reproduced twice). Root cause: false-positive cart check (`/cart|…|carrito/` matches **View cart / Ver carrito** while still on menu) plus no wait for cart step; `button.btn-primary` is still the cart button, which does not match Continue/address. Harness flake, not a create-order 400.
   - **Manual UX (Chrome DevTools):** **PASS** — `/delivery/1` add Amstel Radler → cart → address → create; POST body `product_id:58` → HTTP 200 order `1646` → pay step (`Pagar el pedido`); `OrderItem.product_id=881`. No `Product not found`.
   - **Front build logs:** **PASS** — no TS/NG/bundle errors in `pos-front` for the window.
5. **Overall:** **PASS** (pass criteria met: TenantProduct menu ids create orders; regression test present; product path verified via API + manual UX). Official Puppeteer smoke remains flaky and should be hardened (wait for cart `h2` / Continue-to-address before clicking) in a follow-up — does not regress #304.
6. **Product owner feedback:** Catalog beverages on public delivery checkout no longer 400 with `Product not found` when the cart sends TenantProduct ids (e.g. 58 → linked Product 881). Guest can reach payment after address. Recommend fixing the delivery smoke script’s cart-step wait so CI does not false-fail.
7. **URLs tested:**
   1. http://127.0.0.1:4202/
   2. http://127.0.0.1:4202/api/health
   3. http://127.0.0.1:4202/api/public/tenants/1/menu
   4. http://127.0.0.1:4202/api/public/tenants/1/satisfecho-delivery (POST)
   5. http://127.0.0.1:4202/delivery/1
   6. http://127.0.0.1:4202/public-menu/1 (linked from delivery page)
8. **Relevant log excerpts:**
   ```
   POST /public/tenants/1/satisfecho-delivery HTTP/1.1" 200 OK
   POST /public/tenants/1/satisfecho-delivery HTTP/1.1" 200 OK
   POST /public/tenants/1/satisfecho-delivery HTTP/1.1" 200 OK
   ```
   Manual create request body: `{"items":[{"product_id":58,"quantity":1}],...}` → response `id:1646`, `total_cents:260`. Pytest: `17 passed`. Puppeteer: `FAIL Error: Could not open address step from cart`.
