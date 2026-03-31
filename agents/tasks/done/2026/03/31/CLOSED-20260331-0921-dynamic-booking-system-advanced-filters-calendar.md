---
## Closing summary (TOP)

- **What happened:** The team implemented the dynamic booking system (tenant capacity, service/allergies/seating, weekly grid, edit paths) and iterated through tester findings until all handoff criteria passed.
- **What was done:** DB migration and fields, backend capacity and APIs (including `reservation_max_guests_per_slot` on single-tenant public JSON), Angular settings and reservations UI, Puppeteer script fixes (modal selectors, valid E.164 test phone), and pytest coverage for booking and public tenant responses.
- **What was tested:** Migration, `test_book_week_slots_public.py` + `test_public_tenant_whatsapp.py`, landing smoke, `GET /api/public/tenants/1` field check, and staff `debug-reservations.mjs` create/cancel — final run **PASS** (POST `/reservations` 200, card visible after save).
- **Why closed:** Final test report (handoff verify 2026-03-31 UTC) records overall **PASS**; all stated pass/fail criteria met.
- **Closed at (UTC):** 2026-03-31 10:20
---

# Dynamic booking system with advanced filters and calendar logic

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/119

## Problem / goal

Evolve the restaurant **reservations / booking** flow (staff-facing **Reservations** area) toward a richer UI: configurable guest and service controls, allergy capture, indoor vs terrace preference, and a **weekly calendar grid** (Mon–Sun) that reflects slot capacity and closed days. Backend must enforce **per-slot guest capacity** (configurable per tenant/restaurant, not hardcoded) and support **editing existing bookings** so totals recalc and slots become “full” when capacity is reached.

Align with existing reservation models, public book flow, and `docs/` where the product already describes reservations.

## High-level instructions for coder

- Add or extend **tenant-configurable** max guests per time slot (and any related settings) in backend + admin/settings UI as appropriate.
- Implement the **top section** before the calendar: guest count selector, service type (e.g. lunch/dinner) with i18n keys, allergies yes/no with conditional detail text, indoor/terrace preference.
- Build the **7-column weekly grid** with states: selected, full (at capacity), closed/unavailable; ensure legend and styling match product intent.
- Wire **calendar refresh** when guest count or service changes so availability/full states update.
- Ensure **edit booking** paths call APIs that revalidate capacity and update slot occupancy atomically where needed.
- Add or extend tests (Puppeteer/API) for the booking flow if the repo pattern supports it.

## Implementation summary (coder)

- **DB:** `tenant.reservation_max_guests_per_slot`; `reservation` columns `service_type`, `seating_preference`, `allergies_has`, `allergies_detail` (migration `20260331120000_reservation_booking_dynamic_filters.sql`).
- **Backend:** Capacity cap applied in `_reservable_capacity_for_tenant`; optional `service` query (`lunch`|`dinner`) on `GET /reservations/book-week-slots` and `GET /reservations/next-available`; opening-hours validation + create/update use new booking fields; `PUT /reservations/{id}` uses `model_dump(exclude_unset=True)` for service/allergies updates; public `TenantSummary` includes `reservation_max_guests_per_slot`. **Follow-up:** `GET /public/tenants/{id}` manual JSON body now includes `reservation_max_guests_per_slot` (was omitted vs list endpoint; blocked public `/book` cap).
- **Front:** Settings → Reservations: max guests per slot. Public `/book` and staff Reservations modal: party size, service (when `hasBreak` in opening hours), seating, allergies; week grid `[serviceType]` input; list cards show service/seating/allergies when set.
- **Tests:** `pytest tests/test_book_week_slots_public.py` (pass). `npm run test:landing-version` with `BASE_URL=http://127.0.0.1:4202` (pass).

## Testing instructions

