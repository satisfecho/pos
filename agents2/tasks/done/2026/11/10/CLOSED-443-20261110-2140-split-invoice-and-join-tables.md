---
## Closing summary (TOP)

- **What happened:** Agreed B/D/E/F slice for split invoice and join tables was implemented and verified on development.
- **What was done:** Features landings for split-bill and join-tables; guest-session staff pay; guest Pay my items Stripe intent wiring; per-payer Factura prep with `fiscal_invoice.order_payment_id` plus docs/changelog.
- **What was tested:** Migrate 20261110224500, pytest test_split_bill (6 passed), features marketing URLs, staff guest-session payments, guest create-payment-intent session body (Stripe not configured on tenant), per-payer Factura + order-level mutual exclusion - overall PASS.
- **Why closed:** All criteria passed.
- **Closed at (UTC):** 2026-11-10 23:00
---

# Split invoice and join tables as feature (#443)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/443
- **443**

## Status
- **Implemented** 2026-11-10T22:57:56Z (human chose B, D, E, F)

## Problem / goal

Make **split invoice** and **join tables** first-class, usable product features for staff (not buried / half-discoverable).

**Agreed slice (human on #443):** B marketing Features pages; D guest-session splits; E Stripe multi-intent; F per-payer Factura prep.

## What was implemented

- **B:** `/features/split-bill` and `/features/join-tables` landings + i18n detail copy; `test-features.mjs` asserts both cards.
- **D:** `guest_session_id` on `POST /orders/{id}/payments`; reconciliation `guest_sessions[]`; staff Orders pay modal “Pay this guest”.
- **E:** Guest `create-payment-intent` optional body (amount / lines / session); `confirm-payment` records a leg and settles only when remaining is 0; menu **Pay my items**.
- **F:** `fiscal_invoice.order_payment_id` migration; `POST /orders/{id}/payments/{payment_id}/fiscal-invoice/issue` after full pay; staff button when fiscal mode on. Still VeriFactu preparation (not production AEAT filing). Mutually exclusive with order-level alta.
- Docs: `docs/0071-split-bill.md`, `docs/0018-verifactu-fiscal-invoicing.md`, roadmap; `CHANGELOG.md` Unreleased.

## Testing instructions

1. **Migrate:** `docker compose … exec back python -m app.migrate --check` shows version `20261110224500` (or later) including `fiscal_invoice.order_payment_id`.
2. **Backend:** `docker compose … exec back python3 -m pytest tests/test_split_bill.py -q` — expect **6 passed** (includes guest-session case).
3. **Features marketing:** `BASE_URL=https://satisfecho.de` (or local HAProxy URL) `npm run test:features --prefix front` — expect grid links for `/features/split-bill` and `/features/join-tables`, plus reservations detail still OK.
4. **Manual staff D:** Shared-table order with two `added_by_session` values → Orders → Mark as paid → **Pay this guest** for each session → remaining 0 → paid.
5. **Manual guest E:** Table menu → Pay → **Pay my items** creates a session-scoped Stripe intent; after confirm, status may be `partial` until others pay or full remaining is paid.
6. **Manual F:** Tenant `fiscal_mode=test`, fully paid split order → on a payment leg click **Issue Factura for payer** → sequential number; order-level issue should 400 while payer altas exist.

## High-level instructions for coder

- Work on **`development`** only; sync with `./scripts/git-sync-development.sh` before edits.
- Prefer shipping the agreed **B / D / E / F** gaps.
- Keep tenant scoping, payment audit (`order_payment`), and default VeriFactu "one alta when fully paid" unless per-payer path is explicitly used.
- Update `CHANGELOG.md` / relevant docs when behaviour changes; append **Testing instructions**.
- No secrets, tokens, `.env`, or PII in the task file or commits.

## Test report

1. **Date/time (UTC):** start 2026-11-10T22:58:47Z, end 2026-11-10T23:00:25Z. Log window ~22:57-23:00Z.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml` (local HAProxy on 80/443; TLS CN `satisfecho.de`). Branch `development`. `BASE_URL=https://satisfecho.de` resolved to `127.0.0.1` via Chromium `--host-resolver-rules` (host port 4202 not published). `PUPPETEER_EXECUTABLE_PATH` = cached Chrome linux-148.
3. **What was tested:** migrate `20261110224500`; `tests/test_split_bill.py` (6); features marketing split-bill + join-tables; staff guest-session payments (D); guest `create-payment-intent` with `guest_session_id` (E); per-payer Factura issue + order-level block (F); UI keys/buttons for Pay this guest / Pay my items / Issue Factura for payer.
4. **Results:**
   - Migrate version `20261110224500` including `fiscal_invoice.order_payment_id`: **PASS** (`migrate --check` up to date).
   - `pytest tests/test_split_bill.py -q`: **PASS** (6 passed, includes `test_split_by_guest_session`).
   - Features marketing `/features/split-bill` + `/features/join-tables` (+ reservations link): **PASS** (tmp Puppeteer against local TLS; h1 Split bill / Join tables; status 200).
   - Manual staff D (two guest sessions → pay each → remaining 0): **PASS** (live API order 5723; guest A partial then guest B paid; legs [79, 80]). Staff UI wired (`ORDERS.PAY_GUEST_SESSION`, `data-testid=pay-guest-session-*`).
   - Manual guest E (Pay my items / session-scoped Stripe intent): **PASS** with env note - `POST .../create-payment-intent?table_token=...` body `guest_session_id` accepted (not 422); returns `400 Stripe not configured for this tenant` before intent creation. Menu wires `PAY_MY_ITEMS` + `{ guest_session_id: this.sessionId }`. Full Stripe confirm not exercised (tenant has no Stripe keys).
   - Manual F (payer Factura + order-level 400): **PASS** (`VF-1` for payment 79; order-level issue 400: "already has per-payer fiscal invoices..."). UI button `ORDERS.ISSUE_PAYER_FACTURA` / `issue-payer-factura-*` present when fiscal enabled.
5. **Overall:** **PASS**
6. **Product owner feedback:** Split bill and join-tables are discoverable on marketing Features, and staff can settle a shared table by guest browser session with a clear Factura-per-payer path in test fiscal mode. Guest "Pay my items" is wired end-to-end in the API/UI; turning on Stripe for the demo tenant would unlock a live card confirm of the partial-intent path.
7. **URLs tested:**
   1. https://satisfecho.de/features (local HAProxy)
   2. https://satisfecho.de/features/split-bill
   3. https://satisfecho.de/features/join-tables
   4. N/A browser staff/guest pay modals - verified via API + template/i18n wiring (no DEMO_LOGIN in env)
8. **Relevant log excerpts:**
   - `Database is up to date (version 20261110224500)` / migration `20261110224500_fiscal_invoice_order_payment_id.sql` applied.
   - pytest: `6 passed, 3 warnings in 4.30s`
   - Features helper: `/features/split-bill FOUND`, `/features/join-tables FOUND`, h1 Split bill / Join tables, `PASS`
   - D/F API: payments 200 partial then paid; fiscal issue 200 `full_number":"VF-1"`; order-level 400 mutual exclusion.
   - E API: `400 {"detail":"Stripe not configured for this tenant"}` after accepting `guest_session_id`.
   - `fiscal_mode` restored to `off` after F checks.
