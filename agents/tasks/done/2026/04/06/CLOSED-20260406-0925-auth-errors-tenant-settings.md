---
## Closing summary (TOP)

- **What happened:** HAProxy showed intermittent 401/403 on `/api/token` and `/api/tenant/settings`; investigation targeted auth refresh races and expected RBAC/credential behaviour.
- **What was done:** Documented expected backend statuses; the frontend auth interceptor was updated to coordinate refresh with `ReplaySubject<boolean>(1)` so late subscribers after a completed refresh still receive success/failure and retry correctly.
- **What was tested:** Front build health, `test:landing-version` (pass), and authenticated GET/PUT `/api/tenant/settings` after token login (pass); optional parallel-401 stress test not run.
- **Why closed:** Tester overall **PASS**; pass/fail criteria met with no regression observed for authorized settings flows.
- **Closed at (UTC):** 2026-04-06 15:27
---

# Investigate 401/403 errors on /api/tenant/settings and /api/token

## Source
- **Service:** `pos-haproxy`
- **UTC Window:** 2026-04-03 to 2026-04-06
- **Representative Errors:**
  - `192.168.65.1:23766 [03/Apr/2026:13:44:54.258] ... 403 186 ... "GET /api/tenant/settings HTTP/1.1"`
  - `192.168.65.1:21754 [03/Apr/2026:15:05:30.201] ... 401 301 ... "POST /api/token HTTP/1.1"`
  - `192.168.65.1:42873 [06/Apr/2026:09:12:27.902] ... 401 200 ... "PUT /api/tenant/settings HTTP/1.1"`

## High-level instructions for coder
- Investigate the cause of intermittent `401 Unauthorized` and `403 Forbidden` errors on `/api/tenant/settings` and `/api/token` endpoints.
- Check if these errors are due to expired sessions, incorrect token handling in the frontend, or permission issues in the backend.
- Review backend logs (`pos-back`) around the timestamps of these HAProxy errors to find the specific reason for the status codes.
- Ensure that the authentication/authorization flow (JWT, session refresh, etc.) is robust and handles edge cases correctly.
- Verify if there's a race condition between token refresh and API calls.

---

## Coder notes (implementation)

### Backend behaviour (expected statuses)
- **`POST /token` → 401:** Wrong password or OTP step failure (`incorrect_username_or_password`, invalid OTP, etc.).
- **`POST /token` → 403:** OTP required (`require_otp: true`, `temp_token`); not an auth bug.
- **`GET/PUT /tenant/settings` → 401:** Missing/invalid/expired access cookie, or refresh invalid (`get_current_user` / `validate_refresh_token`).
- **`GET/PUT /tenant/settings` → 403:** Authenticated user lacks `SETTINGS_READ` / `SETTINGS_UPDATE` (`require_permission` in `back/app/permissions.py`). Roles such as kitchen/bartender/waiter do not include settings permissions.

### Frontend fix
- **Race on concurrent 401s:** The auth interceptor coordinated refresh with a plain `Subject`. If a second request subscribed to `refreshResult$` after the refresh had already completed, it could miss the emission and hang or error. Replaced with **`ReplaySubject<boolean>(1)`** so late subscribers still receive success/failure and retry or propagate correctly (`front/src/app/auth/auth.interceptor.ts`).

---

## Testing instructions

### What to verify
- App still builds; login and authenticated API calls work.
- After access token expiry, parallel requests that get 401 should refresh once and complete without stuck requests (manual or stress test optional).

### How to test
- With stack up: `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` — no TS/build errors after change.
- Smoke: from `front/`, `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` (or repo root with `--prefix front`).
- Optional: log in as owner/admin, open **Settings**, save — `PUT /api/tenant/settings` should return 200.

### Pass/fail criteria
- **Pass:** Front build succeeds; `test:landing-version` exits 0; settings save works for a user with settings permissions.
- **Fail:** Build errors; smoke test fails; settings save fails for owner/admin without an application error unrelated to RBAC.

---

## Test report

1. **Date/time (UTC) / log window:** Verification started ~**2026-04-06T15:23Z**; smoke test ended **2026-04-06T15:24:57Z**; API checks immediately after. Docker log review: **`pos-front`** last ~80 lines; **`pos-back`** last ~30 lines.
2. **Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml`; **`BASE_URL=http://127.0.0.1:4202`**; branch **`development`** (synced via `./scripts/git-sync-development.sh`).
3. **What was tested:** Front build health; `npm run test:landing-version`; authenticated GET/PUT `/api/tenant/settings` (credentials from repo `.env`, same pattern as Puppeteer). Optional parallel-401 stress test not run.
4. **Results:**
   - **Front build / no blocking TS errors at verification time:** **PASS** — Latest `pos-front` log ends with `Application bundle generation complete.` (note: earlier lines **2026-04-06T15:21:51Z** show transient `TS2304` for `Subject` during a failed rebuild; subsequent rebuild **15:22:03Z** completed successfully; workspace `auth.interceptor.ts` uses `ReplaySubject` imported from `rxjs`).
   - **`test:landing-version` exit 0:** **PASS** — `exit_code: 0`, `elapsed_ms: 44653`.
   - **Settings permission user: `PUT /api/tenant/settings` 200:** **PASS** — Node fetch after `POST /api/token?tenant_id=1` (200): GET `/api/tenant/settings` 200; PUT with `{ name: <existing> }` 200.
   - **Parallel 401 / token-expiry stress:** **N/A** (optional per task).
5. **Overall:** **PASS**
6. **Product owner feedback:** Auth refresh coordination via `ReplaySubject` is appropriate for late subscribers after a refresh completes. HAProxy 401/403 on `/api/token` and `/api/tenant/settings` remain explainable by wrong credentials, OTP-required login, or RBAC; no regression observed in login, navigation, or tenant settings update for an authorized user.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/`
   2. `http://127.0.0.1:4202/dashboard`
   3. `http://127.0.0.1:4202/my-shift`
   4. `http://127.0.0.1:4202/staff/orders`
   5. `http://127.0.0.1:4202/reservations`
   6. `http://127.0.0.1:4202/guest-feedback`
   7. `http://127.0.0.1:4202/tables`
   8. `http://127.0.0.1:4202/kitchen`
   9. `http://127.0.0.1:4202/bar`
   10. `http://127.0.0.1:4202/customers`
   11. `http://127.0.0.1:4202/products`
   12. `http://127.0.0.1:4202/catalog`
   13. `http://127.0.0.1:4202/reports`
   14. `http://127.0.0.1:4202/working-plan`
   15. `http://127.0.0.1:4202/users`
   16. `http://127.0.0.1:4202/contracts`
   17. `http://127.0.0.1:4202/settings`
   18. `http://127.0.0.1:4202/inventory/items` … `http://127.0.0.1:4202/inventory/reports` (five inventory sublinks)
   19. API (no full browser): `http://127.0.0.1:4202/api/token?tenant_id=1`, `http://127.0.0.1:4202/api/tenant/settings` (GET, PUT)
8. **Relevant log excerpts:**
   - **pos-front** (tail): `Application bundle generation complete. [0.194 seconds] - 2026-04-06T15:22:03.575Z` (and similar success after earlier failed build with `Subject` / `TS2304` at 15:21:51Z).
   - **pos-back:**
     ```
     INFO: ... "POST /token?tenant_id=1 HTTP/1.1" 200 OK
     INFO: ... "GET /tenant/settings HTTP/1.1" 200 OK
     INFO: ... "PUT /tenant/settings HTTP/1.1" 200 OK
     ```
