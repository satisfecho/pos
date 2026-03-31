---
## Closing summary (TOP)

- **What happened:** Tester completed verification for GitHub issue #129 (dynamic seating zones from floor/table data for public booking and admin).
- **What was done:** Migrations added `floor.is_active` and `reservation.preferred_floor_id`; migration runner applies any version missing from `schema_version`; public zones API, floor-scoped slot/capacity and demand rules, public POST validation, and admin Tables UI for zone booking/reorder were implemented per the task.
- **What was tested:** Migrations and `--sync-idempotent`, `GET /public/tenants/{id}/reservation-book-zones`, DB columns, `/book/1` and public Puppeteer flow, inactive-floor exclusion, tenant isolation, `preferred_floor_id` on create, Angular/front logs, and landing smoke test — **overall PASS**.
- **Why closed:** All pass/fail criteria in the test report were met.
- **Closed at (UTC):** 2026-03-31 13:36
---

# Reservations: dynamic seating zones from Floor/Table data (public booking + admin)

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/129

## Problem / goal

Public booking should follow the real floor layout: only offer seating zones that exist, have reservable tables, and are active; use owner-defined zone names; hide the location control when a single zone applies; support inactive zones (for example a closed terrace). Today, floors and `Table.floor_id` exist for staff layout, but public `/book` has no zone field, reservations do not carry floor preference, and slot capacity uses all tenant tables without floor filtering.

## High-level instructions for coder

- Add a tenant-scoped public API that lists bookable zones (reuse or extend `Floor` / equivalent): each zone has at least one reservable table, respect sort order, exclude inactive zones and zones with no tables.
- Extend admin/owner UI so zones can be created, renamed, reordered, and marked active/inactive (build on existing floor management if present).
- Public booking UI: show a location/zone selector only when there are two or more active bookable zones; otherwise omit it and define whether capacity is that zone only or unchanged global behavior per product decision.
- When a zone is selected, availability and `createReservationPublic` must count only tables on that floor; document and implement behavior for `floor_id` null tables.
- Optionally persist `preferred_floor_id` (or equivalent) on `Reservation` for staff visibility.
- Preserve tenant isolation on all new/changed endpoints; align with existing capacity rules (walk-in reserved tables, turn times, etc.).
- Add migrations and i18n for new strings; extend smoke/Puppeteer for `/book/:tenantId` if the flow changes.

## Implementation summary (coder)

- **Migration:** `back/migrations/20260331131400_floor_is_active_reservation_preferred_floor.sql` — `floor.is_active` (default true), `reservation.preferred_floor_id` (FK, nullable, ON DELETE SET NULL).
- **Migration runner fix (`back/app/migrate.py`):** Pending migrations are those whose **version is not in `schema_version`** (replacing `version > MAX(version)`), so older files are not skipped after a newer timestamp migration was applied first. Files are sorted by version; `run_migrations` uses `self.migrations_dir` consistently.
- **Repair if DDL is missing but a row exists in `schema_version`:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.migrate --sync-idempotent` (idempotent SQL only).
- **Public API:** `GET /public/tenants/{tenant_id}/reservation-book-zones` returns `{ floors: [{ id, name, sort_order }] }` for active floors that have at least one table on that floor.
- **Slot APIs:** `floor_id` optional query on `book-week-slots`, `book-month-day-states`, `book-day-slots`, `next-available`; staff `GET /reservations/slot-capacity` also accepts `floor_id`.
- **Venue-wide capacity:** When no `floor_id` is used, all tenant tables participate (including `table.floor_id` null). **Zone-scoped capacity:** Only tables with `table.floor_id == floor_id`; null-floor tables do not count toward a specific zone’s pool.
- **Demand:** Global = all parties on the slot. Zone = parties with `preferred_floor_id == floor`, plus parties with no preferred floor but a **seated** table on that floor (`table.floor_id`).
- **Public POST `/reservations`:** If there are ≥2 bookable zones, `preferred_floor_id` is required (or send the chosen zone). If exactly one bookable zone, backend defaults to that zone. If none (e.g. only unassigned tables), booking stays venue-wide. Staff may set any tenant floor id or omit.
- **Admin UI:** Tables → list/tiles view — per-floor checkbox “Open for online booking” (`is_active`) and ↑↓ reorder (`sort_order`). Rename/add/delete floors unchanged (canvas + existing APIs).

## Testing instructions

### What to verify

- `python -m app.migrate` applies any migration whose version is **missing** from `schema_version` (not only “after MAX”).
- Migrate applies on dev DB; `/book/:tenantId` loads; with **two** active bookable zones, a **Seating area** dropdown appears and slot grid respects the selection; with **one** zone, no dropdown and booking still works.
- Inactive floor (unchecked) disappears from public zones list; capacity for other zones unchanged.
- New reservation row has `preferred_floor_id` when applicable; API responses include `preferred_floor_id` / `preferred_floor_name` where loaded.
- If columns are missing but migration is marked applied: `--sync-idempotent` repairs DDL without duplicate inserts.

### How to test

- Run migrations: `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.migrate`
- Optional repair: `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.migrate --sync-idempotent`
- **API smoke:** `curl -s "http://127.0.0.1:4202/api/public/tenants/1/reservation-book-zones"` — expect HTTP 200 and JSON `floors` array (not 500).
- **DB:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T db psql -U pos -d pos -c '\d floor'` — expect `is_active`; `\d reservation` — expect `preferred_floor_id`.
- **Frontend:** `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front`; `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` — no TS/Angular errors.
- **Optional:** `node front/scripts/debug-reservations-public.mjs` with `BASE_URL`; manual `/book/1` with two floors in DB.

