# Payment tips: owner-configurable presets (e.g. 5/10/15/20%), invoice, tax

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/58

## Problem / goal
Restaurant owner configures tip options in settings (e.g. four percentages). POS applies selected tip to payment total automatically; tip line appears on invoice/receipt. Tax treatment for tips should be configurable in the backend (issue asks which tax applies — design and document default).

## High-level instructions for coder
- Review existing payment and tenant settings models/APIs; follow patterns in `docs/` for payments (e.g. `docs/REVOLUT.md` if card flow touches this).
- Add tenant-level tip presets + tax behavior flag; persist and expose to frontend checkout/payment UI.
- Wire tip into total calculation and printing path; document tax default and migration if schema changes.
- Add backend tests for calculation edge cases; smoke payment UI if a script exists.

## Coder notes (2026-03-23)
Implementation for **#58** was already on **`development`**: tenant **`tip_preset_percents`** / **`tip_tax_rate_percent`**, migration **`20260323140000_tenant_tip_presets_and_order_tip.sql`**, **`PUT …/mark-paid`** and **`PUT …/finish`** with **`tip_percent`**, orders UI + settings, invoice tip line + VAT split, **`back/tests/test_order_tip.py`**.

This pass **verified** that stack, **documented** Revolut vs tips + tax defaults in **`docs/REVOLUT.md`**, and **extended** **`test_order_tip.py`** (explicit 0%, rounding, empty subtotal).

---

## Testing instructions

### What to verify
- Tenant **Settings → Payments** still saves up to four **tip %** presets and **tip VAT %**; POS **Mark paid / Finish** shows preset buttons and preview when presets are non-empty.
- **`tip_tax_rate_percent = 0`**: printed invoice tip line has no VAT column for tips; non-zero rate splits gross tip for the VAT summary (existing behaviour).
- **Revolut** customer checkout amount remains **line items only** (no tip in Revolut order); doc matches behaviour.

### How to test
- **Backend:** from repo root with dev compose up:
  ```bash
  docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back \
    python3 -m pytest /app/tests/test_order_tip.py -v
  ```
- **Docs:** read **`docs/REVOLUT.md`** section **“POS tips (staff checkout) vs this flow”**.
- **UI (manual):** log in as owner → **Settings** → Payments area → edit tip presets, save → **Orders** → open payment modal on an order with items → pick a tip → mark paid; print/preview invoice and confirm tip line (+ VAT if configured).

### Pass/fail criteria
- **Pass:** all tests in **`test_order_tip.py`** green; doc section present and accurate; settings + payment modal behave as before with no regressions.
- **Fail:** any test failure, or tips/VAT/invoice inconsistent with tenant settings.
