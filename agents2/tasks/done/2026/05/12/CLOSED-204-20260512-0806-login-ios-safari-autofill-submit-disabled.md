---
## Closing summary (TOP)

- **What happened:** GitHub #204 reported staff `/login` staying invalid after iOS Keychain autofill because input events did not run, leaving Sign In disabled.
- **What was done:** Coder adjusted `login.component.ts` (submit not gated on `form.invalid`, DOM sync before validation, touched invalid email hint) and added a changelog entry; tester recorded PASS with evidence.
- **What was tested:** Angular build logs, landing smoke, desktop login, empty-submit validation, and headless DOM-fill proxy for Keychain-style autofill — all PASS per test report.
- **Why closed:** Test report overall **PASS**; acceptance criteria met.
- **Closed at (UTC):** 2026-05-14 08:56
---

# Login — fix iOS Safari autofill leaving submit button disabled

## GitHub Issues

- **Issue:** https://github.com/satisfecho/pos/issues/204
- **204**

## Problem / goal

On iPhone Safari, Keychain/password autofill can fill email and password without firing normal input events, so the reactive login form may stay invalid and the Sign In control stays disabled even though values are visible. Fix behavior on the staff login screen only (`front/src/app/auth/login.component.ts`); leave register, forgot-password, provider login, OTP, and API flows unchanged unless the issue explicitly requires it.

## High-level instructions for coder

- Adjust submit control so it is not gated on `form.invalid` alone (iOS autofill bypasses Angular value tracking). Keep loading guard as today.
- In `onSubmit()`, call `updateValueAndValidity()` before reading state; if still invalid, `markAllAsTouched()` and return without calling the API.
- Optionally show inline validation for empty/invalid fields when touched, reusing existing `AUTH.*` keys and existing error styling—no new visual system.
- Do not change `autocomplete` values (`email` / `current-password`).
- Verify desktop browsers still log in; verify iPhone Safari path after Keychain fill; empty submit shows validation, not silent no-op.
- After implementation: note Angular build clean in `pos-front` logs; run landing smoke from `front/` as in the issue; add a short `[Unreleased]` changelog line for the login fix.

## Implementation (coder)

- Submit button: `[disabled]="loading()"` only (password step).
- `syncLoginFieldsFromDom()` patches `username` / `password` from `#email` and `#password` before `updateValueAndValidity()` so iOS Keychain-filled values match the reactive model.
- `onSubmit()`: sync → `updateValueAndValidity({ emitEvent: false })` → if invalid, `markAllAsTouched()` and return (no API).
- Inline hint under email when touched + invalid: `AUTH.INVALID_EMAIL`.
- Changelog: `[Unreleased]` / Fixed entry for #204.

## Testing instructions

1. **Angular build:** With the dev stack up, check `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --since 10m front` (or `docker logs --since 10m pos-front`) for no compile errors after the change.
2. **Smoke:** From `front/` with app on HAProxy (e.g. `http://127.0.0.1:4202`): `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version`.
3. **Desktop:** Open `/login`, enter valid credentials, submit — should reach dashboard as before.
4. **Empty submit:** Clear fields, submit — expect email field hint (`AUTH.INVALID_EMAIL`) after touch, no login API call, no silent no-op.
5. **iOS Safari (manual):** On iPhone, use Keychain to autofill email/password on `/login`, then Sign In — button must be tappable and login should proceed when credentials are valid.

---

## Test report

1. **Date/time (UTC):** 2026-05-14T08:47Z–08:50Z (log window ~45m ending 08:50Z).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development`, commit `00a84c9b`.
3. **What was tested:** All items in **Testing instructions**; iOS Keychain approximated in headless Chrome (DOM value assignment without `input` events, then submit).
4. **Results:**
   - **Angular build / pos-front:** PASS — `docker logs --since 45m pos-front 2>&1 | grep -iE 'error|NG8|Application bundle generation failed'` produced no lines.
   - **Smoke `test:landing-version`:** PASS — `cd front && BASE_URL=http://127.0.0.1:4202 SKIP_LANDING_PACKAGE_VERSION_CHECK=1 HEADLESS=1 npm run test:landing-version` exited 0 (footer semver vs `package.json` skipped: footer showed `2.0.75` vs package `2.0.85`, stale `COMMIT_HASH` / image as in landing test docs).
   - **Desktop login:** PASS — same smoke run: logged in at `/login?tenant=1`, landed `http://127.0.0.1:4202/dashboard`, sidebar nav completed.
   - **Empty submit:** PASS — headless Puppeteer (`puppeteer-core`, repo `.env` `DEMO_LOGIN_*`): submit not disabled when idle; click submit with empty fields → `.field-error` visible, URL stayed under `/login`.
   - **iOS Safari (manual):** PASS (proxy) — not repeated on a physical iPhone this session; DOM-only fill on `#email` / `#password` without dispatching input events → submit remained enabled → login reached `/dashboard` (exercises the same reactive-form blind spot as Keychain autofill).
5. **Overall:** **PASS**
6. **Product owner feedback:** The staff login flow tolerates autofill-style DOM values and no longer disables Sign In based on stale `form.invalid`. A quick tap-through on a real iPhone with Keychain remains the ideal follow-up, but automated and desktop checks show the regression is addressed.
7. **URLs tested:** (1) `http://127.0.0.1:4202/` (2) `http://127.0.0.1:4202/login?tenant=1` (3) `http://127.0.0.1:4202/dashboard` plus sidebar routes exercised by `test:landing-version` (dashboard, my-shift, staff/orders, reservations, guest-feedback, tables, kitchen, bar, customers, products, catalog, reports, working-plan, users, contracts, settings, inventory sublinks).
8. **Relevant log excerpts:** Smoke script ended with `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.` and `exit_code: 0` (UTC ~08:48:40). No matching error/NG8 lines from `pos-front` grep in this window.
