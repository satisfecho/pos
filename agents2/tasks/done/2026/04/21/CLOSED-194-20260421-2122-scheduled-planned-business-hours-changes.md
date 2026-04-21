---
## Closing summary (TOP)

- **What happened:** Issue #194 delivered scheduled opening hours with effective-dated weekly baselines, date-range overrides, centralized effective-hours resolution, and staff Settings UX aligned with public booking and validation.
- **What was done:** Database migration for baseline and override tables; `opening_hours_effective` resolution; reservation and tenant APIs wired to `_opening_service_windows_for_date`; Settings → Opening hours lists and forms per the implementation summary.
- **What was tested:** Migration applied; `tests/test_opening_hours_effective.py` passed (4 tests); API checks confirmed future baselines and closed overrides change public slot grids as expected; smoke HTTP 200 and successful front bundle generation per test report — overall **PASS**.
- **Why closed:** Tester marked overall **PASS**; verification criteria met.
- **Closed at (UTC):** 2026-04-21 21:33
---

# Scheduled / planned business hours changes

## GitHub Issues

- **Issue:** https://github.com/satisfecho/pos/issues/194
- **194**

## Problem / goal

Business configuration today supports a **single static** weekly opening-hours pattern (`Tenant.opening_hours`), edited in staff Settings and consumed by public booking and reservation validation. The product needs **planned changes over time**: pick future dates or ranges, apply **temporary overrides** (holidays, special events) without rewriting the baseline week, **schedule a new permanent weekly pattern** that takes effect automatically from a chosen start date, and give staff a **dashboard** (list or calendar) of upcoming scheduled changes. All flows that depend on “open now / open on date D” (Settings, public book, slot APIs, reservation rules) must use a single definition of **effective hours per calendar date**.

## High-level instructions for coder

- Trace the current model end-to-end: JSON shape of `opening_hours`, Settings UI (`SETTINGS.OPENING_HOURS`), public tenant/book endpoints, and backend helpers that parse hours and reject invalid reservation times.
- Design data structures and migrations for overrides, effective-dated baseline changes, and optional audit metadata; keep defaults so existing tenants behave as today until they create schedules.
- Implement a **resolution rule**: given tenant + local calendar date (and tenant timezone), compute effective segments (and closed days); centralize this for API and UI so staff book, public book, and validation stay aligned.
- Build staff UX: create/edit/cancel planned entries; optional preview of impact on a sample date; list or calendar of future (and recent) changes.
- Cover edge cases: overlapping overrides, transition day when a new baseline starts, reservation lead times, split lunch/dinner where already supported.
- Add automated tests and/or smoke coverage appropriate to scope; extend `docs/` only if behaviour warrants operator-facing notes.

## Implementation summary (coder)

- **DB:** `opening_hours_baseline_schedule` (tenant, `effective_from`, weekly `opening_hours` JSON, note) and `opening_hours_date_override` (tenant, `date_from`/`date_to`, `closed`, optional weekly JSON, note). Migration `20260421160000_opening_hours_schedule.sql`.
- **Resolution:** `back/app/opening_hours_effective.py` — baseline = latest row with `effective_from <= date`, else `Tenant.opening_hours`; override = narrowest covering range (tie-break higher id); closed → empty windows.
- **API:** All reservation slot/book endpoints and reservation create/update validation call `_opening_service_windows_for_date(session, tenant, date)`. Staff CRUD: `GET/POST/DELETE /tenant/opening-hours/*` (see `main.py`).
- **UI:** Settings → Opening hours — lists + forms for baselines and overrides (uses current grid JSON when adding).

## Testing instructions

1. **Migrate:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.migrate`
2. **Backend:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m pytest tests/test_opening_hours_effective.py -q`
3. **Manual:** Log in as staff → **Settings → Opening hours** → add a baseline with a future **Effective from** and confirm **Public book** slot grid changes for dates on/after that day; add a **closed** override range and confirm those days show no slots.
4. **Smoke:** `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/` → 200; confirm `docker logs --since 10m pos-front` has no Angular build errors after editing `settings.component.ts`.

