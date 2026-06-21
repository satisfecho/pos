---
## Closing summary (TOP)

- **What happened:** GitHub security advisory GHSA-h23p-7x2f-92qr (CWE-862) reported that low-privilege staff with `SCHEDULE_WRITE` could create, modify, and delete any tenant member's shifts, not only their own.
- **What was done:** Backend schedule routes now enforce self-only access for non-owner/admin roles via `can_manage_all_schedules()` and `_require_schedule_shift_access()`; working-plan UI hides cross-user edit controls; new tests in `test_schedule_auth.py`.
- **What was tested:** 8 schedule-auth tests, 5 bulk/copy-week regression tests, and Angular compile all passed; landing smoke passed (optional waiter UI/Puppeteer N/A — API 403 matrix covers authorization).
- **Why closed:** Tester report **PASS** — all verification criteria met; fix ready for commit and advisory closure after deploy.
- **Closed at (UTC):** 2026-06-21 15:38
---

# Review and fix security advisory — schedule self-only authorization

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/271
- **271**

## Problem / goal

GitHub security advisory **GHSA-h23p-7x2f-92qr** (high severity, CWE-862 Missing Authorization): low-privilege staff roles with `SCHEDULE_WRITE` (waiter, kitchen, bartender, receptionist) can create, modify, and delete **any** staff member's shifts in the same tenant — including owner/admin shifts — because schedule endpoints enforce tenant scope only, not self-only access.

Documented intent is that these roles manage **their own** shifts; owner/admin should retain full tenant schedule management. Shift data feeds `/attendance-excel` export used for labor-compliance reporting, so unauthorized edits affect payroll/legal record integrity.

Reference: https://github.com/satisfecho/pos/security/advisories/GHSA-h23p-7x2f-92qr  
Feature context: `docs/0021-working-plan.md`

## High-level instructions for coder

- Review `POST /schedule`, `PUT /schedule/{shift_id}`, and `DELETE /schedule/{shift_id}` in `back/app/main.py` — each currently requires `SCHEDULE_WRITE` and validates tenant membership but not shift ownership for non-admin roles.
- Add authorization so non-owner/non-admin callers may only create/update/delete shifts where `user_id` / `shift.user_id` equals `current_user.id`. Owner and admin roles keep full tenant schedule access.
- Mirror the existing self-scoping pattern in `back/app/staff_contract_routes.py` (staff-contract reads filter by `subject_user_id == current_user.id` when the caller lacks manage permission).
- Confirm `permissions.py` role grants for `SCHEDULE_WRITE` remain correct after the fix; adjust only if product intent differs (do not broaden low-privilege access).
- Add or extend backend tests covering: low-privilege user blocked from POST with another user's `user_id`, PUT/DELETE on another user's shift → 403; owner/admin can still manage all shifts in tenant.
- If the working-plan UI assumes cross-user edit for low-privilege roles, align frontend behaviour (read-only for others' shifts or hide edit controls) — see `docs/0021-working-plan.md` and schedule guard usage.
- Append **Testing instructions** when implementation is complete; verify `docker logs --since 10m pos-front` shows no Angular compile errors if frontend changes are made.
- **Security:** Preserve tenant scoping on every endpoint; no cross-tenant reads/writes. Do not paste advisory tokens or credentials into code or task files.

## Implementation summary

- **`back/app/permissions.py`:** Added `can_manage_all_schedules()` (owner/admin only).
- **`back/app/main.py`:** Added `_require_schedule_shift_access()`; applied to `POST /schedule`, `POST /schedule/bulk`, `PUT /schedule/{id}`, `DELETE /schedule/{id}`; `POST /schedule/copy-week` filters source shifts to self when caller is not owner/admin.
- **`back/tests/test_schedule_auth.py`:** New tests for waiter 403 on cross-user POST/PUT/DELETE/bulk; admin allowed.
- **`front/src/app/working-plan/working-plan.component.ts`:** `canEditShift()` / `canManageAllSchedules()` / `assignableScheduleUsers()` — hide edit/delete for others' shifts; user dropdown limited to self for non-owner/admin.

## Testing instructions

1. **Backend (Docker):**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest tests/test_schedule_auth.py -q
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest tests/test_schedule_bulk.py tests/test_schedule_copy_week.py -q
   ```
2. **Frontend compile:** After stack is up, confirm no TS errors:
   ```bash
   docker logs --since 10m pos-front 2>&1 | grep -iE 'error|failed' || true
   ```
3. **Manual / Puppeteer (optional):** Log in as a waiter on `/working-plan` — verify edit/delete only on own shifts; owner/admin can edit any shift. Attempting cross-user API writes should return 403 (e.g. via browser devtools or curl with waiter token).
4. **Regression:** `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` if the app is running.

## Test report

1. **Date/time (UTC):** 2026-06-21 15:37:37 – 15:39:00 UTC. Log window: `--since 15m` on `pos-front`, `pos-back` (container restart at 15:37 UTC).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; branch `development` @ `214fcb6e`; `BASE_URL=http://127.0.0.1:4202`; HAProxy port 4202.

3. **What was tested:** Schedule self-only authorization (GHSA-h23p-7x2f-92qr): backend auth tests, schedule bulk/copy-week regression, Angular compile for working-plan changes, landing smoke.

4. **Results:**
   - **Backend `test_schedule_auth.py`:** PASS — `8 passed in 6.02s` (waiter 403 on cross-user POST/PUT/DELETE/bulk; admin allowed).
   - **Backend `test_schedule_bulk.py` + `test_schedule_copy_week.py`:** PASS — `5 passed in 3.37s`.
   - **Frontend compile (`pos-front` logs):** PASS — bundle built successfully; `working-plan-component` lazy chunk emitted; no `error`/`failed` lines in last 10m.
   - **Optional waiter UI / Puppeteer working-plan:** N/A — covered by backend 403 matrix; no waiter test user in local `.env`.
   - **Regression landing smoke:** PASS — `LANDING_VERSION_ONLY=1` landing/version check OK. Full login+sidebar run failed with 401 on `POST /token?tenant_id=1` (local `.env` credentials not valid for tenant 1 DB); not a schedule-auth regression.

5. **Overall:** **PASS**

6. **Product owner feedback:** The security fix is verified at the API layer: low-privilege roles cannot create, update, delete, or bulk-assign shifts for other users, while owner/admin retain full tenant schedule access. Frontend compiles cleanly with UI guards aligned to the same rules. Ready for commit/changelog and advisory closure after deploy.

7. **URLs tested:**
   1. http://127.0.0.1:4202/ (landing smoke, version-only)

8. **Relevant log excerpts:**
   ```
   # pytest test_schedule_auth.py
   ........                                                                 [100%]
   8 passed in 6.02s

   # pytest test_schedule_bulk.py test_schedule_copy_week.py
   .....                                                                    [100%]
   5 passed in 3.37s

   # pos-front (build)
   Application bundle generation complete. [9.355 seconds] - 2026-06-21T15:37:35.354Z
   chunk-LTSYX6CQ.js   | working-plan-component       | 179.03 kB |

   # pos-back (landing login attempt — env credential issue, not schedule)
   POST /token?tenant_id=1 HTTP/1.1" 401 Unauthorized
   ```
