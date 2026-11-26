---
## Closing summary (TOP)

- **What happened:** Issue #455 asked for guest/staff price display to match server-authoritative billed totals (tax-inclusive by default).
- **What was done:** Added tenant `price_display_mode` (inclusive default / exclusive), exposed display prices on menu surfaces, aligned staff/receipt/courier totals with `order_due_cents`, and documented in `docs/0094-price-display-mode.md`.
- **What was tested:** Tester PASS - pytest (3), Settings Taxes mode persist, exclusive public menu net labels with tax, delivery `total_cents` == `amount_due_cents`, payment modal delivery fee line, smoke 200 + healthy front bundle.
- **Why closed:** All testing criteria passed; feature fully delivered on `development`.
- **Closed at (UTC):** 2026-11-26 16:24
---

# OrderRestro: inclusive price display matches billing

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/455
- **455**

## Status
- **WIP → UNTESTED:** Implemented on `development` (Agent 010).
- **Unblocked (2026-11-26):** Do not park on product options. If inclusive vs exclusive (or which surfaces) need a choice, ship a **setting** with default = current Satisfecho behaviour (tax-inclusive, server-authoritative payable totals on guest/staff surfaces). Align UI to billed totals; no exclusive-only invent unless the setting exists.
- **Restored:** Previous FEAT for #455 was missing from `agents2/tasks/` (orphaned `agent:planned` label / Agent 001 comment). Recreated so feature coders can pick it up.

## Problem / goal
Upstream inspiration (OrderRestro / nodedr-restaurant-pos): keep tax-inclusive menu and checkout prices aligned with server-side billing so POS, receipts, and payment totals never disagree on what the guest pays.

Adaptation goal only - do not copy upstream code. Align with Satisfecho tax / promotions / payment totals.

## High-level instructions for coder
- Read issue #455 and existing tax / price display paths (menu, cart, checkout, receipts, payments). See also `docs/0068-price-promotions.md` for tax-inclusive discount behaviour.
- Find places where UI shows a guest-facing price that can diverge from billed totals (inclusive vs exclusive, promotions, tips, delivery fees).
- Prefer one server-authoritative total path; UI should display the same figures the backend bills.
- If more than one display mode is useful, add a tenant/settings toggle with default inclusive / current behaviour. Do not wait for a human to pick the mode.
- Keep multi-tenant and currency handling intact; no hard-coded secrets.
- Work on **`development`**. Add or extend smoke / unit coverage for the chosen slice.
- Park waiting-for-human only for hard gates (secrets, irreversible ops, legal, paid third-party, or issue says wait) - see `agents2/010-feature-coder.md`.
- Do not paste upstream diffs, secrets, or PII into the task file or commits.

## What was implemented
- Tenant setting `price_display_mode` (`inclusive` default | `exclusive`) - Settings → Taxes; migration `20261126160500_tenant_price_display_mode.sql`.
- Menu / public menu / delivery config expose mode + `display_price_cents` for labels; billed `price_cents` unchanged.
- Staff order list, receipts, and courier totals use `order_due_cents` (includes delivery fee + loyalty + tip) so `total_cents` matches `amount_due_cents`.
- Payment modal shows delivery fee line when present.
- Docs: `docs/0094-price-display-mode.md`. Tests: `back/tests/test_price_display_mode.py` (3 passed).

## Testing instructions
1. **Backend unit:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest tests/test_price_display_mode.py -q` → 3 passed.
2. **Settings:** Log in as admin → Settings → Taxes → confirm Price display defaults to Tax-inclusive; save Exclusive; reload → still Exclusive. Confirm guest menu unit prices show net + "excl. tax" while cart total remains tax-inclusive billed sum.
3. **Delivery totals:** Create or open a Satisfecho Delivery order with a non-zero fee. On staff `/orders`, `total_cents` must equal `amount_due_cents` (items + fee - loyalty + tip). Payment modal shows Delivery fee line.
4. **Smoke:** App responds 200 on HAProxy port (e.g. `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:14202/` → 200). Front logs show Application bundle generation complete (no TS errors).
5. **Default behaviour:** New tenants / unset mode behave as inclusive (no UI regression on existing demo).

## Test report

1. **Date/time (UTC):** start 2026-11-26T16:14:51Z, end 2026-11-26T16:23:23Z. Log window: ~16:14-16:23Z.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:14202` (HAProxy); branch `development`. Browser: `pos-node-chrome:local` + Chromium (host snap Chromium unusable for Puppeteer).
3. **What was tested:** pytest price display; Settings → Taxes `price_display_mode` persist; exclusive public menu net labels with tax; staff delivery order `total_cents` == `amount_due_cents` with fee; payment modal delivery fee line; smoke HTTP 200; default inclusive; front bundle healthy in test window.
4. **Results:**
   - Backend unit (`tests/test_price_display_mode.py`): **PASS** - 3 passed in 1.86s.
   - Settings Taxes UI default + Exclusive persist: **PASS** - control `data-testid=settings-price-display-mode`; options Tax-inclusive (default) / Tax-exclusive; saved Exclusive, reload still Exclusive (then restored Inclusive).
   - Guest menu exclusive net + tax label path: **PASS** - with `default_tax_id=1` (IVA 10%) and mode exclusive, public menu e.g. Chile Relleno `price_cents=1500` / `display_price_cents=1364` (`tax_rate_percent=10`); billed `price_cents` unchanged. (Demo tenant normally has no default tax, so exclusive without tax leaves display==price; feature math verified with tax set.)
   - Delivery totals alignment: **PASS** - order #55 Satisfecho Delivery with `delivery_fee_cents=350`: list API `total_cents=6050` == `amount_due_cents=6050`.
   - Payment modal Delivery fee line: **PASS** - `/staff/orders` order-card-55 Pay now → `data-testid=delivery-fee-line` text `Delivery fee: €3.50`; Amount due €60.50.
   - Smoke HTTP + front build: **PASS** - `/` and `/api/health` 200; Application bundle generation complete in window (earlier 16:07 failures were before this run; later completes OK). Migration `20261126160500` applied.
   - Default inclusive: **PASS** - unset/null normalize to `inclusive`; demo tenant restored to `inclusive`.
5. **Overall:** **PASS**
6. **Product owner feedback:** Price display mode is usable from Settings → Taxes and exclusive menu labels correctly strip VAT when a default tax exists. Staff delivery payable totals now include the fee and match the payment modal, which removes the guest/staff total mismatch this issue targeted. No contrast/UI chrome changes in scope.
7. **URLs tested:**
   1. http://127.0.0.1:14202/login?tenant=1
   2. http://127.0.0.1:14202/dashboard
   3. http://127.0.0.1:14202/settings?section=taxes
   4. http://127.0.0.1:14202/staff/orders
   5. http://127.0.0.1:14202/ (smoke)
   6. http://127.0.0.1:14202/api/health (smoke)
   7. http://127.0.0.1:14202/api/public/tenants/1/menu (exclusive display check)
8. **Relevant log excerpts:**
   - pytest: `3 passed, 2 warnings in 1.86s`
   - back: `Database is up to date (version 20261126160500)` / migration `20261126160500_tenant_price_display_mode.sql` applied
   - front (in window): `Application bundle generation complete` (no TS errors after 16:08Z)
   - payment modal: `Delivery fee: €3.50` / `Amount due: €60.50` on order #55