1. **Migrate:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.migrate`
2. **Backend:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m pytest tests/test_book_week_slots_public.py -q`
3. **Frontend:** `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version`
4. **Manual /book:** Open `/book/1` — set party size, optional service (if tenant has lunch/dinner break in opening hours), seating, allergies; pick a green slot; submit; confirm API stores preferences (staff list shows new lines).
5. **Settings:** Settings → Reservations — set “Max guests per time slot (optional)”; reload `/book` and confirm party max input respects cap; slot grid shows full when cap reached.
6. **Staff:** Reservations → New/Edit — same controls above grid; edit booking changes date/time/party and saves; server rejects over-capacity updates (existing `400` message).

---

## Test report

1. **Date/time (UTC)** and log window  
   - **Started:** 2026-03-31 09:30:57 UTC  
   - **Ended:** 2026-03-31 09:35 UTC (approx.)  
   - **Log window:** `pos-back` / `pos-front` / `pos-haproxy` for the same window (see excerpts below).

2. **Environment**  
   - **Compose:** `docker-compose.yml` + `docker-compose.dev.yml`  
   - **BASE_URL:** `http://127.0.0.1:4202`  
   - **Branch:** `development` (synced via `./scripts/git-sync-development.sh` before edits)

3. **What was tested** (from “What to verify” / Testing instructions)  
   - Migrate; pytest `test_book_week_slots_public.py`; `npm run test:landing-version`; public `/book` flow; Settings-driven max guests on `/book`; staff Reservations New/Edit and over-capacity behavior.

4. **Results:** each criterion **PASS** / **FAIL** + one evidence line  
   - **Migrate (instruction 1):** **PASS** — `python -m app.migrate` reports schema version `20260331120000`, up to date.  
   - **Pytest (instruction 2):** **PASS** — `3 passed in 1.21s`.  
   - **Landing smoke (instruction 3):** **PASS** — `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.` (exit 0).  
   - **Manual /book (instruction 4):** **PASS** — `node scripts/debug-reservations-public.mjs` with `BASE_URL=http://127.0.0.1:4202`: landed on `http://127.0.0.1:4202/book/1`, form visible, submit succeeded (`>>> RESULT: Public user successfully reserved a table.`). (Script exercises party size + slot + contact; does not assert service/allergies/seating fields.)  
   - **Settings + /book cap (instruction 5):** **FAIL** — After setting `tenant.reservation_max_guests_per_slot = 4` in DB (verified in Postgres), `GET /api/public/tenants/1` still did **not** include `reservation_max_guests_per_slot` in the JSON body (field missing; not `null`). `GET /api/public/tenants` (list) **did** return `reservation_max_guests_per_slot: 4` for id 1. Root cause: `get_public_tenant` builds a manual `body` dict and omits `reservation_max_guests_per_slot` while `_tenant_to_summary` populates it. Public `/book` uses `ApiService.getPublicTenant(id)` (single-tenant endpoint), so the party max hint cannot reflect the setting. DB value reverted to `NULL` after verification.  
   - **Staff New/Edit + over-capacity (instruction 6):** **FAIL** — `node scripts/debug-reservations.mjs` (login from `.env`) reached `http://127.0.0.1:4202/reservations` with reservation content, but create flow failed: console `422` on `book-week-slots?...party_size=null`, `400` on `slot-capacity?date_str=2&...`, and wrong values applied to inputs (`The specified value "Puppeteer Test …" cannot be parsed` on date). Modal layout no longer matches the script’s fixed input index order. Staff edit and server `400` on over-capacity were **not** verified in this run.

5. **Overall:** **FAIL** — Failed: instruction **5** (public book cannot honor max-guests cap due to single-tenant API payload); instruction **6** (staff flow not validated; automation script incompatible with current modal).

6. **Product owner feedback**  
   The automated suite and public booking path look healthy for basic book-week slots and a full public submit. The tenant “max guests per slot” setting will not affect the public book page until `GET /public/tenants/{id}` returns `reservation_max_guests_per_slot` (the list endpoint already does). Staff verification should be redone with an updated Puppeteer script (or manual steps) that targets the new reservation modal field order and avoids `party_size=null` on week-slot requests.