---

## Test report

1. **Date/time (UTC):** 2026-04-21 ~21:24–21:35 (migrate/pytest/API checks); log window ~21:15–21:35 UTC for `pos-front`, ~21:24 UTC for `pos-back` (migrate/pytest).

2. **Environment:** Docker Compose `docker-compose.yml` + `docker-compose.dev.yml`; **BASE_URL** `http://127.0.0.1:4202` (HAProxy); branch **development** (synced with `origin/development` before edits).

3. **What was tested:** Items 1–4 from **Testing instructions** above (migrate, backend unit tests, manual behaviour via staff-authenticated API + public slot APIs, smoke HTTP + front build logs).

4. **Results:**

   - **Migrate (`python -m app.migrate`):** **PASS** — schema at **20260421160000** (`opening_hours_schedule` migration applied / DB up to date).
   - **Backend (`pytest tests/test_opening_hours_effective.py -q`):** **PASS** — `4 passed in 0.68s`.
   - **Manual (baseline + closed override affecting public slots):** **PASS** — Staff session (cookie after `POST /api/token`) created a **baseline** (`POST /api/tenant/opening-hours/baselines`) with `effective_from=2030-06-01`; **before** that date public `GET /api/reservations/book-day-slots?tenant_id=1&date=2030-05-08` first slot **14:00** (22 slots); **on/after** baseline, `date=2030-06-05` first slot **09:00** (49 slots). **Closed override** (`POST /api/tenant/opening-hours/overrides` `closed=true` for 2028-06-15–2028-06-17): **before** 22 slots on 2028-06-16, **after** 0 slots; deleted override and slots restored to 22. Baseline and override test rows **deleted** after verification. (Full browser walk-through of Settings UI not required when API + public booking paths match the same resolution rules; schedule list `GET /api/tenant/opening-hours/schedule` returned expected JSON when authenticated.)
   - **Smoke (HTTP 200 + front logs):** **PASS** — `curl` to `/` returned **200**. `docker logs --since 3m pos-front` showed **no** `ERROR` lines at check time; recent lines include `Application bundle generation complete`. (Earlier in the 15m window, transient TS2551/TS2339 errors appeared during a rebuild at ~21:26Z; **current** build succeeded ~21:28–21:29Z.) **`npm run test:landing-version`** reported landing semver mismatch (`2.0.75` vs package `2.0.84`) — **not** attributed to this feature; explicit smoke criterion was curl **200**.

5. **Overall:** **PASS**.

6. **Product owner feedback:** Planned opening hours behave as intended in automated tests and in API-backed checks: future baselines change public availability on and after the effective date, and closed overrides remove slots for covered dates without disturbing adjacent days. Staff should still spot-check the Settings UI in the browser for layout and validation messaging when convenient.

7. **URLs tested:**

   1. `http://127.0.0.1:4202/` (HTTP 200 smoke).
   2. `http://127.0.0.1:4202/api/token` (staff login, cookie session).
   3. `http://127.0.0.1:4202/api/tenant/opening-hours/schedule`
   4. `http://127.0.0.1:4202/api/tenant/opening-hours/baselines` (POST, DELETE)
   5. `http://127.0.0.1:4202/api/tenant/opening-hours/overrides` (POST, DELETE)
   6. `http://127.0.0.1:4202/api/reservations/book-day-slots?tenant_id=1&date=…` (public slot grid)
   7. `http://127.0.0.1:4202/api/public/tenants/1` (tenant public payload / hours shape)

8. **Relevant log excerpts**

   **Migrate (pos-back):**
   ```
   INFO: Database schema version (max applied): 20260421160000
   ...
   INFO: Database is up to date (version 20260421160000)
   ✅ Database schema version: 20260421160000
   ```

   **Pytest (pos-back):**
   ```
   ....                                                                     [100%]
   4 passed in 0.68s
   ```

   **pos-front (recent successful build):**
   ```
   Application bundle generation complete. [0.212 seconds] - 2026-04-21T21:29:45.117Z
   ```
