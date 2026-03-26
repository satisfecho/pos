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
