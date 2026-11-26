---
## Closing summary (TOP)

- **What happened:** Platform monthly feature digest for verified subscribed owners was implemented and verified end-to-end.
- **What was done:** Migration, backend worker/routes, public unsubscribe, platform operator UI, signup consent copy, docs, and pytest coverage shipped on development.
- **What was tested:** Migration, 5 pytest cases, smoke URLs, operator settings/audience/queue send (3 recipients), unsubscribe token, signup digest notice, and front build - all PASS.
- **Why closed:** All testing criteria passed; feature usable end-to-end for operators.
- **Closed at (UTC):** 2026-11-26 17:00
---

# Platform weekly feature digest email to signups

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/453
- **453**

## Status
- **Implemented 2026-11-26T16:54:40Z** by 010 (feature coder). Human decisions on #453 unblocked build.
- Defaults shipped: monthly cadence to all verified subscribed owners; consent copy in signup verify email; unsubscribe link; manual draft content; platform SMTP settings with global SMTP fallback; locale default `en`.

## Problem / goal
Send restaurant owners a monthly email with new Satisfecho features to improve activation after signup. Out of scope for v1: per-tenant guest marketing (Settings → Newsletter).

Related docs: `docs/0093-platform-feature-digest.md`, `docs/0059-platform-operator-portal.md`, `docs/0092-platform-operator-insights.md`, `docs/0079-newsletter.md` (different audience).

## High-level instructions for coder
- Decisions from #453: all verified sign-ups/owners; signup verify email states monthly digest subscription + unsubscribe anytime; digest includes unsubscribe link; platform SMTP + locale configurable (default English); content = manual draft in platform portal.
- Keep tenant scoping and PII out of logs; no `@example.com` recipients; no secrets in commits.
- Work on **`development`**.

## What changed
- Migration `20261126165000_platform_feature_digest.sql`: owner opt-in + unsub token; `platform_mail_settings`; campaign/recipient tables.
- Backend: `feature_digest*.py`, routes under `/platform/feature-digest/*`, public unsubscribe, worker (~30/min), signup verify email notice, verify issues unsub token.
- Frontend: `/platform/feature-digest` operator UI; dashboard nav link; i18n `PLATFORM_DIGEST.*`.
- Docs: `docs/0093-platform-feature-digest.md` + updates to 0059/0088/0092/README.
- Tests: `back/tests/test_feature_digest.py` (5 passed).

## Testing instructions
1. Migrate: `docker compose exec back python -m app.migrate` (expect `20261126165000` applied).
2. Pytest: `docker compose exec back python3 -m pytest tests/test_feature_digest.py -q` (expect 5 passed).
3. Smoke: `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:14202/` → 200; `/platform/login` → 200; `GET /api/public/feature-digest/unsubscribe/not-real` → 404 HTML.
4. Manual (platform operator): log in at `/platform/login` → open **Feature digest** → save SMTP/locale → compose subject/HTML → Queue send; confirm audience count; open unsubscribe link from a sent mail (or token) and confirm `feature_digest_subscribed=false`.
5. Confirm owner signup verification email body includes monthly digest notice (trigger register or unit path).
6. Front build: `docker logs --since 5m pos-front` shows `Application bundle generation complete` (no TS errors).

## Test report

1. **Date/time (UTC):** start 2026-11-26T16:55:34Z, end 2026-11-26T16:59:41Z. Log window ~16:51-16:59Z.
2. **Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:14202` (HAProxy); branch `development`.
3. **What was tested:** migration `20261126165000`; pytest `test_feature_digest.py`; smoke home/login/fake-unsub; platform operator UI + API (settings, audience, queue send); real unsubscribe token; signup verify digest notice; front bundle health.
4. **Results:**
   - Migration applied (`20261126165000_platform_feature_digest.sql`): **PASS** - migrate reports Database is up to date (version 20261126165000).
   - Pytest 5 passed: **PASS** - `.....` in 2.56s.
   - Smoke `/` 200, `/platform/login` 200: **PASS**.
   - Fake unsubscribe 404 HTML: **PASS** - `GET /api/public/feature-digest/unsubscribe/not-real` → 404 "Link not found".
   - Platform Feature digest UI: **PASS** - login → `/platform/feature-digest` title "Monthly feature digest"; dashboard nav "Feature digest".
   - Save SMTP/locale + audience: **PASS** - PUT settings 200 `smtp_configured=true`; audience `subscribed_owners=3`.
   - Queue send: **PASS** - campaign id=3 queued then `status=sent` sent=3/failed=0 (recipients digest-test-owner@amvara.de, newsletter-smoke@amvara.de, tester-fiscal-431@amvara.de). Without SMTP, API correctly returns 503.
   - Unsubscribe token: **PASS** - valid token 200 HTML unsubscribed; DB `feature_digest_subscribed=false` for digest-test-owner@amvara.de.
   - Signup verify digest notice: **PASS** - `email_owner_signup_verify_digest_notice` present in messages + `email_service.send_owner_signup_verification_email` HTML path.
   - Front build complete / no lingering TS errors: **PASS** - transient TS errors during coder edit (~16:52Z) then `Application bundle generation complete` from 16:53:52Z onward; UI loaded successfully.
5. **Overall:** **PASS**
6. **Product owner feedback:** Monthly feature digest is usable end-to-end for operators: settings, audience, queue, worker send, and public unsubscribe behave as designed. Signup consent copy is in place. Note that the back container may lack global `SMTP_USER`/`SMTP_PASSWORD` until platform SMTP is saved in the UI (or env is passed through); the 503 guard is correct.
7. **URLs tested:**
   1. http://127.0.0.1:14202/
   2. http://127.0.0.1:14202/platform/login
   3. http://127.0.0.1:14202/platform
   4. http://127.0.0.1:14202/platform/feature-digest
   5. http://127.0.0.1:14202/api/public/feature-digest/unsubscribe/not-real
   6. http://127.0.0.1:14202/api/public/feature-digest/unsubscribe/<token>
8. **Relevant log excerpts:**
   - front: `Application bundle generation complete. [0.013 seconds] - 2026-11-26T16:54:22.936Z`
   - back: `Platform feature digest worker started (~30/min)`
   - back: `platform feature digest campaign queued id=3 recipients=3`
   - back: `GET /public/feature-digest/unsubscribe/not-real` → 404; valid token → 200 OK
