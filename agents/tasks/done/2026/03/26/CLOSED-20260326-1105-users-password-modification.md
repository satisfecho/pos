---
## Closing summary (TOP)

- **What happened:** GitHub #105 — owner/admin could set another user’s new password from `/users` without re-entering their own current password, which weakened re-authentication for that action.
- **What was done:** Backend now requires `actor_current_password` when a new `password` is supplied on user update, verified against the JWT user; edit-user UI shows “your current password” before new/confirm fields; i18n and API messages added; `back/tests/test_user_password_update.py` covers success and failure paths.
- **What was tested:** Pytest (`test_user_password_update.py`), frontend build health, `npm run test:landing-version`, and manual/Puppeteer checks for field visibility and error text — **PASS** per the embedded test report.
- **Why closed:** All stated pass/fail criteria met; security goal enforced in API and UI with documented verification.
- **Closed at (UTC):** 2026-03-26 12:05
---

# Users — password modification

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/105

## Problem / goal
On **Users → User management → modify user** (`/users`), when the **account owner** changes a user’s password, the flow must require **current password** first, then **new password** (and typical confirmation), so password changes are not possible without re-authentication.

## High-level instructions for coder
- Trace the existing **edit user** / password-change API and UI on `/users`; compare with any existing “change my password” or security patterns in the repo.
- Extend or adjust the **owner-modifies-user-password** flow so the backend validates **current password** of the acting owner (or session) before applying a new password; align error messages and i18n with project conventions.
- Ensure non-owner roles cannot bypass the rule; keep tenant scoping and permissions consistent with adjacent user-management endpoints.
- Add or extend tests (API and/or e2e) for success and failure (wrong current password, missing fields). Run relevant pytest and front build checks.

## Implementation notes (coder)
- **API:** `UserUpdate` includes optional `actor_current_password`. When `password` is non-empty, the backend requires a non-empty `actor_current_password` and verifies it with `security.verify_password` against **`current_user`** (the JWT user), not the target user. Applies to **owner and admin** (any role that can call `PUT /users/{id}` with a new password); cannot be bypassed by role.
- **i18n:** New API message keys `actor_current_password_required`, `incorrect_actor_password` in `back/app/messages.py` (all locales). Front: `USERS.YOUR_CURRENT_PASSWORD`, `YOUR_CURRENT_PASSWORD_HINT`, `YOUR_CURRENT_PASSWORD_REQUIRED` in `front/public/i18n/*.json`.
- **UI:** On edit user, when new password (or confirm) is non-empty, fields appear in order: **your current password** → new password → confirm; submit sends `actor_current_password`.
- **Tests:** `back/tests/test_user_password_update.py`.

---

## Testing instructions

### What to verify
- Changing another user’s password from `/users` requires your own current password; wrong or missing current password is rejected (UI + API).
- Updates that do **not** set a new password (e.g. name only) still work without `actor_current_password`.

### How to test
- **Backend:** With stack up, from repo root:
  `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest tests/test_user_password_update.py -q`
- **Frontend build:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` (no TS/build errors after edits).
- **Smoke:** `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version`
- **Manual:** Log in as owner or admin → `/users` → edit a user → enter new password + confirm → field “Your current password” appears above → submit with correct password succeeds; wrong password shows API error text.

### Pass/fail criteria
- All tests in `test_user_password_update.py` pass; landing smoke exits 0; manual password change fails without current password and succeeds with correct current password.

---

## Test report

1. **Date/time (UTC):** 2026-03-26 12:00–12:06 (approx.). **Log window:** same (front/back compose services).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch **development** @ `0c55a9c`.

3. **What was tested:** Owner/admin password change for another user requires actor’s current password; missing/wrong rejected (UI + API); non-password user updates skip actor check; front build health; landing smoke; browser flows on `/users` (Puppeteer one-offs via `NODE_PATH=front/node_modules`, scripts in `/tmp`, not committed).

4. **Results**
   - **Backend `test_user_password_update.py`:** **PASS** — `5 passed in 4.07s` (`docker compose … exec -T back python3 -m pytest tests/test_user_password_update.py -q`).
   - **Frontend build (final state):** **PASS** — `docker compose … logs --tail=15 front` ends with `Application bundle generation complete. [4.048 seconds] - 2026-03-26T11:55:30.812Z` (earlier log window contained transient TS2307/NG1010 during rebuild; last build succeeded).
   - **Smoke `npm run test:landing-version`:** **PASS** — `exit_code: 0`, `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.` (includes navigation to `/users`).
   - **Manual / UI — actor field visible when setting new password:** **PASS** — Puppeteer: after edit non-current user, typing new + confirm, `#actorCurrentPassword` visible (`PASS: #actorCurrentPassword visible after entering new password on edit user`).
   - **Manual / UI — submit without actor password:** **PASS** — `.form-error` contains client message (English): `Enter your current password to set a new password.`
   - **Manual / UI — wrong actor password:** **PASS** — `.form-error`: `Your current password is incorrect.`
   - **Success path with correct actor password (full stack):** **PASS (API)** — `test_change_user_password_with_correct_actor_password_ok` in same pytest run; **UI end-to-end success submit not run** to avoid changing another tenant user’s password in the persistent local dev DB (API test exercises the full success contract).

5. **Overall:** **PASS** (all listed criteria satisfied; success path via pytest + failure/visibility via UI automation).

6. **Product owner feedback:** Re-authentication before changing another user’s password is enforced in the API and reflected in the edit-user dialog, with clear client and server error text. The flow matches the security goal for owner/admin. Consider a follow-up automated e2e in-repo if you want UI success-path coverage without manual `/tmp` scripts.

7. **URLs tested**
   1. `http://127.0.0.1:4202/login?tenant=1`
   2. `http://127.0.0.1:4202/users`
   3. (Smoke) `http://127.0.0.1:4202/`, `/dashboard`, and other sidebar routes including `/users` per `test:landing-version.mjs`.

8. **Relevant log excerpts**
   - **back (pytest):** `5 passed in 4.07s`
   - **front:** `Application bundle generation complete. [4.048 seconds] - 2026-03-26T11:55:30.812Z`
   - **smoke:** `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.`

**GitHub:** Comment posted on #105 at start; `gh issue edit … --add-label "agent:testing"` failed (`'agent:testing' not found` — label missing in repo).