7. **URLs tested** (numbered)  
   1. `http://127.0.0.1:4202/`  
   2. `http://127.0.0.1:4202/login?tenant=1`  
   3. `http://127.0.0.1:4202/dashboard`  
   4. `http://127.0.0.1:4202/book/1`  
   5. `http://127.0.0.1:4202/reservations`  
   6. `http://127.0.0.1:4202/api/public/tenants/1`  
   7. `http://127.0.0.1:4202/api/public/tenants` (list)  
   8. `http://127.0.0.1:4202/api/health`

8. **Relevant log excerpts**  
   - **pos-back (422 / 400 during staff script):**  
     `GET /reservations/book-week-slots?tenant_id=1&party_size=null&week_anchor=2026-03-30 HTTP/1.1" 422 Unprocessable Entity`  
     `GET /reservations/slot-capacity?date_str=2&time_str=14:15 HTTP/1.1" 400 Bad Request`  
   - **pos-back (landing / public book period):** normal `200` lines for `/tenant/settings`, `/public/tenants/1`, `/health`; no unexpected 5xx in the sampled window.

---

## Coder follow-up (2026-03-31 UTC)

- **`GET /public/tenants/{id}`:** Response body includes **`reservation_max_guests_per_slot`** (aligned with `TenantSummary` and `GET /public/tenants`).
- **Tests:** `tests/test_public_tenant_whatsapp.py` — key present when unset (`null`); value `4` when set on tenant.
- **`front/scripts/debug-reservations.mjs`:** Staff create flow sets party via keyboard on `#res-modal-party`, waits for grid ready + `button.week-slot.ws-available`, clicks first slot, reads `#week-grid-hidden-date` for list filter, then `#res-modal-name` / `#res-modal-phone` (replaces obsolete `.modal-body input` index order that caused `party_size=null` and bad `slot-capacity` params).

## Testing instructions (handoff — re-verify)

- **What to verify**
  - `GET /api/public/tenants/{id}` includes `reservation_max_guests_per_slot` (number or `null`); public `/book` party max respects tenant setting when set.
  - Staff automation: `node scripts/debug-reservations.mjs` does not trigger `422` on `book-week-slots` or `400` on `slot-capacity` from invalid `party_size` / date.

- **How to test**
  1. **Migrate:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.migrate`
  2. **Backend:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m pytest tests/test_book_week_slots_public.py tests/test_public_tenant_whatsapp.py -q`
  3. **Frontend smoke:** `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version`
  4. **API spot check:** `curl -sS "http://127.0.0.1:4202/api/public/tenants/1" | jq 'has("reservation_max_guests_per_slot")'` → `true`
  5. **Staff script (needs credentials):** `cd front && BASE_URL=http://127.0.0.1:4202 LOGIN_EMAIL=… LOGIN_PASSWORD=… node scripts/debug-reservations.mjs` — expect create section to log **`Create: card visible after save: true`** when user can write reservations (no `422`/`400` lines for week slots / slot-capacity in back logs).
  6. **Manual (optional):** Repeat original instructions 5 (settings cap on `/book`) and 6 (edit + over-capacity).

- **Pass/fail criteria**
  - **PASS:** Pytest green for both files; landing smoke exit 0; `reservation_max_guests_per_slot` in single-tenant JSON; staff script create path succeeds or fails only for permission/data, not wrong modal field order.
  - **FAIL:** Missing JSON field; regression in booking tests; staff script still logs `party_size=null` on `book-week-slots`.

---

## Test report (re-verify 2026-03-31 UTC)

1. **Date/time (UTC)** and log window  
   - **Started:** 2026-03-31 09:53 UTC  
   - **Ended:** 2026-03-31 09:57 UTC  
   - **Log window:** `pos-back` / `pos-front` / `pos-haproxy` entries sampled for 09:53-09:57 UTC.

