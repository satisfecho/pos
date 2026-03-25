# Remove logo in settings

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/95

## Problem / goal

- On `/settings`, deleting the restaurant logo via the delete control does not remove the uploaded logo (background image delete works).
- Fix logo removal end-to-end (UI, API payload, tenant `logo_filename` / storage) so it behaves like header background deletion.

## High-level instructions for coder

- Trace the settings branding UI: logo vs header background delete handlers and API calls.
- Fix the logo delete path (frontend request shape and/or backend handler) so the tenant no longer references a logo file after delete.
- Verify in browser: upload logo → delete → logo cleared and does not reappear on reload.

## Coder notes (2026-03-25)

- **Cause:** `removeLogo()` only cleared local preview; header background already called `DELETE /tenant/header-background`.
- **Change:** Added `DELETE /tenant/logo` (unlink file, set `logo_filename` null, redacted tenant JSON like header delete). Frontend: `ApiService.deleteTenantLogo()`, settings `removeLogo()` calls it and `settings.set(updated)`.

## Testing instructions

### What to verify

- Logo remove control clears the preview and persisted tenant logo (reload settings: no logo; public/book pages if applicable show no logo).
- File removed from `uploads/{tenant_id}/logo/` when a logo existed.

### How to test

- Stack: `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (HAProxy e.g. `http://127.0.0.1:4202`).
- **API (optional):** With staff session cookie / bearer, `DELETE /api/tenant/logo` (or `/tenant/logo` via same base as app) returns JSON with `logo_filename: null`.
- **UI:** Settings → Business profile → upload a small logo → ✕ remove → hard refresh: logo slot empty; re-open book/menu for tenant if you use logo there.
- **Smoke:** `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` (includes navigating to `/settings`).

### Pass / fail

- **Pass:** After delete + reload, `GET /tenant` (settings) shows `logo_filename` null and UI shows no server logo; no error toast; smoke test exit 0.
- **Fail:** Logo reappears after reload, 4xx/5xx on delete, or smoke test fails.

---

## Test report

1. **Date/time (UTC) and log window:** ~2026-03-25T14:51Z–14:53Z; `front`/`back` logs not required beyond successful UI/API flow (no errors observed in console during Puppeteer).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `00cacab` (after prior tester commit).

3. **What was tested:** Logo ✕ control + persistence via `GET /api/tenant/settings` (`logo_filename`); file removal under `uploads/1/logo/` in `back` container; smoke `test:landing-version`; optional upload→save→delete path exercised in an earlier Puppeteer pass (POST `/api/tenant/logo` 200, DELETE 200, `logo_filename` null).

4. **Results**

   - Remove control clears persisted tenant logo (`logo_filename: null` via authenticated `fetch('/api/tenant/settings')` after DELETE): **PASS** — captured after UI ✕ and `waitForResponse` on `DELETE .../api/tenant/logo`.
   - Reload settings: no server logo in **first** `.logo-upload-wrapper` (logo row, not header background): **PASS** — `querySelectorAll('.logo-upload-wrapper')[0]` had no `.current-logo img` after reload.
   - File removed from `uploads/{tenant_id}/logo/`: **PASS** — `docker compose ... exec back ls -la uploads/1/logo/` → empty directory (only `.` / `..`) immediately after successful delete.
   - Upload → Save → Delete path (regression guard): **PASS** — separate run: POST `/api/tenant/logo` returned `logo_filename` set; DELETE returned null (documented in tester notes).
   - Smoke `npm run test:landing-version`: **PASS** — `exit_code: 0`, ended `2026-03-25T14:53:25.612Z`.

5. **Overall:** **PASS**

6. **Product owner feedback:** Logo removal now matches header background behavior: the API clears `logo_filename` and the file is deleted from tenant storage, so a full page reload no longer shows a stale logo. The settings form has two similar “upload” blocks; verification targeted the **first** wrapper (logo), not the header image row.

7. **URLs tested**

   1. `http://127.0.0.1:4202/login?tenant=1`
   2. `http://127.0.0.1:4202/settings`
   3. `http://127.0.0.1:4202/` and other routes from `test:landing-version` (includes `/settings` via sidebar).

8. **Relevant log excerpts**

   - Puppeteer/network: `DELETE .../api/tenant/logo` matched `waitForResponse`; subsequent `GET /api/tenant/settings` JSON `logo_filename: null`.
   - Host/volume check: `ls uploads/1/logo/` → `total 0` (empty).
   - Smoke: `>>> RESULT: Landing version OK; ...` / `exit_code: 0`

**GitHub:** Comment posted on **#95** (verification started). Repo has no `agent:testing` label (same as #94).
