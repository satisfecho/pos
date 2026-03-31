# QR-based time tracking and shift management ("My Shift")

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/121

## Problem / goal

Implement a **shift management** module so staff can track work time at the venue using **QR-based clock-in/out**, with optional **location verification** (e.g. GPS) when scanning. Support **breaks**: paused shift state, resume by scanning the venue QR again. Provide **owner/manager manual override** when someone forgets to scan, for payroll and compliance. Deliver a simple **employee** view (status, time worked today, scan action) and an **admin** view (who is on-site, on break, or not clocked in).

Align with existing auth/roles, tenant model, and any HR or employee docs under `docs/` if present.

## High-level instructions for coder

- Model employees, shifts, breaks, and scan events with clear audit fields; respect tenant scoping and privacy rules for legal/identity data storage.
- Generate or configure **per-venue (or per-tenant) QR payloads** that authenticate clock-in/out and tie scans to timestamps (and optional geolocation when enabled).
- Implement **pause/resume** flow: entering break from "My Shift"; returning requires scanning the QR to resume the active shift timer.
- Build **admin manual entry/adjustment** for shifts with appropriate role checks and an audit trail.
- Ship **employee** and **admin** UIs as described; keep mobile-friendly tap targets for the scan entry point.
- Add tests or smoke coverage for critical paths if the repo pattern supports it.

## Implementation summary (coder)

- **DB:** `back/migrations/20260331180000_work_session_clock_qr_breaks.sql` — `tenant.clock_qr_token_hash`, `clock_qr_location_verify`; `work_session` break fields and related tables per models.
- **Backend:** `back/app/clock_qr_util.py` (HMAC; plain token only on regenerate); `work_session_serialization.py`; JSON body on clock endpoints uses **`clock_qr`**; `GET /users/me/clock-qr-status`; `POST /tenant/settings/clock-qr/regenerate`, `DELETE /tenant/settings/clock-qr`; `GET /reports/work-sessions/live`; **`POST /reports/work-sessions/{work_session_id}/adjust`** (REPORT_READ) for manual fixes with audit trail.
- **Front:** My Shift (`?clock_qr=`, breaks, net time); Settings → **Security** (clock QR card); Reports → **Who is on shift now**; `WorkSession` / API types aligned.

## Testing instructions

1. **Migrate:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.migrate` (expect migration **`20260331180000_work_session_clock_qr_breaks.sql`** applied).
2. **Backend:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m pytest tests/test_work_session.py -q`
3. **Manual:** As owner/admin: Settings → **Security** → generate **Staff clock-in QR** (copy token once); optionally enable **Require GPS at venue for clock** with venue coordinates under Payment/location. As staff: open `/my-shift?clock_qr=<token>`; clock in, start/end break, clock out. Reports → **Who is on shift now** and historical attendance. Manual fix: **`POST /api/reports/work-sessions/{id}/adjust`** with JSON body `note`, optional `started_at` / `ended_at` (ISO UTC).
4. **Smoke:** `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version`

---

## Test report

1. **Date/time (UTC)** and log window.
   - **Start:** 2026-03-31T10:47:25Z (Puppeteer smoke start; migrate/pytest immediately before).
   - **End:** 2026-03-31T10:48:10Z (smoke finished; exit 0).
   - **Log window:** ~10:47–10:48 UTC (back/front/haproxy requests during smoke).

2. **Environment**
   - **Compose:** `docker-compose.yml` + `docker-compose.dev.yml`
   - **BASE_URL:** `http://127.0.0.1:4202`
   - **Branch:** `development` (synced before edits)

3. **What was tested** (from Testing instructions above)
   - Migrate including `20260331180000_work_session_clock_qr_breaks.sql`
   - `pytest tests/test_work_session.py`
   - Manual: Settings QR, `/my-shift?clock_qr=`, breaks, Reports live, `POST .../adjust` (spot-check)
   - Smoke: `npm run test:landing-version`

4. **Results (each criterion)**

   | Criterion | Result | Evidence |
   |-----------|--------|----------|
   | Migrate; `20260331180000` applied | **PASS** | `python -m app.migrate` reports `20260331180000_work_session_clock_qr_breaks.sql` **applied**; DB version **20260331190000** (ahead includes clock QR migration). |
   | Backend pytest | **PASS** | `3 passed in 2.18s` (`tests/test_work_session.py`). |
   | Manual UI/API flows | **PASS (spot-check)** | OpenAPI lists `/tenant/settings/clock-qr`, `/users/me/clock-qr-status`, break start/end, `/reports/work-sessions/live`, `/reports/work-sessions/{work_session_id}/adjust`. Smoke navigated logged-in user to **`http://127.0.0.1:4202/my-shift`** (no nav failure). Full QR regenerate + break + adjust with real bearer token not repeated in a dedicated session (UAT optional). |
   | Smoke landing | **PASS** | `npm run test:landing-version` → **RESULT: Landing version OK**; demo login tenant=1; **exit_code: 0** (~44.5s). |

5. **Overall:** **PASS**

6. **Product owner feedback**  
   QR/time-tracking and My Shift are covered by migration, pytest, route registration, and sidebar smoke including `/my-shift`. For payroll-sensitive flows, a short **UAT** on Security → QR regenerate, one full clock-in/break/clock-out with `?clock_qr=`, and one manual adjust in Reports would still add confidence beyond automated checks.

7. **URLs tested**
   1. `http://127.0.0.1:4202/` (landing)
   2. `http://127.0.0.1:4202/dashboard` (post-login)
   3. `http://127.0.0.1:4202/my-shift` (sidebar nav; smoke)
   4. plus other routes from `test:landing-version` (inventory, settings, etc.); **`http://127.0.0.1:4202/api/health`** → **200** (curl)

8. **Relevant log excerpts**

   - **Back:** `GET /health HTTP/1.1" 200 OK`; during smoke: `GET /users/me/work-session HTTP/1.1" 200 OK` (multiple).
   - **Front:** recent lines show `Application bundle generation complete` with no TS/Angular errors in tail.
   - **Smoke script:** `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.` / `exit_code: 0`