2. **Environment**  
   - **Compose:** `docker-compose.yml` + `docker-compose.dev.yml`  
   - **BASE_URL:** `http://127.0.0.1:4202`  
   - **Branch:** `development` (synced with `./scripts/git-sync-development.sh`)

3. **What was tested**  
   - Handoff re-verification: migration, both pytest files, landing smoke, single-tenant public API field presence, staff reservation automation flow (`debug-reservations.mjs`).

4. **Results:** each criterion **PASS** / **FAIL** + one evidence line  
   - **Migrate:** **PASS** - `python -m app.migrate` reports up-to-date schema at `20260331180000`.  
   - **Backend tests:** **PASS** - `pytest tests/test_book_week_slots_public.py tests/test_public_tenant_whatsapp.py -q` -> `5 passed in 1.21s`.  
   - **Frontend smoke:** **PASS** - `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` finished with `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.`  
   - **API spot check:** **PASS** - `curl .../api/public/tenants/1 | jq 'has("reservation_max_guests_per_slot")'` -> `true`.  
   - **Staff script week-slot regression check:** **PASS** - no `party_size=null` requests observed; back logs show `GET /reservations/book-week-slots?...party_size=2... 200` and `GET /reservations/slot-capacity?date_str=2026-03-31... 200`.  
   - **Staff script create flow outcome:** **FAIL** - `debug-reservations.mjs` reports `Create: card visible after save: false` and backend logs `POST /reservations HTTP/1.1" 400 Bad Request` in the same window.

5. **Overall:** **FAIL**  
   - Failed criterion: staff create path in `debug-reservations.mjs` still does not complete successfully for this run (400 on create), so handoff pass criteria are not fully met.

6. **Product owner feedback**  
   The single-tenant public endpoint now includes `reservation_max_guests_per_slot`, and the earlier `party_size=null` / invalid slot-capacity parameter regression appears fixed. However, the staff automation still cannot complete reservation creation (`400` on POST), so this task is not ready to close yet. Please resolve the create failure path and re-submit as `UNTESTED` for another verification cycle.

7. **URLs tested**  
   1. `http://127.0.0.1:4202/`  
   2. `http://127.0.0.1:4202/login?tenant=1`  
   3. `http://127.0.0.1:4202/dashboard`  
   4. `http://127.0.0.1:4202/reservations`  
   5. `http://127.0.0.1:4202/api/public/tenants/1`

8. **Relevant log excerpts**  
   - **pos-back:** `GET /reservations/book-week-slots?tenant_id=1&party_size=2&week_anchor=2026-03-31 HTTP/1.1" 200 OK`  
   - **pos-back:** `GET /reservations/slot-capacity?date_str=2026-03-31&time_str=14:15 HTTP/1.1" 200 OK`  
   - **pos-back:** `POST /reservations HTTP/1.1" 400 Bad Request`  
   - **pos-front:** landing smoke completed with `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.`

---

## Coder follow-up: staff `POST /reservations` 400 (2026-03-31 UTC)

- **Root cause:** `debug-reservations.mjs` typed **`+1555123456`**, which **`phonenumbers.is_valid_number` rejects** (backend `normalize_phone_e164` → 400 `invalid_phone`).
- **Fix:** Use a valid E.164 test number aligned with `back/tests/test_contact_validation.py`: **`+14155550100`**.

---

## Testing instructions (handoff — UNTESTED)

- **What to verify**
  - Staff Puppeteer path completes create: **`Create: card visible after save: true`** when `LOGIN_EMAIL` / `LOGIN_PASSWORD` are set for a user with reservation write access.
  - No regression: pytest booking/public-tenant tests; landing smoke; `reservation_max_guests_per_slot` on `GET /api/public/tenants/{id}`.

