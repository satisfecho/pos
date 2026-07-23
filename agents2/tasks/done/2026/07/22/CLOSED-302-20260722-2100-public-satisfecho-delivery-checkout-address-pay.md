---
## Closing summary (TOP)

- **What happened:** Public Satisfecho Delivery checkout (#302) was implemented (API + `/delivery/:tenantId` UI + tests), but verification **FAIL**ed: catalog/public-menu items send **`TenantProduct.id`** while create resolves only **`Product.id`** (`400 Product not found: 58`).
- **Why not UNTESTED:** Open FAIL remains; `_resolve_product_lines` in `delivery_order_service.py` still has no TenantProduct→Product mapping. Do **not** hand off WIP→UNTESTED for this file.
- **Why archived:** GitHub **#302** is **CLOSED** (2026-07-22); successor **#304** is **OPEN** (same fix scope). Per **`012-feature-coder-handoff.md`** loop protection, stop cycling this WIP; active work continues on **`WIP-304-…`**.
- **Resume:** Feature coder implements TenantProduct ID resolution + regression tests under **#304** / **`WIP-304-20260722-2100-resolve-tenantproduct-ids-satisfecho-delivery-checkout.md`**, then hand off that task to **UNTESTED**.
- **Closed at (UTC):** 2026-07-22 21:00
---

# Public Satisfecho Delivery checkout (address + pay)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/302
- **302** (CLOSED — superseded by **#304** for the TenantProduct ID fix)
- **Also tracked:** https://github.com/satisfecho/pos/issues/304 (OPEN — active successor)

## Problem / goal

First customer-facing “Glovo-like” surface for **Satisfecho Delivery**: public menu → cart → **delivery address** → **pay** (reuse existing Stripe/Revolut guest checkout where applicable) → order enters kitchen **without a table**.

**Already shipped (build on this):**
- Order channel `satisfecho_delivery` + address/phone/courier fields; staff create/assign; courier list/actions — see `docs/0053-satisfecho-delivery-order-channel.md` (#297–#301).
- Public guest menu / ordering patterns and Revolut/Stripe payment flows (`docs/REVOLUT.md`, existing public book/menu paths).

**Out of scope for this issue:** multi-restaurant fleet, live map tracking, marketplace driver apps, courier UI redesign, staff-only create path changes beyond what public create needs.

## High-level instructions for coder

- Skim `docs/0053-satisfecho-delivery-order-channel.md`, public menu/cart flows, and guest payment (Stripe/Revolut) so the public path creates a proper **Satisfecho Delivery** order (`order_channel=satisfecho_delivery`, `table_id` null, address required) that kitchen/staff/courier already understand.
- Add a **public** (unauthenticated or lightly gated) checkout: collect delivery address (+ phone/name as needed), cart line items, then payment via existing tenant payment setup; on success the order should appear for kitchen like other open orders.
- Prefer extending existing public menu/order APIs over inventing a parallel order model; keep tenant scoping and payment security consistent with current guest checkout.
- Frontend: clear address → pay UX on the public delivery path; i18n all new strings in every `front/public/i18n/*.json` locale.
- Tests: API coverage for public create + pay happy path and validation failures; minimal Puppeteer/smoke for menu → address → pay (or payment stub) → order visible; Angular build clean in `pos-front` logs.
- Update `docs/0053-satisfecho-delivery-order-channel.md` (or a short linked doc) to describe the public checkout surface and any new endpoints.

## Implementation summary

- **API:** `POST /public/tenants/{tenant_id}/satisfecho-delivery` creates unpaid Satisfecho Delivery orders (`table_id` null); returns `public_order_token` + payment hints. Kitchen notify deferred until pay.
- **Pay:** Stripe/Revolut guest endpoints accept `table_token` **or** `public_order_token`; delivery Revolut redirects to `/delivery/{tenantId}/payment-success`.
- **UI:** `/delivery/:tenantId` (menu → cart → address → pay); CTA from `/public-menu/:tenantId`; i18n `DELIVERY_CHECKOUT.*` in all locales.
- **Docs:** `docs/0053-satisfecho-delivery-order-channel.md`, `docs/REVOLUT.md`, CHANGELOG Unreleased.
- **Tests:** `back/tests/test_public_satisfecho_delivery.py`; smoke `front/scripts/test-delivery-checkout.mjs`.

## Handoff log

- **Handoff (`012-feature-coder-handoff.md`, 2026-07-21 20:55 UTC, Cursor):** `./scripts/git-sync-development.sh` (OK). **#302** **OPEN**, labels **`agent:planned`**, **`agent:wip`**. **Remain WIP** — **no** `WIP-302-…` → `UNTESTED-*`; **no** `gh issue edit 302 --add-label "agent:untested"`. Embedded **Test report** **Overall: FAIL** (manual UX): public menu posts `TenantProduct.id` (e.g. 58) but `create_satisfecho_delivery_order` / `_resolve_product_lines` only `session.get(Product, pid)`. Feature coder must resolve TenantProduct→Product (same as table/guest order path) + regression test from public-menu IDs, then re-hand off.
- **Handoff (`012-feature-coder-handoff.md`, 2026-07-22 21:00 UTC, Cursor):** `./scripts/git-sync-development.sh` (OK). **#302** **CLOSED**; successor **#304** **OPEN**. **No** WIP→UNTESTED (FAIL still open; `_resolve_product_lines` unchanged). **Archive** this file → **`CLOSED-302-…`** → **`done/2026/07/22/`**; created **`WIP-304-20260722-2100-resolve-tenantproduct-ids-satisfecho-delivery-checkout.md`**; `gh issue edit 304 --add-label "bug,agent:wip"`.

## Testing instructions

1. **Backend pytest**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back \
     python3 -m pytest tests/test_public_satisfecho_delivery.py tests/test_payment_security.py tests/test_satisfecho_delivery_orders.py -q
   ```
   Expect all passed (public create validation, pay with token, table pay regression).

2. **API spot-check (optional)**
   - `POST /public/tenants/1/satisfecho-delivery` with product, address, phone → `order_channel=satisfecho_delivery`, `public_order_token`, `table_id=null`.
   - `POST /orders/{id}/create-payment-intent?public_order_token=…` when Stripe is configured.
   - After mocked/real confirm, order `status=paid` and appears on staff Delivery / kitchen lists.

3. **Frontend smoke**
   ```bash
   BASE_URL=http://127.0.0.1:4202 TENANT_ID=1 node front/scripts/test-delivery-checkout.mjs
   ```
   Expect PASS (delivery page, add→cart, public-menu CTA).

4. **Manual UX**
   - Open `/delivery/1`: add items → cart → address/phone → pay (Stripe or Revolut if configured).
   - Confirm unpaid public orders do not spam kitchen until payment; after pay, order shows as Satisfecho Delivery without a table.
   - Check `docker logs --since 10m pos-front` for clean Angular build (no TS/NG errors).

5. **i18n**
   - Switch language on `/delivery/1`; no raw `DELIVERY_CHECKOUT.*` keys.

## Test report

1. **Date/time (UTC):** 2026-07-21 20:45:20 – 20:46:52 UTC. Log window: `pos-front` / `pos-back` ~20:43–20:47 UTC.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development`.
3. **What was tested:** pytest (public delivery + payment security + staff delivery); API create/validation/pay token; Puppeteer `test-delivery-checkout.mjs`; manual menu→cart→address→pay; i18n language switch; front build logs.
4. **Results:**
   - Backend pytest — **PASS** — `16 passed in 2.95s`.
   - API create with legacy `Product.id` (878) — **PASS** — HTTP 200, `order_channel=satisfecho_delivery`, `table_id=null`, `public_order_token` present (order 1025, status pending).
   - API validation (empty address) — **PASS** — HTTP 400 `delivery_address is required`.
   - Guest pay with `public_order_token` — **PASS** (token accepted) — Stripe returns 400 `Stripe not configured for this tenant` (env); Revolut reaches merchant API then 502 Unauthenticated (env credentials), not a token-auth rejection. Full paid→kitchen path not exercised live.
   - Frontend smoke — **PASS** — `Cart step OK`, `public-menu delivery CTA OK`, `PASS`.
   - Manual UX menu→address→pay — **FAIL** — Adding Amstel Radler (menu `id=58` = `TenantProduct.id`) then Continue to payment → `POST /public/tenants/1/satisfecho-delivery` HTTP 400 `Product not found: 58`. Public menu exposes `TenantProduct.id`; `create_satisfecho_delivery_order` resolves only `Product.id`. Same for Due.Zero menu id 55 (`TenantProduct.product_id=878`). Legacy-only Café americano (`Product` 906) would create; most catalog items on tenant 1 cannot.
   - Front Angular build — **PASS** (final) — Transient `TS2339 orderAgain` at 20:43:10Z then `Application bundle generation complete` at 20:43:16Z; `orderAgain()` present in component; page loads.
   - i18n — **PASS** — Español: “Pida a domicilio…”, “Añadir”, “Ver carrito”; no raw `DELIVERY_CHECKOUT.*` keys.
5. **Overall:** **FAIL** — Manual checkout broken for TenantProduct-backed menu items (ID space mismatch).
6. **Product owner feedback:** Shell and unit coverage look solid, but the customer path from the live public menu cannot pay for most Demo Pizzeria items because cart posts TenantProduct IDs and create looks up Product rows. Fix by mapping menu IDs the same way table/guest ordering does (resolve TenantProduct→Product, or accept tenant_product ids in public create) and add a regression test that creates from public-menu IDs. Smoke should extend past cart into create/pay so this cannot regress.
7. **URLs tested:**
   1. http://127.0.0.1:4202/delivery/1
   2. http://127.0.0.1:4202/public-menu/1 (via smoke)
   3. http://127.0.0.1:4202/api/public/tenants/1/satisfecho-delivery (POST)
   4. http://127.0.0.1:4202/api/orders/1025/create-payment-intent?public_order_token=… (POST)
   5. http://127.0.0.1:4202/api/orders/1025/create-revolut-order?public_order_token=… (POST)
8. **Relevant log excerpts (last section):**
   ```
   # pos-front (transient then recovered)
   Application bundle generation failed. [0.290 seconds] - 2026-07-21T20:43:10.159Z
   ✘ [ERROR] TS2339: Property 'orderAgain' does not exist on type 'DeliveryCheckoutComponent'.
   Application bundle generation complete. [0.359 seconds] - 2026-07-21T20:43:16.256Z

   # browser create (FAIL)
   POST /api/public/tenants/1/satisfecho-delivery
   body: {"items":[{"product_id":58,"quantity":1}],"delivery_address":"Calle Test 1, Madrid",...}
   response: {"detail":"Product not found: 58"}

   # DB mapping evidence
   TenantProduct id=58 Amstel Radler → product_id=881
   Product id=58 MISSING; Product id=881 Amstel Radler exists

   # pos-back
   POST /public/tenants/1/satisfecho-delivery HTTP/1.1" 400 Bad Request
   ```
