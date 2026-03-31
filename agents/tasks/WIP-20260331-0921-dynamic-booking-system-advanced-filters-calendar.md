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
- **Backend:** Capacity cap applied in `_reservable_capacity_for_tenant`; optional `service` query (`lunch`|`dinner`) on `GET /reservations/book-week-slots` and `GET /reservations/next-available`; opening-hours validation + create/update use new booking fields; `PUT /reservations/{id}` uses `model_dump(exclude_unset=True)` for service/allergies updates; public `TenantSummary` includes `reservation_max_guests_per_slot`.
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
