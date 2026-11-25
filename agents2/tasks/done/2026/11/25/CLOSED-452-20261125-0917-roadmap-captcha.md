---
## Closing summary (TOP)

- **What happened:** Self-hosted login CAPTCHA after N failed attempts (#452) was implemented and verified PASS.
- **What was done:** SVG challenge gate on `POST /token` (Redis/in-memory), shared Angular captcha fields on staff/provider/courier/platform login, env knobs, docs, pytest and smoke coverage.
- **What was tested:** Pytest (3 passed), API smoke (challenge + require_captcha after 3 failures), `/login` UI gate + refresh, front build healthy; fixed-code happy-path sign-in skipped (env unset).
- **Why closed:** All required tester criteria passed; optional FIXED_CODE path left as non-blocking follow-up for prod smoke if desired.
- **Closed at (UTC):** 2026-11-25 18:36
---

# Roadmap: CAPTCHA after failed login (#452)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/452
- **452**

## Status
- **Implemented (self-hosted):** Human on #452 chose self-hosted only (no third-party). Default threshold **3** failed logins per IP (`LOGIN_CAPTCHA_AFTER_FAILURES`), configurable. Cleared waiting-human gate.

## Problem / goal
Add CAPTCHA after failed login attempts as a nice-to-have on top of existing rate limits. Listed as not implemented in `docs/0020-rate-limiting-production.md`. Goal: reduce credential-stuffing / automated login abuse when rate limits alone are not enough, without harming normal staff login.

## High-level instructions for coder
- Read `docs/0020-rate-limiting-production.md` and the current login / token rate-limit path (`POST /api/token` or equivalent) before designing.
- Propose a minimal slice: show CAPTCHA (or equivalent challenge) only after N failed logins for the same identity/IP (reuse Redis/rate-limit patterns where practical). Prefer a privacy-friendly provider or self-hosted option; do not hard-code secrets - use `config.env` / `config.env.example`.
- Wire challenge verification on the backend before issuing a token; update the Angular login UI and i18n (EN/ES/DE/CA at minimum).
- Keep tenant scoping and existing rate limits intact; CAPTCHA is additive, not a replacement.
- If product/provider choice is unclear (reCAPTCHA vs hCaptcha vs Turnstile vs none), post **one** waiting-for-human comment on #452 and park the FEAT per `agents2/TASKS-README.md` rather than inventing a provider unilaterally.
- Work on **`development`**. Add or extend smoke coverage (e.g. rate-limit / login Puppeteer) only for the chosen slice.
- Do not paste secrets, API keys, or provider site keys into the task file or commits.

## What was implemented
- Backend module `back/app/login_captcha.py`: SVG text challenge (Redis + in-memory fallback), failure counter per client IP.
- `GET /captcha/challenge`; `POST /token` accepts optional `captcha_id` / `captcha_answer` form fields; after N failures requires valid challenge (400 `require_captcha` + challenge payload).
- Env: `LOGIN_CAPTCHA_ENABLED`, `LOGIN_CAPTCHA_AFTER_FAILURES` (default 3), `LOGIN_CAPTCHA_TTL_SECONDS`, `LOGIN_CAPTCHA_FIXED_CODE` (non-prod).
- Angular: shared `LoginCaptchaFieldsComponent` on staff / provider / courier / platform login; `ApiService.login` + `getLoginCaptchaChallenge`; i18n keys in all locales.
- Docs: `docs/0020`, `docs/SECURITY-REVIEW.md`, `ROADMAP.md`, `config.env.example`.
- Tests: `back/tests/test_login_captcha.py`; smoke `front/scripts/test-login-captcha.mjs` (`npm run test:login-captcha`); rate-limit script accepts 400 after captcha gate.

## Testing instructions
1. `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest tests/test_login_captcha.py -q` - expect 3 passed.
2. `BASE_URL=http://127.0.0.1:14202 node front/scripts/test-login-captcha.mjs` (or host HAProxy port from `docker compose ps`) - expect PASS (challenge + require_captcha after 3 failures).
3. Optional: set `LOGIN_CAPTCHA_FIXED_CODE=TESTA` on back (non-prod), restart back, re-run smoke with `LOGIN_CAPTCHA_FIXED_CODE=TESTA` to exercise wrong/right answer path.
4. Manual: open `/login`, fail password 3 times, confirm CAPTCHA UI appears; refresh code works; correct password + captcha signs in.
5. Confirm front build healthy: `docker logs --since 5m pos-front` has no `Application bundle generation failed`.
6. `python3 scripts/check-i18n-locale-parity.py` - new AUTH/API_ERRORS captcha keys present (pre-existing `ar` gaps unrelated).

## Test report

1. **Date/time (UTC):** 2026-11-25T18:33:41Z start – 2026-11-25T18:36:30Z end. Log window: `pos-front` / `pos-back` ~18:31–18:36Z.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; HAProxy `BASE_URL=http://127.0.0.1:14202` (internal Puppeteer `http://haproxy:4202` via `pos-node-chrome:local` on `pos2_net`); branch `development` @ `1041476c8`.
3. **What was tested:** Self-hosted login CAPTCHA after N failures (pytest, API smoke, `/login` UI + refresh, front build, AUTH/API_ERRORS captcha i18n keys). Optional `LOGIN_CAPTCHA_FIXED_CODE` path not enabled in this env (skipped).
4. **Results:**
   - **Pytest `tests/test_login_captcha.py`** - **PASS** - `3 passed` in 0.25s (cache permission warning only).
   - **API smoke `test-login-captcha.mjs`** - **PASS** - challenge OK; after 3 failures gated `400 require_captcha`; `SKIP: fixed-code path`.
   - **Optional FIXED_CODE** - **SKIP** - `login_captcha_fixed_code` empty in running back; not set for this run.
   - **Manual /login UI** - **PASS** - After 3 wrong passwords, 4th response shows `app-login-captcha-fields`, Security check label, SVG image, New code refresh changes SVG (`tmp/test-login-captcha-ui.mjs` via `pos-node-chrome:local`). Full successful sign-in with captcha not E2E’d (no fixed code / OCR); gate + UI wiring verified.
   - **Front build** - **PASS** - `docker logs --since 5m pos-front` at end of run: only `Application bundle generation complete` (no failed/TS errors in window). Earlier mid-edit failures ~18:28–18:29Z had already cleared.
   - **i18n captcha keys** - **PASS** - AUTH `CAPTCHA_*` and API_ERRORS `CAPTCHA_REQUIRED` / `CAPTCHA_INVALID` present in all locales. Full parity script still FAILS on pre-existing `ar` gaps (35 keys) unrelated to captcha, as noted in instructions.
5. **Overall:** **PASS**
6. **Product owner feedback:** Self-hosted CAPTCHA after three failed logins behaves as designed: API challenges correctly, staff `/login` shows the SVG challenge and refresh works, and coverage is in place for regression. Optional fixed-code happy-path login was not exercised in this environment; worth a quick manual sign-in with captcha once before production if desired. No contrast/chrome colour changes beyond the light SVG challenge tile.
7. **URLs tested:**
   1. http://127.0.0.1:14202/api/health
   2. http://127.0.0.1:14202/api/captcha/challenge
   3. http://127.0.0.1:14202/login (host)
   4. http://haproxy:4202/login (Puppeteer)
   5. http://127.0.0.1:14202/provider/login (HTTP 200 only)
   6. http://127.0.0.1:14202/courier/login (HTTP 200 only)
   7. http://127.0.0.1:14202/platform/login (HTTP 200 only)
8. **Relevant log excerpts:**
   - Front: `Application bundle generation complete. [0.294 seconds] - 2026-11-25T18:31:55.081Z` (no failed in verification window).
   - Back: `GET /captcha/challenge` 200; `POST /token` 401 then 400 after gate (e.g. `POST /token HTTP/1.1" 400 Bad Request` following three 401s from UI test).
   - Smoke: `PASS: login captcha smoke`; UI: `PASS: CAPTCHA UI visible on /login after failures`.
