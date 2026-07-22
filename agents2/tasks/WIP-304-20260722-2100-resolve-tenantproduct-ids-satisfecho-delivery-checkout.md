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

*(Pending — feature coder.)*

## Handoff log

- **Handoff (`012-feature-coder-handoff.md`, 2026-07-22 21:00 UTC, Cursor):** Created as successor to archived **WIP-302** / **#302** (CLOSED). **#304** **OPEN**; labels **`bug`**, **`agent:wip`**. **Remain WIP** — TenantProduct fix not implemented yet (`_resolve_product_lines` still Product-only). **No** `WIP → UNTESTED`; **no** `agent:untested`.

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
