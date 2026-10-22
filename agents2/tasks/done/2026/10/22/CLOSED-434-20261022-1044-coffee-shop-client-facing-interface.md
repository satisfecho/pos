---
## Closing summary (TOP)

- **What happened:** Coffee-shop / retail customer-facing order display (#434) was implemented as an MVP and re-verified after a SlowAPI invoice-email 500 regression.
- **What was done:** Public `/display/{table_token}` live cart synced with staff orders, invoice-email capture via `POST /menu/{token}/order/invoice-email` (email stored for Factura; no auto PDF send yet), staff Customer display pairing, docs/tests/i18n; SlowAPI `response: Response` fix for uvicorn rate limits.
- **What was tested:** Live invoice-email 200 under HAProxy, pytest 3/3, Puppeteer customer-display smoke (order + pay options + email), front build clean — overall PASS (staff button N/A without login env).
- **Why closed:** All pass criteria met; tester overall PASS.
- **Closed at (UTC):** 2026-10-22 11:32
---

# Coffee-shop / retail client-facing order summary (#434)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/434
- **434**

## Problem / goal
For counter / coffee-shop / retail-style sales (not only table service), show a **customer-facing** summary of what is being bought: line items, discounts, payment options, and a way to add an email to receive the invoice. Aimed at a second screen or customer-visible panel while staff runs the order.

Build on existing orders, payments, discounts, and invoice/email paths (`docs/0008-order-management-logic.md`, `docs/0017-billing-customers-factura.md`, `docs/0018-verifactu-fiscal-invoicing.md`, `docs/REVOLUT.md` where payments apply). Prefer extending current order/checkout UX over a parallel order model.

## High-level instructions for coder
- Define MVP surface: customer-visible live cart/order summary (items, prices, discounts/totals) synced with the staff-side open order; payment options consistent with what staff can already take (cash/card/etc. already in product).
- Add customer email capture for invoice delivery; wire to existing invoice/email sending if present, or a clear stub + follow-up only if mail path is missing — do not invent a second fiscal stack.
- Prefer a dedicated customer-facing route/view (e.g. display URL or paired “customer display” mode) that is read-focused; staff keeps control of edits and payment confirmation.
- Tenant-scoped; works for non-table / takeaway-style orders if the product already supports them; avoid breaking table-service flows.
- i18n for new customer-facing and staff pairing strings in all shipped locales.
- Smoke: open staff order + customer display; items/discounts update; payment options visible; email field accepted and tied to invoice path; `docker logs --since 10m pos-front` clean after UI work.

## Status
- **Implemented** (MVP) by agent 010 on 2026-10-22.
- **Fix (re-WIP → UNTESTED):** 2026-10-22 — SlowAPI 500 on `POST /menu/{token}/order/invoice-email` fixed by adding `response: Response` (+ `key_func=_rate_limit_key`). Live HAProxy path returns 200. Signature regression test added.

## Implementation notes
- Public route `/display/{table_token}` (`CustomerDisplayComponent`): live order via `GET /menu/{token}/order?for_display=true` + table WebSocket + poll.
- Staff: **Customer display** button on `/staff/orders` opens the paired table display.
- `order.invoice_email` column + `POST /menu/{token}/order/invoice-email` (no automatic PDF mail send yet; stores email for Factura follow-up — see `docs/0078-customer-facing-display.md`).
- Payment options are read-only labels; staff still marks paid.
- **Bugfix:** `set_order_invoice_email` must declare `response: Response` so SlowAPI can inject rate-limit headers under uvicorn (TestClient alone did not catch this).

## Prior test report (FAILED — fixed)
Tester reported live `POST .../invoice-email` **500** (`parameter response must be an instance of starlette.responses.Response`). That is the fix in this handoff.

## Testing instructions

### What to verify
1. Live `POST /api/menu/{table_token}/order/invoice-email` returns **200** (not 500) under HAProxy/uvicorn with rate limiting.
2. Backend unit tests for customer display invoice email pass (including SlowAPI `response` signature check).
3. Customer display UI smoke: `/display/{token}` shows chrome; with open order, payment options + email field; email save succeeds from UI if exercised.
4. Optional: staff `/staff/orders` → **Customer display** button (needs `LOGIN_*` / `DEMO_LOGIN_*`).
5. Front build: no TS / Application bundle errors in recent `pos-front` logs.

### How to test
1. Stack: `docker compose -f docker-compose.yml -f docker-compose.dev.yml ps` (HAProxy e.g. `http://127.0.0.1:14202`).
2. Backend:  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest /app/tests/test_customer_display_invoice_email.py -q`
3. Live invoice-email (critical regression): with Take Away token and an active pending order:  
   `curl -sS -o /tmp/inv.json -w "%{http_code}\n" -X POST "http://127.0.0.1:14202/api/menu/$TABLE_TOKEN/order/invoice-email" -H 'Content-Type: application/json' -d '{"email":"display-test@amvara.de"}'`  
   Expect **200** and `"ok":true` in body. Confirm `pos-back` log line is `200 OK`, not SlowAPI `response` exception.
4. Puppeteer (host with Chrome + `front/node_modules`):  
   `BASE_URL=http://127.0.0.1:14202 TABLE_TOKEN=<token> HEADLESS=1 npm run test:customer-display --prefix front`  
   Or with staff login: `LOGIN_EMAIL=… LOGIN_PASSWORD=…`.
5. Manual: Take Away on `/staff/orders` → Customer display → add items → email save → mark paid → thank-you.
6. `docker logs --since 10m pos-front` — no Application bundle / TS errors.

### Pass/fail criteria
- **PASS** if live invoice-email returns 200, pytest green (3 tests), display route loads, and no SlowAPI `response` errors in `pos-back` logs.
- **FAIL** if invoice-email still 500, signature test fails, or display/UI regressions block the guest path.

## Test report

1. **Date/time (UTC):** 2026-10-22T11:30:01Z start → 2026-10-22T11:32:30Z end. Log window: `pos-back` / `pos-front` since ~11:30Z (also scanned prior 30–120m for SlowAPI / bundle history).
2. **Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml`; HAProxy `BASE_URL=http://127.0.0.1:14202`; branch `development`; Take Away `TABLE_TOKEN=6a90d7b9-961d-4ba0-807d-fb308c5ff0a3` (tenant 1). Puppeteer via host Chromium + `NODE_PATH` to front container `node_modules` volume (`HEADLESS=1`).
3. **What was tested:** Live `POST …/invoice-email` 200 regression; pytest (incl. SlowAPI `response` signature); customer display UI smoke (order + payment options + email); front build clean in recent window; contrast tokens on display (`pickContrastingForeground`).
4. **Results:**
   - Live invoice-email under HAProxy/uvicorn → **PASS** — HTTP 200, body `{"ok":true,"invoice_email":"display-test@amvara.de","order_id":217}`; `pos-back` `POST …/invoice-email … 200 OK` (no `parameter response must` / SlowAPI errors).
   - Backend pytest `test_customer_display_invoice_email.py` → **PASS** — 3 passed in 1.37s.
   - Customer display UI `/display/{token}` → **PASS** — Puppeteer: chrome OK; state `{ empty: false, order: true, paid: false, payOpts: true, email: true }`.
   - Optional staff Customer display button → **N/A** — no `DEMO_LOGIN_*` / `LOGIN_*` in `config.env` on this host.
   - Front build (recent 10m) → **PASS** — no Application bundle / TS errors in last 10m; display route served 200. (Earlier ~11:02–11:06Z had TS2345 failures that recovered with “Application bundle generation complete” at 11:06:30Z — outside this verification window; live UI worked.)
   - Contrast → **PASS** — display uses `pickContrastingForeground` for fg / on-primary against tenant bg/primary (defaults `#F5F5F4` / primary).
5. **Overall:** **PASS**
6. **Product owner feedback:** The SlowAPI invoice-email 500 regression is fixed on the live HAProxy path. Guest display shows live order lines, payment option labels, and email capture with the stored invoice email reflected on `for_display` GET. Staff pairing button was not exercised here (no login secrets in env); worth a quick manual check after deploy.
7. **URLs tested:**
   1. `http://127.0.0.1:14202/`
   2. `http://127.0.0.1:14202/display/6a90d7b9-961d-4ba0-807d-fb308c5ff0a3`
   3. `http://127.0.0.1:14202/api/menu/6a90d7b9-961d-4ba0-807d-fb308c5ff0a3/order?for_display=true`
   4. `http://127.0.0.1:14202/api/menu/6a90d7b9-961d-4ba0-807d-fb308c5ff0a3/order/invoice-email` (POST)
8. **Relevant log excerpts:**
   ```
   INFO: … "POST /menu/6a90d7b9-961d-4ba0-807d-fb308c5ff0a3/order/invoice-email HTTP/1.1" 200 OK
   Puppeteer: PASS: customer display smoke OK
   (pos-front last 10m: no Application bundle / TS errors)
   ```
