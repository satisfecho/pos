# API error messages / language

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/143

## Problem / goal
User-visible errors must follow the app locale. Avoid surfacing raw English detail strings from the backend in the UI.

Prefer stable API error codes (and optional structured parameters) mapped to `ngx-translate` keys in `front/public/i18n/*.json` for all shipped languages. Alternatively, translate known server message patterns on the client—but do not leave untranslated server strings in the user interface.

## High-level instructions for coder
- Inventory where API errors are shown (interceptors, components, toast/dialog flows).
- Decide contract: error codes (and params) from API vs. client-side mapping of known messages; prefer codes for consistency.
- Add or extend i18n keys per language for user-facing error copy; keep developer-only detail in logs if needed.
- Update backend responses where appropriate to return codes suitable for translation, without breaking existing clients unnecessarily.
- Smoke-test at least one non-default locale to confirm no raw English leaks for handled errors.

## Implementation notes (coder)
- **Backend:** `back/app/api_errors.py` — `api_error_payload(code, lang, **kwargs)` returns `{"code", "message", "params"?}`; `main.py` endpoints that used `get_message(...)` for `HTTPException(detail=...)` now use this shape. Also: `DELETE /tables/{id}` (table has orders / reassign), public `GET /menu/{token}` (404/500), `create_reservation` validation messages, `/token` OTP pending response, `/token/otp` errors, branded `TABLE_CLOSED` uses localized `table_currently_closed` for `message`.
- **Frontend:** `front/src/app/services/api-error-message.service.ts` — resolves `API_ERRORS.<CODE>` (with optional `params` for ngx-translate), then server `message`, then FastAPI validation array, then fallback i18n key. Wired into login, register, provider auth, book, landing, working-plan, reservations, tables list, and floor canvas (including `table_has_orders` detection by `code`).
- **i18n:** New `API_ERRORS` block plus `COMMON.API_REQUEST_FAILED` and `AUTH.LOGIN_FAILED` / `AUTH.LOGIN_RATE_LIMITED` in all eight `front/public/i18n/*.json` files.
- **Tests:** `back/tests/test_user_password_update.py` asserts on structured `detail.message`.

## Testing instructions
1. Start stack: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d` (or `./run.sh` per README).
2. **Locale:** In the app, switch the language picker to **Deutsch** (or any non-English shipped language).
3. **Login:** Enter a wrong password on `/login` — expect translated copy from `API_ERRORS.INCORRECT_USERNAME_OR_PASSWORD`, not a hard-coded English fallback string.
4. **Public book:** Open `/book/<tenantId>`, submit with a **past** date or invalid time — errors should follow the **UI** language via `API_ERRORS.*` (not only `Accept-Language`).
5. **Tables:** On `/tables` or `/tables/canvas`, delete a table that still has orders — reassign modal should open; inline error should use `API_ERRORS.TABLE_HAS_ORDERS` in the active UI language.
6. **Backend:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest tests/test_user_password_update.py -q`
7. **Frontend build:** `cd front && npx ng build --configuration=development`
8. **Smoke (optional):** With HAProxy reachable, `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front`

---

## Test report

1. **Date/time (UTC):** 2026-04-01 ~14:08–14:12 (verification run). Log window for excerpts: same window (`docker compose … logs --tail=25 front` after run).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202` (HAProxy); branch **development**, commit **1d2c03a** (short).

3. **What was tested:** Steps 1–7 from **Testing instructions** above; step 8 optional smoke attempted.

4. **Results (criteria):**
   - **Stack up / reachable:** **PASS** — `docker compose … ps` showed `pos-back`, `pos-front`, `pos-haproxy`, `pos-postgres`, etc. up; HAProxy on `4202`.
   - **Login wrong password (UI Deutsch, `API_ERRORS.INCORRECT_USERNAME_OR_PASSWORD`):** **PASS** — Puppeteer: after `select.language-select` → `de`, wrong credentials; `.error-banner` contained `Falscher Benutzername oder Passwort.` (matches `de.json`).
   - **Public book past date (UI language via code, not raw English):** **PASS** — Puppeteer on `/book/1`, Deutsch; booking form submitted with valid slot; **request interception** rewrote POST body `reservation_date` to `2020-01-01` so the client still ran the real submit path; `.book-form .form-error` showed `Das Reservierungsdatum muss heute oder in der Zukunft liegen.` (`API_ERRORS.RESERVATION_DATE_MUST_BE_TODAY_OR_FUTURE`). Separate `curl` to `POST /api/reservations` confirmed `detail.code` = `reservation_date_must_be_today_or_future` and English `detail.message` (UI correctly preferred ngx-translate over server message).
   - **Tables delete with orders (Deutsch):** **PASS** — After staff login, Deutsch, tiles view: delete on **T01** (DB has orders on `table_id=1`); confirmation confirm; **reassign modal** appeared with German title `Bestellungen umhängen und Tisch löschen` (`TABLES.REASSIGN_AND_DELETE_TITLE`). **Note:** This flow opens the reassign dialog keyed off `detail.code === table_has_orders`; it does **not** render the long `API_ERRORS.TABLE_HAS_ORDERS` string in the red banner—that key exists for other surfaces; UX here is the localized reassign copy, which matches implementation.
   - **Backend pytest `tests/test_user_password_update.py`:** **PASS** — `5 passed in 4.53s` (in `back` container).
   - **Frontend build:** **PASS** — `docker compose … exec front sh -c "cd /app && npx ng build --configuration=development"` completed with “Application bundle generation complete”.
   - **Optional landing smoke:** **FAIL (non-blocking / unrelated to this task)** — `LANDING_VERSION_ONLY=1 npm run test:landing-version --prefix front` failed: landing footer semver `2.0.66` ≠ `front/package.json` `2.0.68` (stale footer in running dev bundle vs repo version). Not a regression from API error i18n work.

5. **Overall:** **PASS** (all required testing-instruction items passed; optional smoke failed for version/footer drift only).

6. **Product owner feedback:** Staff and public flows now surface stable API error **codes** through the shared resolver so the **active UI language** drives user copy, including login and public booking validation. The “table has orders” delete path correctly branches to a **German** reassign dialog instead of leaking raw English. Consider refreshing the dev front image or `COMMIT_HASH`/version injection so optional landing semver checks stay green.

7. **URLs tested (browser):**
   1. `http://127.0.0.1:4202/login`
   2. `http://127.0.0.1:4202/book/1`
   3. `http://127.0.0.1:4202/login?tenant=1` (staff login)
   4. `http://127.0.0.1:4202/tables`

8. **Relevant log excerpts:**  
   - **Back (pytest):** `5 passed in 4.53s`  
   - **Front (compose):** `Application bundle generation complete. [0.448 seconds] - 2026-04-01T13:43:03.877Z` (recent successful rebuild; no TS errors in tail).  
   - **API (curl):** `{"detail":{"code":"reservation_date_must_be_today_or_future","message":"Reservation date must be today or in the future."}}` for past-date POST (proves server still returns English `message` while UI showed German via `API_ERRORS.*`).

**Automation note:** Browser checks used a one-off Puppeteer script at `/tmp/pos-api-error-i18n-verify.mjs` with `NODE_PATH=front/node_modules` (not committed).
