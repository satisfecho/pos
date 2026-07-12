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
