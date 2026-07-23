# Fix public delivery-checkout Puppeteer cart → address harness

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Public Satisfecho Delivery create is fixed (#304) and covered by pytest, but **`front/scripts/test-delivery-checkout.mjs`** still **FAIL**s after “Cart step OK” with **`Could not open address step from cart`**. The cart assertion is a false positive: `/cart|…|carrito/` matches menu copy like **View cart / Ver carrito**, so the script never waits for the real cart step and then cannot find a Continue/address `button.btn-primary`. Agents keep citing this smoke as pass/fail for delivery work while the harness is broken.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T19:33Z: SIGNAL `docs_stale` / `changelog_sparse` already owned; `demo_tables_check=ok`; follow-on from closed **`CLOSED-304-…-resolve-tenantproduct-ids-satisfecho-delivery-checkout`** Test report (Puppeteer FAIL, harness flake, not create 400)
- Script: `front/scripts/test-delivery-checkout.mjs` (~L89–108) — cart regex then `button.btn-primary` Continue/address loop
- Alias/index owned elsewhere: **`NEW-0-20260722-1142-…`**, **`NEW-0-20260723-1801-retarget-delivery-checkout-smoke-index`** — do **not** merge; this task is **harness behavior only**
- Staff UI smoke is **`NEW-0-20260723-1918-staff-satisfecho-delivery-puppeteer-smoke`** — out of scope

## High-level instructions for coder

- Harden cart-step detection: wait for a cart-step-specific selector or copy that cannot match the menu “View cart” control (e.g. cart line list / cart-step container / Continue control that appears only after navigation)
- Then click Continue/address and keep address → create → pay assertions; keep public-menu delivery CTA check
- Do not weaken create assertions; do not invent new product UI
- Pass/fail: `BASE_URL=http://127.0.0.1:4202 TENANT_ID=1 node front/scripts/test-delivery-checkout.mjs` exits 0 on a tenant with at least one menu item (no `Could not open address step from cart`)
