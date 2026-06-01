---
## Closing summary (TOP)

- **What happened:** Restaurant owners needed a one-click, typo-safe way to grant temporary Administrator access to `support@satisfecho.de` for Satisfecho support.
- **What was done:** `/users` gained **Add Satisfecho support** (pre-filled create/edit modal, Support badge, i18n); tenant-scoped admin user via existing `POST /users`; Puppeteer `test:support-access`.
- **What was tested:** Front build OK; `test:support-access` exit 0; manual create/badge/support login/Settings/revoke PASS (2026-06-01 UTC).
- **Why closed:** All acceptance criteria passed; tester overall **PASS**; ready for changelog.
- **Closed at (UTC):** 2026-06-01 07:47
---

# Add support@satisfecho.de to users to help restaurant owners

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/257
- **257**

## Problem / goal

Restaurant owners need a **safe, owner-controlled way** to grant **temporary Administrator access** to **`support@satisfecho.de`** so Satisfecho support staff can log in and help configure the restaurant on the owner's behalf.

The issue asks for this as a normal tenant user with the **admin** role (not a global superuser). Owners/admins already manage users at **`/users`**; the product gap is making it easy and explicit to invite the support address without manual typos or unclear workflow.

## Implementation summary

- **`/users`:** Secondary button **Add Satisfecho support** (owner/admin) opens create modal pre-filled with `support@satisfecho.de`, **Satisfecho Support** name, and **Administrator** role, plus password guidance hint.
- If support user already exists for the tenant, the same button opens **edit** with a revoke/update hint.
- User cards show a **Support** badge when email matches `support@satisfecho.de`.
- No backend change: existing `POST /users` and permissions unchanged (tenant-scoped admin user).
- **Puppeteer:** `npm run test:support-access` (from `front/`).
- **i18n:** New `USERS.*` keys in all `front/public/i18n/*.json` locales.

## Testing instructions

1. **Build:** `docker logs --since 5m pos-front 2>&1 | tail -30` — no TypeScript/bundle errors.
2. **Automated:** From repo root with app on port 4202 and admin/owner credentials:
   ```bash
   cd front && BASE_URL=http://127.0.0.1:4202 LOGIN_EMAIL=... LOGIN_PASSWORD=... npm run test:support-access
   ```
3. **Manual:** Log in as owner or admin → **Users** → **Add Satisfecho support** → confirm email `support@satisfecho.de`, role Administrator, set password → save → card shows Support badge → log out → log in as support user (same tenant) → confirm admin routes (e.g. Settings) work.
4. **Revoke:** Owner deletes support user or changes password; support cannot access tenant after removal.
5. **Regression:** `npm run test:landing-version` (optional).

---

## Test report

**Date/time (UTC):** 2026-06-01T07:44Z – 2026-06-01T07:46Z (log window: ~07:42–07:46 UTC)

**Environment:** Local Docker (`docker-compose.yml` + `docker-compose.dev.yml`), `BASE_URL=http://127.0.0.1:4202`, branch `development` @ `d9027489`

**What was tested:** Front build health; Puppeteer `test:support-access`; manual owner/support flows on `/users` (create, badge, edit shortcut, admin login, Settings access, revoke/delete); optional `test:landing-version`.

### Results

| Criterion | Result | Evidence |
|-----------|--------|----------|
| 1. Front build — no TS/bundle errors at test time | **PASS** | `Application bundle generation complete. [0.989 seconds] - 2026-06-01T07:43:39.687Z` (transient TS errors during hot-reload at 07:42:43–07:42:45 resolved before tests) |
| 2. Automated `npm run test:support-access` | **PASS** | Exit 0: `OK: support modal pre-fills support@satisfecho.de as admin` |
| 3. Manual create + Support badge + support admin login + Settings | **PASS** | Created user via modal; card showed **Support** badge; `support@satisfecho.de` logged in as Administrator; `/settings` loaded Business Profile |
| 4. Existing-user shortcut opens edit with revoke hint | **PASS** | **Add Satisfecho support** opened **Edit User** with hint: “Satisfecho support access is already enabled…” |
| 5. Revoke — delete blocks support login | **PASS** | Owner deleted user; login attempt stayed on `/login?tenant=1` with “Incorrect username or password.” |
| 6. Regression `test:landing-version` (optional) | **N/A (pre-existing)** | FAIL: footer semver `2.0.75` ≠ `package.json` `2.1.0` — unrelated to this feature |

**Overall:** **PASS**

**Product owner feedback:** The **Add Satisfecho support** shortcut delivers the intended owner-controlled workflow: one click pre-fills the correct email, role, and guidance, the Support badge makes the account easy to spot, and revoke via delete immediately blocks access. Ready for closer/changelog; no backend changes required.

**URLs tested:**
1. http://127.0.0.1:4202/login?tenant=1
2. http://127.0.0.1:4202/dashboard
3. http://127.0.0.1:4202/users
4. http://127.0.0.1:4202/settings
5. http://127.0.0.1:4202/

**Relevant log excerpts**

```
# pos-front (final successful build)
Application bundle generation complete. [0.989 seconds] - 2026-06-01T07:43:39.687Z

# pos-back (no errors during user CRUD / login)
(no 4xx/5xx on /users or /auth during test window)
```
