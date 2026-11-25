---
## Closing summary (TOP)

- **What happened:** Issue #451 (priced modifiers / per-option price deltas on order customizations) was implemented and verified end-to-end.
- **What was done:** Choice/multi options support `price_delta_cents` (staff `Label|1.00` lines); menu/cart apply base+delta; order lines snapshot adjusted price and priced `customization_summary`; docs and CHANGELOG updated.
- **What was tested:** Pytest (8 passed); staff `|price` round-trip; public priced labels and cart; order/kitchen summary + historical freeze; plain-label and multi-select sum regressions; smoke HTTP 200 - overall **PASS**.
- **Why closed:** All testing criteria passed.
- **Closed at (UTC):** 2026-11-25 10:11
---

# Roadmap: Order customizations price deltas (#451)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/451
- **451**
- Related: https://github.com/satisfecho/pos/issues/50

## Problem / goal
Core order customizations (#50) are shipped (staff questions, public answers including multi-select, kitchen/invoice `customization_summary`). Remaining optional work: **per-option price deltas** so modifiers can adjust line price (e.g. +EUR1 per extra topping). See `docs/0031-order-customizations-plan.md`.

## High-level instructions for coder
- Read `docs/0031-order-customizations-plan.md` end-to-end; do **not** reinvent Phases 1-3 (already live). Focus only on priced modifiers / price deltas.
- Design data model for per-option deltas on choice (and multi) options; keep backward compatibility with existing `product_question.options` JSON and `OrderItem.customization_answers`.
- Ensure public menu and cart compute the correct unit/line total; staff orders, kitchen summary, and invoice/print must show priced modifiers consistently (snapshot if needed so later question edits do not rewrite historical totals).
- Staff product UI: allow setting a price delta per option when editing customizations; i18n for new strings.
- Prefer the smallest vertical slice that works for one product end-to-end (config → menu → order → kitchen/invoice) over a broad redesign.
- If pricing rules (tax, multi-select stacking, negative deltas) need product decisions, post **one** waiting-for-human comment on #451 and park per `TASKS-README.md`.
- Work on **`development`**. Extend API/pytest and a focused Puppeteer or menu smoke where practical.

## Status
- **WIP → UNTESTED** (implementation complete)
- Defaults used (no waiting gate): multi-select **sums** deltas; unit price `max(0, base + deltas)` before promos; tax on adjusted inclusive unit price; negative deltas allowed.

## Implementation notes
- Choice options: plain string (delta 0) or `{"label", "price_delta_cents"}`; multi dict unchanged aside from priced entries.
- `validate_and_normalize_customization_answers` returns `(answers, summary, delta_cents)`; menu order applies delta before promo; summary includes `(+1.00)` style markers.
- Staff Products: option lines support `Label|1.00` (major units).
- Public menu: option labels show currency deltas; cart totals use adjusted unit price.
- Docs: `docs/0031`, `docs/README`, `ROADMAP`, `CHANGELOG` [Unreleased].
- Tests: `back/tests/test_product_customization.py` (8 passed).

## Testing instructions

1. **Unit:** From repo root with stack up:
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest tests/test_product_customization.py -q`
   Expect 8 passed.

2. **Staff config:** Log in → Products → edit a product → Customizations → add/edit a **choice** question with lines like:
   ```
   Olives
   Extra cheese|1.00
   No onion|-0.50
   ```
   Save. Re-open editor and confirm lines round-trip with `|1.00` / `|-0.50`.

3. **Public menu:** Open table QR menu for that product. In the customize modal, options should show priced labels (e.g. Extra cheese (+€1.00)). Add to cart with Extra cheese selected; cart line and total must include the +1.00 on the unit price.

4. **Order / kitchen / invoice:** Place the order. Confirm `OrderItem.price_cents` is base+delta (and summary text includes the priced option). Kitchen display and printed invoice still show `customization_summary` under the product name; later edits to the question must not change the stored line price/summary.

5. **Regression:** A choice question with plain labels only (no `|price`) still works; cart price equals product `price_cents`. Multi-select with two priced toppings must sum both deltas.

6. **Smoke:** `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:14202/` (or the HAProxy host port) returns 200. Front rebuild: no TS/NG errors in `docker logs --since 10m pos-front`.

## Test report

1. **Date/time (UTC):** Start 2026-11-25T10:01:17Z; finish 2026-11-25T10:10:00Z. Log window: ~20m ending at finish.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; HAProxy `http://127.0.0.1:14202` (Puppeteer via `pos-node-chrome:local` on `pos2_net` used `http://haproxy:4202`); branch `development`. No repo `.env` demo login; staff UI used short-lived owner JWT (Bearer/cookie) for tenant 1.
3. **What was tested:** Unit pytest; staff Products `|price` round-trip; public menu priced labels + cart total; order line `price_cents` + `customization_summary` + historical snapshot; plain-label regression; multi-select delta sum; kitchen summary; smoke HTTP + front compile.
4. **Results:**
   - Unit `tests/test_product_customization.py`: **PASS** - 8 passed in 0.53s.
   - Staff config `|1.00` / `|-0.50` round-trip: **PASS** - API options round-trip; Products editor `#q-options` showed `Olives\nExtra cheese|1.00\nNo onion|-0.50`.
   - Public menu priced labels: **PASS** - customize modal options included `Extra cheese (+€1.00)` and `No onion (-€0.50)`.
   - Public cart +1.00: **PASS** - after selecting Extra cheese, `.cart-summary-total` = `€19.00` (Pozole base 1800 + 100).
   - Order line price + summary + snapshot: **PASS** - `price_cents=1900`, summary `Toppings #451 test: Extra cheese (+1.00)`; after PATCH to 999 cents, stored line still 1900 / same summary.
   - Kitchen / invoice summary: **PASS** - OrderItem `customization_summary` set; `/kitchen` UI showed summary text.
   - Regression plain labels: **PASS** - Medium choice kept `price_cents=1800`.
   - Multi-select sum: **PASS** - A+B deltas → `price_cents=1950`, summary `A (+1.00), B (+0.50)`.
   - Smoke: **PASS** - `/` and `/api/health` HTTP 200; front logs only NG8107 warnings (no TS/NG build failures).
   - Contrast: **N/A** - no colour/chrome/branding changes in scope.
5. **Overall:** **PASS**
6. **Product owner feedback:** Priced modifiers work end-to-end: staff can enter `Label|1.00` lines, guests see currency deltas, cart and stored order lines use base+delta, and historical totals stay frozen when questions change. Multi-select stacking and plain (unpriced) options behave as documented defaults.
7. **URLs tested:**
   1. http://127.0.0.1:14202/
   2. http://127.0.0.1:14202/api/health
   3. http://haproxy:4202/products
   4. http://haproxy:4202/menu/{take-away-token}
   5. http://haproxy:4202/kitchen
8. **Relevant log excerpts:**
   - pytest: `........ [100%] 8 passed, 1 warning in 0.53s`
   - API order: `price_cents=1900 summary='Toppings #451 test: Extra cheese (+1.00)'`
   - UI: `optionsText="Olives\nExtra cheese|1.00\nNo onion|-0.50"`; menu `Extra cheese (+€1.00)`; cart `summary="€19.00"`
   - pos-front: NG8107 optional-chain warnings only; no `Application bundle generation failed` / TS errors in window.
   - Smoke: `curl` `/` → 200; `/api/health` → 200.
