---
## Closing summary (TOP)

- **What happened:** Satisfecho Delivery needed tenant delivery zones/radius, a configurable delivery fee, and a simple customer “track your order” page with live statuses (no maps).
- **What was done:** Migration + tenant fee/radius/postal settings; public checkout validates zone and includes fee in payment totals; token-gated `/delivery/:tenantId/track` with polling; docs and smoke script updated; HMAC token verify fixed for digests containing `.`.
- **What was tested:** Migration `20260723220000`, 14 API pytest cases, staff settings, checkout fee/postal gate, track lifecycle, Puppeteer track/checkout smokes, front build — overall PASS.
- **Why closed:** All acceptance criteria passed.
- **Closed at (UTC):** 2026-07-23 20:55
---

# Delivery zones, fees, and simple live status for customer

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/306
- **306**

## Problem / goal

Extend **Satisfecho Delivery** so restaurants can define **delivery zones** (or a radius), charge a **delivery fee**, and customers can open a simple **“track your order”** page that shows clear live statuses.

**Already shipped (build on this):** public checkout at `/delivery/{tenantId}`, staff create/assign, courier accept/pickup/deliver, unpaid TTL cleanup — see `docs/0053-satisfecho-delivery-order-channel.md` (#297–#304).

**Out of scope for this issue (explicitly later):** maps UI, automatic courier matching / dispatch.

## High-level instructions for coder

- Skim `docs/0053-satisfecho-delivery-order-channel.md` and the public delivery checkout / courier status flow so zone + fee + tracking fit the existing `satisfecho_delivery` channel (no parallel order model).
- **Zones / radius:** tenant-scoped config so staff can define where delivery is allowed (simple radius and/or zone polygons/list — prefer the smallest workable model). Public checkout must reject or warn when the address is outside the deliverable area.
- **Delivery fee:** tenant-configurable fee applied on public (and staff, if appropriate) Satisfecho Delivery create/checkout; show fee clearly before pay; keep totals consistent with payment intents.
- **Track order:** customer-facing page (token-gated like existing `public_order_token` patterns) showing simple live statuses (e.g. received → preparing → out for delivery → delivered) without maps. Prefer polling or existing WS patterns already used for orders.
- Preserve tenant scoping, rate limits on public endpoints, and payment security; do not weaken unpaid-cleanup or kitchen-deferred-until-pay behavior.
- Frontend: clear staff settings UX + customer track page; i18n all new strings in every `front/public/i18n/*.json` locale.
- Tests: API coverage for zone/fee validation and track-status happy path; smoke/Puppeteer for track page if practical; ensure `pos-front` build stays clean.
- Update `docs/0053-satisfecho-delivery-order-channel.md` (or a short linked doc) for zones, fees, and customer tracking.

## Implementation summary (010 feature-coder)

- Migration `20260723220000_delivery_zones_fees.sql`: tenant `delivery_fee_cents`, `delivery_radius_meters`, `delivery_postal_codes`; order `delivery_fee_cents` snapshot.
- Public config + create coverage validation; fee included in Stripe/Revolut totals; `GET /public/orders/{id}/delivery-status`.
- Settings → Payments: Satisfecho Delivery fee / radius / postal codes; checkout + `/delivery/:tenantId/track` page (poll).
- Fixed intermittent public_order_token verify when HMAC digest contains `.` (split on first separator).
- Docs: `docs/0053-satisfecho-delivery-order-channel.md`. Smoke: `front/scripts/test-delivery-track.mjs`.

## Testing instructions

1. **Migrate / stack:** From repo root, ensure DB has migration applied:
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.migrate --check`
   Expect version `20260723220000` (or later).

2. **API tests:**
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest tests/test_public_satisfecho_delivery.py -q`
   Expect all tests passed (fee, postal zone, radius, track status, payment with fee).

3. **Staff settings:** Log in as admin → Settings → Payments → “Satisfecho Delivery”. Set fee e.g. `250`, postal codes `28001` (one per line), save. Optionally set restaurant lat/lng (location section) and a delivery radius.

4. **Public checkout:** Open `http://127.0.0.1:4202/delivery/1` (or demo tenant). Add items → address. Confirm fee shown; with postal codes configured, wrong code is rejected; pay total includes fee.

5. **Track page:** After pay (or with a valid `public_order_token` from create), open `/delivery/{tenantId}/track?order_id=…&public_order_token=…`. Status should move received → preparing → out for delivery → delivered as kitchen/courier advance. Polling refreshes without maps.

6. **Puppeteer smokes:**
   ```bash
   BASE_URL=http://127.0.0.1:4202 TENANT_ID=1 node front/scripts/test-delivery-track.mjs
   BASE_URL=http://127.0.0.1:4202 TENANT_ID=1 node front/scripts/test-delivery-checkout.mjs
   ```

7. **Front build:** `docker logs --since 10m pos-front` — no TS/NG compile errors after the change.

## Test report

1. **Date/time (UTC):** 2026-07-23 20:52:22 → 20:54:55 UTC. Log window: ~20:52–20:55 UTC (`pos-back`, `pos-front`).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` (synced via `./scripts/git-sync-development.sh`).
3. **What was tested:** Migration `20260723220000`; pytest public Satisfecho Delivery; staff Settings → Payments Satisfecho Delivery fee/postal; public checkout fee + postal rejection; track page status lifecycle + fee display; Puppeteer track/checkout smokes; front build logs.
4. **Results:**
   - Migration check **PASS** — schema version `20260723220000` applied / up to date.
   - API pytest **PASS** — `14 passed` in `tests/test_public_satisfecho_delivery.py`.
   - Staff settings **PASS** — login → `/settings` → Payment Settings; `#delivery_fee_cents=250`, `#delivery_postal_codes=28001`, Satisfecho section present; PUT `/tenant/settings` 200 (demo settings restored to fee `0` / cleared postal after test).
   - Public checkout **PASS** — address step shows `Liefergebühr: €2.50`, postal required + allowed `28001`; API create `postal_code=99999` → 400 `Address is outside the delivery zone`; `28001` → 200 with `delivery_fee_cents=250`, `total_cents=510`.
   - Track page **PASS** — order `#2038` track UI shows steps + final `Zugestellt`, fee `(Liefergebühr: 2.50)`; status progression via service: received → preparing → out_for_delivery → delivered; GET `/public/orders/2038/delivery-status` 200.
   - Puppeteer smokes **PASS** — `test-delivery-track.mjs` OK; `test-delivery-checkout.mjs` PASS (order create OK).
   - Front build **PASS** — no TS/NG compile failures; only pre-existing `NG8107` optional-chain warnings in `MenuComponent`.
5. **Overall:** **PASS**
6. **Product owner feedback:** Zones/fees and the customer track page work end-to-end on demo tenant: fee and postal gates show clearly before pay, and track statuses advance without maps. Ready for closer. Consider a follow-up to surface fee on the cart step label (not only address) if product wants it even more visible.
7. **URLs tested:**
   1. http://127.0.0.1:4202/delivery/1
   2. http://127.0.0.1:4202/delivery/1/track?order_id=1&public_order_token=invalid
   3. http://127.0.0.1:4202/delivery/1/track?order_id=2038&public_order_token=c2Q6MjAzODoxOjE3ODQ5MjY0MTgu07X-9tzkE2_DW60HdEqABidryCV8XNaCnvXqzVRcb_o
   4. http://127.0.0.1:4202/login
   5. http://127.0.0.1:4202/dashboard
   6. http://127.0.0.1:4202/settings
8. **Relevant log excerpts:**
   ```
   INFO: Database is up to date (version 20260723220000)
   .............. 14 passed, 1 warning in 1.02s
   PUT /tenant/settings HTTP/1.1" 200 OK
   POST /public/tenants/1/satisfecho-delivery HTTP/1.1" 400 Bad Request
   POST /public/tenants/1/satisfecho-delivery HTTP/1.1" 200 OK
   GET /public/orders/2038/delivery-status?... 200 OK
   OK delivery track smoke / PASS (checkout)
   Application bundle generation complete (no TS/NG errors; NG8107 warnings only)
   ```
