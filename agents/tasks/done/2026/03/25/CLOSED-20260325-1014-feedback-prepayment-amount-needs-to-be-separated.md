---
## Closing summary (TOP)

- **What happened:** GitHub issue #82 requested clearer reservation prepayment entry in Settings (separate major/minor units per currency instead of a single cents field).
- **What was done:** The settings UI now splits prepayment into whole + fractional fields when the tenant payment currency has decimal digits, and a single whole field for zero-decimal currencies; values remain stored as `reservation_prepayment_cents` with i18n updates across supported locales.
- **What was tested:** Tester verified EUR two-field persistence (5+50→550), JPY single-field path, saves, public tenant prepayment flag, currency-switch behaviour, Angular build, and landing smoke — overall **PASS**.
- **Why closed:** All verification criteria in the test report passed.
- **Closed at (UTC):** 2026-03-25 10:34
---

# Feedback / Prepayment amount needs to be separated

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/82

## Problem / goal

In **Settings → Reservations**, prepayment amount entry is awkward: users must mentally convert between cents and euros. The issue asks for separate controls (e.g. euros and cents) and to respect **multi-currency** behaviour—not a single hard-coded currency assumption.

## High-level instructions for coder

- Find reservation / prepayment settings in the frontend (and any API fields that store the amount).
- Design UX so major and minor units are clear per tenant currency (or use existing money-input patterns elsewhere in the app).
- Align with backend validation and stored representation (integer minor units vs display); avoid rounding surprises.
- Smoke-test with at least one non-EUR currency if the product supports it; document any limits in the issue if scope is constrained.

## Implementation (2026-03-25)

- **`front/src/app/settings/settings.component.ts`:** Replaced single `reservation_prepayment_cents` number field with **whole amount** + **minor units** (0–10^d−1) when `Intl` reports `maximumFractionDigits > 0` for the tenant’s **Payment settings** currency; **one whole-unit field** when the currency has no fractional digits (e.g. **JPY**, **KRW**). Values still stored as **`reservation_prepayment_cents`** (smallest currency unit). Changing **currency** in Payment settings re-splits the same stored total for display. Overflow in the minor field carries into the whole amount.
- **i18n:** Updated `SETTINGS.RESERVATION_PREPAYMENT` / hint; added `PREPAYMENT_MAJOR_LABEL`, `PREPAYMENT_MINOR_LABEL` (param `max`), `PREPAYMENT_WHOLE_AMOUNT_LABEL` in **en, de, es, fr, ca, zh-CN, hi**.
- **Backend:** Unchanged (still integer minor units).

## Testing instructions

### What to verify

- Settings → **Reservations** shows two numeric fields for prepayment when currency has decimals (e.g. **EUR**), and one field when it does not (e.g. **JPY**).
- Entering **5** whole + **50** minor with **EUR** persists **550** smallest units (same as old “cents” field).
- **Save** still works; booking page still treats amount **> 0** as prepayment enabled.
- Changing **currency** under Payment settings updates labels / field layout without corrupting the stored total until amounts are edited.

### How to test

- Stack up: `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (HAProxy e.g. **4202**).
- Manual: log in as tenant admin → **Settings** → **Reservations** (or `?section=reservations`) → exercise prepayment fields → **Save** → reload settings and confirm values.
- Repeat with **Payment settings** currency **JPY**: only whole amount; set e.g. **1000**, save, reload → should match.
- Quick smoke: `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` (navigates to `/settings`).

### Pass / fail

- **Pass:** Build succeeds (`docker compose … logs --tail=80 front` without TS/Angular errors); manual checks above behave as expected; landing smoke test exits **0**.
- **Fail:** Compile errors, wrong persisted total vs entered whole+minor, or JPY path showing two fraction fields.

---

## Test report

1. **Date/time (UTC):** 2026-03-25T10:25Z–10:33Z (approximate window for this run).
2. **Log window:** Same window for `docker compose … logs` sampling.
3. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **`BASE_URL`** `http://127.0.0.1:4202`; branch **`development`** @ `328b0f0`.
4. **What was tested:** Items under “What to verify” in Testing instructions above.
5. **Results:**
   - **Two fields for decimal currency (EUR path):** **PASS** — After login, `/settings?section=reservations` showed `#reservation_prepayment_major` and `#reservation_prepayment_minor` (Puppeteer one-off `/tmp/pos-prepayment-verify.mjs`).
   - **5 + 50 → 550 smallest units persisted:** **PASS** — Save + full page reload showed major `5`, minor `50`; after switching currency to JPY the single whole field showed `550` (same stored total).
   - **Save still works:** **PASS** — `PUT /tenant/settings` returned **200** in `pos-back` logs during saves.
   - **Booking / prepayment > 0:** **PASS** — `GET /api/public/tenants/1` returned `"reservation_prepayment_cents":550`; `book.component.html` still gates prepayment copy on `(reservation_prepayment_cents ?? 0) > 0`.
   - **Currency change updates layout without corrupting stored total:** **PASS** — JPY hid minor field and displayed `550` until currency restored to original via Payment tab; original currency re-selected and saved.
   - **Angular build:** **PASS** — `docker compose … logs --tail=80 front` ended with `Application bundle generation complete` (no TS/Angular errors in tail).
   - **Landing smoke:** **PASS** — `cd front && BASE_URL=http://127.0.0.1:4202 HEADLESS=1 npm run test:landing-version` exited **0**.
6. **Overall:** **PASS**
7. **Product owner feedback:** Reservation prepayment can now be entered as major and minor units for decimal currencies, and collapses to a single whole amount for zero-decimal currencies, while the backend still stores a single integer in smallest units. Switching currency re-interprets the same stored value correctly, so operators are less likely to mis-key amounts.
8. **URLs tested:**
   1. `http://127.0.0.1:4202/`
   2. `http://127.0.0.1:4202/login?tenant=1`
   3. `http://127.0.0.1:4202/dashboard` (post-login)
   4. `http://127.0.0.1:4202/settings?section=reservations`
   5. `http://127.0.0.1:4202/settings` (Payment tab via in-page tab index)
   6. `http://127.0.0.1:4202/api/public/tenants/1` (JSON, prepayment field)
9. **Relevant log excerpts:**
   - `pos-front` (tail): `Application bundle generation complete.` (no error lines in sampled tail).
   - `pos-back` (recent): `PUT /tenant/settings HTTP/1.1" 200 OK` and `GET /tenant/settings HTTP/1.1" 200 OK` during the session.