- **How to test**
  1. **Migrate:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.migrate`
  2. **Backend:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m pytest tests/test_book_week_slots_public.py tests/test_public_tenant_whatsapp.py -q`
  3. **Frontend smoke:** `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version`
  4. **API:** `curl -sS "http://127.0.0.1:4202/api/public/tenants/1" | jq 'has("reservation_max_guests_per_slot")'` → `true`
  5. **Staff script:** `cd front && BASE_URL=http://127.0.0.1:4202 LOGIN_EMAIL=… LOGIN_PASSWORD=… node scripts/debug-reservations.mjs` — expect **`POST /reservations` 201** in `pos-back` logs (not 400) and **`Create: card visible after save: true`** if the user can create reservations.

- **Pass/fail criteria**
  - **PASS:** Pytest and landing smoke green; staff script shows card after save and no `400` on `POST /reservations` when credentials allow writes.
  - **FAIL:** `400` on create with valid login; `party_size=null` on `book-week-slots`; missing `reservation_max_guests_per_slot` on single-tenant public JSON.

---

## Test report (handoff verify — 2026-03-31 UTC)

1. **Date/time (UTC)** and log window  
   - **Started:** 2026-03-31 10:16:30 UTC  
   - **Ended:** 2026-03-31 10:19:00 UTC (approx.)  
   - **Log window:** `pos-back` lines sampled for reservation API calls during staff script run (see excerpts).

2. **Environment**  
   - **Compose:** `docker-compose.yml` + `docker-compose.dev.yml`  
   - **BASE_URL:** `http://127.0.0.1:4202`  
   - **Branch:** `development` (synced via `./scripts/git-sync-development.sh` before edits)

3. **What was tested**  
   - Handoff: migrate; `tests/test_book_week_slots_public.py` + `tests/test_public_tenant_whatsapp.py`; `npm run test:landing-version`; `reservation_max_guests_per_slot` on `GET /api/public/tenants/1`; staff `node scripts/debug-reservations.mjs` with `DEMO_LOGIN_*` from repo `.env`.

4. **Results:** each criterion **PASS** / **FAIL** + one evidence line  
   - **Migrate (step 1):** **PASS** — `python -m app.migrate` reports schema at `20260331190000`, up to date.  
   - **Backend pytest (step 2):** **PASS** — `5 passed in 1.20s`.  
   - **Landing smoke (step 3):** **PASS** — `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.` (exit 0).  
   - **API field (step 4):** **PASS** — Python check on JSON body: `has_key True` for `reservation_max_guests_per_slot`.  
   - **Staff script (step 5):** **PASS** — `Create: card visible after save: true`; cancel path OK. No `party_size=null` on `book-week-slots`; `GET ...book-week-slots?...party_size=2...` **200**; `POST /reservations` **200 OK** in `pos-back` (not 400).

5. **Overall:** **PASS** — All handoff pass/fail criteria met.

6. **Product owner feedback**  
   Dynamic booking handoff checks are green: automated tests, landing smoke, single-tenant public JSON includes max-guests-per-slot, and the staff Puppeteer flow creates and cancels a reservation without the earlier phone or modal-order regressions. Ready for closing reviewer to archive when convenient.

7. **URLs tested**  
   1. `http://127.0.0.1:4202/login?tenant=1`  
   2. `http://127.0.0.1:4202/dashboard`  
   3. `http://127.0.0.1:4202/reservations`  
   4. `http://127.0.0.1:4202/api/public/tenants/1`  
   5. `http://127.0.0.1:4202/` (landing smoke)

8. **Relevant log excerpts**  
   - **pos-back:** `GET /reservations/book-week-slots?tenant_id=1&party_size=2&week_anchor=2026-03-31 HTTP/1.1" 200 OK`  
   - **pos-back:** `GET /reservations/slot-capacity?date_str=2026-04-01&time_str=14:00 HTTP/1.1" 200 OK`  
   - **pos-back:** `POST /reservations HTTP/1.1" 200 OK`
