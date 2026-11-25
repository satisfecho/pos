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
