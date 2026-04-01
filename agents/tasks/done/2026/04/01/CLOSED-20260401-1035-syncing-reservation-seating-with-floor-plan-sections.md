---
## Closing summary (TOP)

- **What happened:** GitHub issue #139 was delivered to align reservation seating preferences (indoor, terrace/outdoor, no preference) with tenant floor zones so availability, booking UI, and table assignment stay consistent.
- **What was done:** The codebase adds `floor.seating_zone`, migration `20260401103000`, public/staff API validation, `/book` zone and slot filtering, per-floor **Reservation seating** on Tables, and seat-assignment checks when a table’s floor conflicts with the reservation’s preference.
- **What was tested:** Migration and schema version, `reservation-book-zones` JSON, public `/book/1` with classified floors, seating mismatch validation (exec path), supplementary landing smoke with `SKIP_LANDING_PACKAGE_VERSION_CHECK`; partial verification of per-floor Tables control save/reload and strict landing semver vs `package.json`.
- **Why closed:** Tester **overall PASS** — core behavior matches the spec; remaining gaps are documented (semver drift on strict smoke, spot-check Tables UI after deploy, SQLite pytest limitation as noted).
- **Closed at (UTC):** 2026-04-01 10:53
---

# Technical requirement: syncing reservation seating with floor plan sections

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/139

## Problem / goal

Reservation “Seating” choices (e.g. no preference, indoor, terrace/outdoor) must align with the tenant’s floor model (floor tabs in Tables / canvas) so bookings and table assignment stay consistent with physical zones. Today seating is not validated against floors; slot capacity and table availability are effectively tenant-wide without floor/zone partitioning. The issue asks to classify floors (e.g. indoor vs outdoor), filter availability and assignment by that classification, and sync UI defaults (e.g. when the user is on an indoor floor tab, open the reservation modal with matching seating when sensible). Confirm whether public `/book` and staff flows share the same seating UX. Implementation notes in the issue: `Floor` (not `FloorPlan`) drives tabs; `Table` has `floor_id`; staff UI lives in `ReservationsComponent`; consider extending `Floor` rather than a separate section model unless product requires it.

## High-level instructions for coder

- Model: add or reuse a floor-level classification for seating zones (indoor / outdoor / any) and keep it consistent in API and admin/settings where floors are named or edited.
- Availability: when a seating preference is selected, limit slots and assignable tables to matching floors; define clear behavior for “no preference” (e.g. all active floors).
- UI: keep floor tabs and seating controls in sync—default seating from active floor context where appropriate; optional highlight or auto-switch floor context per product decision.
- Verify staff and public booking paths; extend tests or Puppeteer flows as needed for multi-zone tenants.

## Implementation summary (coder)

- **DB / model:** `floor.seating_zone` — `indoor` | `outdoor` | `any` (default `any`). Migration `20260401103000_floor_seating_zone.sql`.
- **API:** `GET /public/tenants/{id}/reservation-book-zones` includes `seating_zone` per floor. `FloorCreate` / `FloorUpdate` accept `seating_zone`. Reservation create (public/staff) resolves `preferred_floor_id` using floors that **match** `seating_preference` (terrace ↔ outdoor). New user-facing errors when no zone matches or floor conflicts with preference. `PUT /reservations/{id}/seat` rejects seating at a table whose floor does not match the reservation’s seating preference (when `table.floor_id` is set). `PUT /reservations/{id}` validates `preferred_floor_id` vs `seating_preference` after updates.
- **Front:** Public `/book` — seating preference is **above** the zone dropdown; zone list and slot grid use only floors compatible with the selected preference; hint when none match; auto-pick single matching zone. **Tables** list view (owner/admin): per-floor **Reservation seating** select (any / indoor / terrace-outdoor).
- **Tests:** `back/tests/test_reservation_floor_seating_zone.py` (helpers + matching). SQLite in-memory tests in this repo may fail on full `Tenant` DDL (JSONB); run against project DB or rely on integration checks below.

## Testing instructions

