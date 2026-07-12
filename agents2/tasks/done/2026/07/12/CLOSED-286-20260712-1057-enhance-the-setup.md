---
## Closing summary (TOP)

- **What happened:** Issue #286 asked for a guided public restaurant signup instead of bare registration — marketing intro, basics, default drinks, optional photos, and a QR code to the live order page.
- **What was done:** Shipped a multi-step wizard on `/register` and `/signup` (intro → account/basics → starter products → photos → QR) with extended `POST /register`, `POST /onboarding/starter-products`, and `back/app/onboarding.py` plus frontend i18n across locales.
- **What was tested:** Tester verified all six criteria — `test_onboarding.py` (4 passed), clean Angular build, `/register` and `/signup` 200, full browser wizard (tenant 2588 + public menu), API spot-check, and `AUTH.SIGNUP_*` keys in all nine locale files — overall PASS.
- **Why closed:** All acceptance criteria met; test report overall PASS with no rework required.
- **Closed at (UTC):** 2026-07-12 11:56
---

# Enhance the setup (guided restaurant signup)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/286
- **286**

## Problem / goal

New restaurant signups should be a **guided onboarding flow**, not a bare registration. The product owner wants a public-facing signup experience that walks the owner through setup in clear steps and ends with a usable order page (QR code).

**Desired flow (from issue):**
1. Collect **restaurant basics**: address, phone, Google Maps link.
2. Offer **default starter products** every restaurant gets (e.g. coffee, coke, water) — pre-selected or easy to confirm.
3. Prompt to **upload three product photos** and set prices.
4. Show the **QR code** linking to the public order/menu page.

The public signup page should explain **how it works in three steps** (marketing copy + wizard).

## High-level instructions for coder

- Review existing tenant registration / settings flows (`/settings`, any public register route, tenant model fields for address, phone, maps URL — see **`docs/0026-haproxy-ssl-amvara9.md`** only if deploy URLs matter; focus on product UX).
- Design a **minimal v1 wizard** (multi-step public route, e.g. `/signup` or `/register-restaurant`) that persists progress tenant-scoped; reuse existing validators and **`ngx-translate`** for all locale files.
- Step 1 — basics: address, phone, optional Google Maps / OpenStreetMap URL (align with existing `tenant_public_openstreetmap_url` or maps fields if present).
- Step 2 — default products: seed or offer toggles for coffee, coke, water (reuse **`app.seeds.seed_demo_products`** patterns or a slim onboarding seed — idempotent, tenant-scoped).
- Step 3 — photos + prices: allow up to three product image uploads with price entry (reuse product upload APIs and staff product forms where possible).
- Step 4 — completion: display QR code for the tenant’s public menu/order URL (reuse existing QR generation from table/menu features if available).
- Keep scope bounded: guided signup + sensible defaults; do **not** build full billing/subscription in this slice unless already required elsewhere.
- Security: rate-limit public signup endpoints; no secrets in responses; preserve multi-tenant isolation.
- After implementation: append **Testing instructions**; smoke-test signup flow in browser; `docker logs --since 10m pos-front` — clean Angular build.

## Implementation notes

- Multi-step wizard on `/register` and alias `/signup` (intro → account/basics → starter products → photos → QR).
- Backend: extended `POST /register` with `address`, `phone`, `maps_url`; new `POST /onboarding/starter-products` (auth, idempotent).
- Module: `back/app/onboarding.py`; tests: `back/tests/test_onboarding.py`.

## Testing instructions

1. **Backend:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest tests/test_onboarding.py -q` — expect 4 passed.
2. **Frontend build:** `docker logs --since 10m pos-front` — no `TS` errors; expect successful rebuild / page reload.
3. **Routes:** `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/register` and `/signup` — both **200**.
4. **Manual wizard (browser):**
   - Open `http://127.0.0.1:4202/register` (or `/signup`).
   - Step 0: click **Get started**.
   - Step 1: fill restaurant name, address, phone, account fields; continue (creates tenant + auto-login).
   - Step 2: confirm Coffee/Coca Cola/Water toggles and prices; continue.
   - Step 3: optionally upload images; continue.
   - Step 4: QR code and public menu URL shown; link opens `/public-menu/{tenantId}`.
5. **API spot-check (after step 1):** authenticated `POST /onboarding/starter-products` with `{ "products": [{"name":"Coffee","price_cents":250,"enabled":true}] }` returns product ids.
6. **i18n:** new `AUTH.SIGNUP_*` keys present in all `front/public/i18n/*.json` files.

## Test report

**Date/time (UTC):** 2026-07-12 11:54–11:55 UTC  
**Log window:** `docker logs --since 15m` on `pos-front`, `pos-back`

**Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` (synced)

**What was tested:** All six criteria from Testing instructions — backend pytest, frontend build, route smoke, full browser wizard, API spot-check, i18n keys.

**Results:**

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | Backend pytest `test_onboarding.py` (4 passed) | **PASS** | `.... [100%] 4 passed in 0.46s` |
| 2 | Frontend build — no TS errors | **PASS** | `docker logs --since 10m pos-front` — no `TS`/`Application bundle generation failed` lines |
| 3 | `/register` and `/signup` return 200 | **PASS** | `register:200`, `signup:200` |
| 4 | Browser wizard (intro → account → products → photos → QR) | **PASS** | Created tenant **2588** (`test-286-20260712-1154@amvara.de`); QR + public menu link shown; `/public-menu/2588` lists Coffee, Coca Cola, Water |
| 5 | API `POST /onboarding/starter-products` returns product ids | **PASS** | Cookie auth after `/api/token` → `{"status":"ok","products":[{"id":1005,"name":"Coffee","price_cents":250}]}` |
| 6 | `AUTH.SIGNUP_*` keys in all i18n files | **PASS** | 28 `SIGNUP_*` keys in each of 9 locale files (`en`, `de`, `es`, `ca`, `fr`, `bg`, `zh-CN`, `hi`, `ur`) |

**Overall:** **PASS** (all 6 criteria)

**Product owner feedback:** The guided signup delivers the requested v1 flow: marketing intro with three steps, restaurant basics with address/phone, pre-selected starter drinks with editable prices, optional photo step, and a completion screen with QR code linking to a live public menu. Ready for production promotion with the next batch deploy.

**URLs tested:**
1. http://127.0.0.1:4202/register (wizard intro + full flow)
2. http://127.0.0.1:4202/signup (alias — same intro)
3. http://127.0.0.1:4202/public-menu/2588 (post-signup public menu)

**Relevant log excerpts:**

```
pos-back:
INFO: POST /register?tenant_name=Tester%20Bistro%20286&address=... HTTP/1.1" 201 Created
INFO: POST /onboarding/starter-products HTTP/1.1" 200 OK

pos-front:
(no TS/build errors in 15m window)
```