### Pass/fail criteria

- **Pass:** Migration runner behavior as above; `reservation-book-zones` returns 200 with JSON; Angular build clean in front logs; landing smoke test exits 0; public book page shows zone UI only when ≥2 bookable zones and submits without 400 from location rule when configured.
- **Fail:** Migration errors; TS/build errors in front logs; 500 on `reservation-book-zones` when DB has columns; 400 on public booking when zones are misconfigured; cross-tenant data in zone endpoint.

---

## Prior test run (superseded)

An earlier run reported `schema_version` out of sync with DDL and HTTP 500 on `reservation-book-zones`. The migration runner change addresses **skipped** migrations; `--sync-idempotent` addresses **orphaned** `schema_version` rows without matching columns. Re-verify using the steps above.

---

## Test report

1. **Date/time (UTC):** 2026-03-31T13:33:50Z – 2026-03-31T13:36:00Z (approximately). Log window: same interval on `pos-front` / `pos-back` via `docker compose … logs`.

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202` (HAProxy); branch `development` @ `7184e05`.

3. **What was tested:** Per **Testing instructions** / **What to verify**: migration runner and `--sync-idempotent`; public `reservation-book-zones`; DB columns; Angular/front logs and landing smoke; public `/book/1` (Puppeteer + API POST); inactive floor exclusion; tenant isolation; `preferred_floor_id` on create response.

4. **Results**

   - Migration applies missing versions (not only after MAX) — **PASS** — `python -m app.migrate` reported all files including `20260331131400_floor_is_active_reservation_preferred_floor.sql` as applied; “Database is up to date (version 20260331190000)”.
   - Migrate on dev DB; `/book/1` loads — **PASS** — Puppeteer navigated to `http://127.0.0.1:4202/book/1`, `.book-form` visible.
   - ≥2 bookable zones: seating area required; UI validation — **PASS** — With two active zones, `debug-reservations-public.mjs` showed form error “Please choose a seating area.” (expected until script selects a zone). **PASS** — `POST /api/reservations` with valid `preferred_floor_id` (floor 3), slot `2026-03-31 15:45`, returned 200 and body included `"preferred_floor_id":3,"preferred_floor_name":"A dentro"`.
   - One bookable zone: no seating prompt; booking succeeds — **PASS** — Temporarily set `floor.id=1` `is_active=false`; `reservation-book-zones` returned one floor; `HEADLESS=1 node front/scripts/debug-reservations-public.mjs` exited 0 (“Public user successfully reserved”); then restored `is_active=true`.
   - Inactive floor omitted from public zones list — **PASS** — Before restore, `GET …/tenants/1/reservation-book-zones` returned only `{"id":3,"name":"A dentro",…}`; after restore, two floors again.
   - `preferred_floor_id` / `preferred_floor_name` in API where applicable — **PASS** — See POST response above; reservation id **1866** created during test (dev data).
   - `--sync-idempotent` — **PASS** — Completed without error; log ended with “Sync-idempotent finished”.
   - `reservation-book-zones` 200 JSON, no 500 — **PASS** — e.g. `{"floors":[…]}` HTTP 200.
   - Cross-tenant — **PASS** — `GET …/tenants/2/reservation-book-zones` → `{"floors":[]}`; `GET …/tenants/99999/…` → HTTP 404 “Tenant not found”.
   - Angular build / landing smoke — **PASS** — `docker compose … logs --tail=80 front` shows “Application bundle generation complete” without errors; `npm run test:landing-version` exit code **0** (ended 2026-03-31T13:34:37Z).

5. **Overall:** **PASS** (all criteria met).

6. **Product owner feedback:** Public booking now respects real zones: guests must pick an area when multiple floors are open for booking, and a single open zone stays frictionless. Staff can see preferred floor on the reservation payload. The legacy public Puppeteer script should be updated to choose a seating area when two zones exist so CI-style runs stay green without mutating floors.

7. **URLs tested**

   1. `http://127.0.0.1:4202/`
   2. `http://127.0.0.1:4202/book/1`
   3. `http://127.0.0.1:4202/api/public/tenants/1/reservation-book-zones`
   4. `http://127.0.0.1:4202/api/public/tenants/2/reservation-book-zones`
   5. `http://127.0.0.1:4202/api/public/tenants/99999/reservation-book-zones`
   6. `http://127.0.0.1:4202/api/reservations` (POST)
   7. `http://127.0.0.1:4202/api/reservations/book-week-slots?tenant_id=1&party_size=3&week_anchor=2026-03-31` (with and without `floor_id=3` — payloads equal byte length on this dataset)
   8. Landing test also hit staff routes under same origin (`/dashboard`, `/reservations`, `/tables`, … per script).

8. **Relevant log excerpts**

   - **pos-front** (build): `Application bundle generation complete. [0.735 seconds] - 2026-03-31T13:21:33.079Z` (no TS/NG errors in tail).
   - **pos-back:** `POST /reservations HTTP/1.1" 200 OK` after successful zone booking; `GET /public/tenants/1/reservation-book-zones HTTP/1.1" 200 OK`; `GET /public/tenants/99999/reservation-book-zones HTTP/1.1" 404 Not Found`.
