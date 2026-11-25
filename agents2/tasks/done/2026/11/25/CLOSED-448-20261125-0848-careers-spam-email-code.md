---
## Closing summary (TOP)

- **What happened:** Public careers applications could be spammed without email proof before PII/CV storage.
- **What was done:** Added a six-digit email challenge (request-code / confirm-code → submit_token), migration + CareerEmailChallenge, public UI multi-step flow with i18n, docs/config, and pytest/smoke coverage.
- **What was tested:** Migration check, 5 pytest cases, manual API (422 without token / 200 with token), browser /careers/1, and Puppeteer REQUIRE_ENABLED=1 - all PASS.
- **Why closed:** All acceptance criteria passed; tester overall PASS and product-owner feedback ready for close.
- **Closed at (UTC):** 2026-11-25 09:06
---

# Careers / Trabaja con nosotros - spam upload protection (#448)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/448
- **448**

## Status
- **WIP → UNTESTED:** Implementation complete (2026-11-25). Waiting for tester.

## Problem / goal
Public careers applications (`POST /public/tenants/{ref}/careers/applications`) can be spammed. Require a **six-digit email confirmation code** before any application (or CV) is stored, similar in spirit to owner signup email verification.

See existing careers flow: `docs/0091-careers-trabaja-con-nosotros.md` and prior work on #447.

## High-level instructions for coder
- Add an email verification step on the public careers apply flow: candidate enters contact details → system emails a 6-digit code → code must be confirmed → only then persist application PII/CV.
- Do not store durable application rows (or CV files) until the code is confirmed. Prefer a short-lived pending/challenge state (or equivalent) with rate limits and expiry.
- Reuse patterns from owner signup email verification where practical (code generation, email send, rate limiting); keep careers multi-tenant and public-unauthenticated.
- Update public UI (`/careers/:tenantId`) and i18n (EN/ES/DE/CA at minimum) for request-code / confirm-code / resend.
- Update smoke coverage (`front/scripts/test-careers-public.mjs` and/or API tests) and `docs/0091-careers-trabaja-con-nosotros.md`.
- Work on **`development`**. No secrets or real inbox dumps in task/commits; use env-configured test mail per project rules (never `@example.com`).

## What was done
- Migration `20261125090000_career_email_challenge.sql` + model `CareerEmailChallenge`
- Helpers `back/app/careers_verify.py`; email template via `send_careers_verification_email`
- Public APIs: `POST .../request-code`, `POST .../confirm-code` → `submit_token`; submit requires `submit_token` form field
- Non-prod: `dev_code` in request-code response when SMTP is not configured; optional `CAREERS_FIXED_CODE`
- Public UI multi-step form + i18n (all locales for new CAREERS.* keys; EN/ES/DE/CA translated)
- Docs `docs/0091-…`, `config.env.example`, CHANGELOG Unreleased
- Pytest `back/tests/test_careers_email_verify.py`; smoke script updated for verify step

## Testing instructions

1. **Migration**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.migrate --check
   ```
   Expect up to date including `20261125090000`.

2. **Unit / API tests**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest tests/test_careers_email_verify.py tests/test_careers_crypto.py -q
   ```
   Expect all passed.

3. **Manual API flow** (careers enabled for tenant 1; local SMTP often empty → `dev_code`):
   ```bash
   BASE=http://127.0.0.1:14202   # or 4202 if that is your HAProxy host port
   EMAIL="careers.test.$(date +%s)@amvara.de"
   curl -s -X POST "$BASE/api/public/tenants/1/careers/applications/request-code" \
     -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\"}"
   # Use code from email or response.dev_code
   curl -s -X POST "$BASE/api/public/tenants/1/careers/applications/confirm-code" \
     -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"code\":\"NNNNNN\"}"
   # Then multipart POST .../applications with submit_token + name/email/phone
   # Expect 200 and a new row; POST without submit_token → 422
   ```

4. **Browser**
   - Open `/careers/1` → fill form → Send verification code → enter code → Submit → thank-you.
   - Confirm no application appears in owner `/staff/careers` until after successful submit.

5. **Puppeteer** (Chrome/Chromium on host; host port for HAProxy):
   ```bash
   BASE_URL=http://127.0.0.1:14202 REQUIRE_ENABLED=1 node front/scripts/test-careers-public.mjs
   ```
   Uses `dev_code` from the API when SMTP is off, or `CAREERS_FIXED_CODE` if set.

## Test report

1. **Date/time (UTC):** 2026-11-25T08:58:28Z start - 2026-11-25T09:05:28Z end. Log window: ~08:54-09:05 UTC.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; HAProxy `http://127.0.0.1:14202` (internal `http://haproxy:4202`); branch `development`. Puppeteer via ephemeral `pos-node-chrome:local` (node 22 + Debian chromium) with `--volumes-from pos-front` / `--network pos2_net` (host snap Chromium unusable for Puppeteer as root).
3. **What was tested:** Migration `20261125090000`; pytest careers email verify + crypto; manual API request-code → confirm-code → submit with/without `submit_token`; browser multi-step apply on `/careers/1`; Puppeteer `test-careers-public.mjs` with `REQUIRE_ENABLED=1`.
4. **Results:**
   - (1) Migration `--check` up to date including `20261125090000_career_email_challenge.sql` - **PASS**
   - (2) `pytest tests/test_careers_email_verify.py tests/test_careers_crypto.py -q` - 5 passed - **PASS**
   - (3) Manual API: request-code → HTTP 200 + `dev_code`; confirm-code → `submit_token`; POST without token → 422; POST with token → 200 `id=11` - **PASS**
   - (4) Browser `/careers/1`: form → Send verification code → verify UI with `careers-verify-form` / `careers-dev-code` → Submit → `careers-thank-you`. Request-code alone does not create an application (no application id until submit; missing token → 422) - **PASS**
   - (5) Puppeteer `REQUIRE_ENABLED=1`: "OK: application submitted after email code, thank-you shown"; back log `application created ... id=12` after confirm-code - **PASS**
5. **Overall:** **PASS**
6. **Product owner feedback:** Careers spam protection works end-to-end: six-digit email challenge gates persistence, local `dev_code` when SMTP is off makes QA practical, and the public UI thank-you only appears after confirm+submit. Ready for closing review.
7. **URLs tested:**
   1. http://127.0.0.1:14202/careers/1
   2. http://127.0.0.1:14202/api/public/tenants/1/careers
   3. http://127.0.0.1:14202/api/public/tenants/1/careers/applications/request-code
   4. http://127.0.0.1:14202/api/public/tenants/1/careers/applications/confirm-code
   5. http://127.0.0.1:14202/api/public/tenants/1/careers/applications
   6. http://haproxy:4202/careers/1 (Puppeteer container network)
8. **Relevant log excerpts:**
```
INFO: Database is up to date (version 20261125090000)
5 passed, 2 warnings in 1.48s
POST /public/tenants/1/careers/applications/request-code HTTP/1.1" 200 OK
POST /public/tenants/1/careers/applications/confirm-code HTTP/1.1" 200 OK
POST /public/tenants/1/careers/applications HTTP/1.1" 422 Unprocessable Entity
careers: application created tenant_id=1 id=11 has_cv=False
careers: application created tenant_id=1 id=12 has_cv=False
OK: application submitted after email code, thank-you shown
Application bundle generation complete. [0.411 seconds] - 2026-11-25T08:54:53.437Z
```