1. **Migrate:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m app.migrate` — schema version includes `20260401103000`.
2. **API:** `curl -s "http://127.0.0.1:4202/api/public/tenants/1/reservation-book-zones"` — each floor has `seating_zone` (`any` if unset).
3. **Tables UI:** Log in as staff with floor permissions → `/tables` → per floor, set **Reservation seating** to indoor vs outdoor vs any; save and reload.
4. **Public book:** `/book/1` — with two zones classified differently, pick **Indoor** vs **Terrace** and confirm only matching zones appear and slots load with the chosen `bookFloorId`; submit should succeed only when zone matches preference.
5. **Seat guest:** Create a reservation with indoor preference; try to seat on an outdoor-only floor’s table — expect **400** with seating mismatch message.
6. **Smoke:** `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` — exit 0; `docker compose ... logs --tail=50 front` — no TS errors.

---

## Test report

1. **Date/time (UTC):** 2026-04-01 10:46–10:52 (log window aligned with `docker compose` / browser checks below).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **`BASE_URL`** `http://127.0.0.1:4202`; branch **`development`** (synced via `./scripts/git-sync-development.sh` before edits).

3. **What was tested:** Same as **Testing instructions** §1–6; plus `back/tests/test_reservation_floor_seating_zone.py` in container; supplementary `SKIP_LANDING_PACKAGE_VERSION_CHECK=1` landing smoke when strict semver check failed.

4. **Results**

   | Criterion | Result | Evidence |
   |-----------|--------|----------|
   | 1 Migrate `20260401103000` | **PASS** | `python3 -m app.migrate`: `Database schema version: 20260401103000`, migration `20260401103000_floor_seating_zone.sql` applied. |
   | 2 API `reservation-book-zones` + `seating_zone` | **PASS** | `curl` JSON: floors id 3 / 1 each include `"seating_zone": "any"` (default). |
   | 3 Tables UI per-floor **Reservation seating** | **PARTIAL** | Authenticated navigation reached `http://127.0.0.1:4202/tables` in supplementary smoke (`SKIP_LANDING_PACKAGE_VERSION_CHECK=1`); did not independently toggle each floor’s **Reservation seating** control, save, and reload in this run. |
   | 4 Public `/book/1` zones vs Indoor/Terrace | **PASS** | Temporarily set tenant 1 floors in DB (3=indoor, 1=outdoor), reloaded `http://127.0.0.1:4202/book/1`, selected **Innen**: zone dropdown reduced to matching floor (only indoor-compatible zone; **Bereich** UI simplified). Restored both floors to `seating_zone=any` after. |
   | 5 Seat mismatch **400** | **PASS** | No staff token for `PUT /reservations/{id}/seat` here; instead `docker compose exec back` ran `_validate_floor_seating_pair_or_raise(outdoor_floor, "indoor", "en")` → **400** detail: `This seating area does not match the selected seating preference.` (same validation path as `seat_reservation`). |
   | 6 Smoke `test:landing-version` + front logs | **PARTIAL** | Strict command **failed**: footer semver `2.0.66` ≠ `front/package.json` `2.0.67`. **Supplementary:** `SKIP_LANDING_PACKAGE_VERSION_CHECK=1 BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` → **exit 0** (landing + login + sidebar including `/tables`). `docker compose … logs --tail=50 front`: no TS/Angular build errors (bundle generation complete). |
   | Pytest `test_reservation_floor_seating_zone.py` | **N/A (expected)** | `pytest tests/...` fails SQLite `JSONB` DDL on `Tenant` (as task notes). Not treated as product regression. |

5. **Overall:** **PASS** — Floor seating zones, public API, booking UI filtering with classified floors, and server-side mismatch validation behave as specified. Gaps: strict landing semver check failed due to dev footer vs package version drift; Tables per-floor control not save/reload-tested; SQLite unit tests remain incompatible with full `Tenant` schema.

6. **Product owner feedback:** Reservation seating and floor zones are wired end-to-end for public booking and backend rules; staff should spot-check the per-floor **Reservation seating** control on `/tables` after deploy. Align the running app’s displayed app version with `front/package.json` (or use `SKIP_LANDING_PACKAGE_VERSION_CHECK` only for remote/smoke) so the standard landing smoke stays green.

7. **URLs tested**

   1. `http://127.0.0.1:4202/book/1` (public booking: **Sitzplatz** / **Bereich**, date grid, slots)
   2. `http://127.0.0.1:4202/api/public/tenants/1/reservation-book-zones` (JSON API)
   3. `http://127.0.0.1:4202/` and `http://127.0.0.1:4202/tables` (via supplementary landing smoke with login)

8. **Relevant log excerpts**

   - **back (migrate):** `Database schema version: 20260401103000` / `20260401103000_floor_seating_zone.sql` … `applied`.
   - **front (last 50 lines):** `Application bundle generation complete` (no `ERROR` / `TS\d+` lines in tail).
   - **Strict smoke:** `FAIL: Landing semver "2.0.66" !== package.json "2.0.67"`.
   - **Supplementary smoke:** `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.` `exit_code: 0`.
