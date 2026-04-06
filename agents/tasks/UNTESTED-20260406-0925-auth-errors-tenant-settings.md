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
