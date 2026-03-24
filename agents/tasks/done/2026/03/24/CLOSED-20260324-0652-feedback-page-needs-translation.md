---
## Closing summary (TOP)

- **What happened:** Tester re-verified public guest feedback i18n for GitHub **#67** on **development** @ **b5bd0f5** after prior archived CLOSED tasks for the same theme.
- **What was done:** Task documents aligned implementation (translate pipe, `TranslateService` title, localized API errors, `FEEDBACK` keys in seven locales) and recorded a full Puppeteer run plus log window review.
- **What was tested:** `npm run test:feedback-public-i18n --prefix front` with `BASE_URL=http://127.0.0.1:4202` — **PASS** (all five `>>> RESULT: … OK` lines); HAProxy/front logs in the 06:55 UTC window showed no errors relevant to the run.
- **Why closed:** Tester **overall PASS**; archive criteria satisfied. GitHub **#67** remains for product sign-off / optional prod spot-check; prior attempt to apply labels via `gh` failed (token scope).
- **Closed at (UTC):** 2026-03-24 06:56
---

# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback at `/feedback/{tenant}` (e.g. with `?token=…`) must show **no untranslated UI**: every part of the form and related states in the selected language. Prior CLOSED archives under `agents/tasks/done/` record repeated dev verification; **#67** remains open — align implementation with issue acceptance, optional production check on **satisfecho.de**, and GitHub closure when product agrees. See `front/public/i18n/`, `FeedbackPublicComponent`, and `docs/agent-loop.md`.

## High-level instructions for coder

- Re-read **#67** and verify `/feedback/{tenant}` with and without `?token=…` across supported locales (picker + `Accept-Language`); confirm no raw `FEEDBACK.*` keys in visible UI or document title.
- If dev already matches acceptance, document evidence for the issue; optional production spot-check; support verification comment and close **#67** when product accepts.
- If gaps remain, extend JSON under `front/public/i18n/` and template/bindings in `feedback-public` until all guest-visible copy is translated.
- Keep or extend automated checks (e.g. Puppeteer feedback i18n script) so regressions are caught.

## Coder notes (2026-03-24)

- **`FeedbackPublicComponent`** (`front/src/app/feedback-public/`): guest-visible copy uses the translate pipe or `TranslateService`; document title uses `translate.get` on language/translation changes so the tab title stays localized (see issue #67).
- **Locales:** `FEEDBACK` keys in `front/public/i18n/en.json` are present for **de, es, fr, ca, zh-CN, hi** (same key set).
- **API errors:** public POST uses localized `get_message(..., lang)` for tenant/token/email/phone failures; the client maps 429 and 422-style responses to `FEEDBACK.RATE_LIMIT` / `FEEDBACK.VALIDATION_ERROR`.
- **Automated evidence:** `npm run test:feedback-public-i18n --prefix front` with `BASE_URL=http://127.0.0.1:4202` completed successfully (ES `navigator.language` stub on first paint, EN→DE/FR/ES/CA/zh-CN/hi via picker, `?token=` path, submit → thank-you in DE, `/feedback/0` error copy).
- **GitHub #67:** Implementation matches stated acceptance on dev; close after product sign-off. Optional prod spot-check: same script with `BASE_URL=https://satisfecho.de`.

## Testing instructions

1. Start the dev stack (e.g. `docker compose -f docker-compose.yml -f docker-compose.dev.yml`); use the HAProxy host port (often **4202**).
2. From repo: `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:feedback-public-i18n`
3. **Pass:** all `>>> RESULT: … OK` log lines; script asserts visible text and `document.title` do not contain the substring `FEEDBACK.`.
4. **Manual (optional):** `/feedback/1` — exercise language picker and, if needed, `?token=…` for a valid reservation on tenant 1.

---

## Test report

1. **Date/time (UTC):** 2026-03-24 06:55:06 UTC (run ~06:55–06:56 UTC). Log window reviewed: HAProxy lines `24/Mar/2026:06:55:*` UTC; `pos-front` tail (no errors in window).

2. **Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml`; **BASE_URL** `http://127.0.0.1:4202`; branch **development**, commit **b5bd0f5**.

3. **What was tested:** Per **Testing instructions**: dev stack up; `npm run test:feedback-public-i18n` with `BASE_URL=http://127.0.0.1:4202`; pass = all `>>> RESULT: … OK` and no `FEEDBACK.` leaks in visible UI/title (script assertions).

4. **Results:**
   - Stack reachable / script runs: **PASS** — exit code 0, all five `>>> RESULT: … OK` lines printed.
   - Browser default locale (es stub) first load, no `FEEDBACK.*` leaks: **PASS** — `>>> RESULT: Browser default locale (es, navigator stub) on first load OK`.
   - Locales en + de + fr + es + ca + zh-CN + hi, no leaks: **PASS** — `>>> RESULT: Public feedback i18n OK …`.
   - Token URL path `?token=…`: **PASS** — `>>> RESULT: Token URL path OK`.
   - POST submit → thank-you (de), localized: **PASS** — `>>> RESULT: Post-submit thank-you page i18n OK (de, no FEEDBACK.* leaks)`.
   - Invalid tenant `/feedback/0` error UI: **PASS** — `>>> RESULT: Invalid tenant /feedback/0 error UI i18n OK`.

5. **Overall:** **PASS** (no failed criteria).

6. **Product owner feedback:** Public guest feedback at `/feedback/1` is covered by an automated i18n smoke that checks seven locales plus token URL, submit flow, and invalid tenant. No raw translation keys appeared in the exercised paths. Optional manual spot-check on `/feedback/1` and production (`BASE_URL=https://satisfecho.de`) remain at product discretion before closing **#67**.

7. **URLs tested:**
   1. `http://127.0.0.1:4202/feedback/1` (default locale stub, then per-locale checks)
   2. `http://127.0.0.1:4202/feedback/1?token=dummy-token-for-i18n-smoke`
   3. `http://127.0.0.1:4202/feedback/0` (invalid tenant)
   - (Script also drove `POST /api/public/tenants/1/guest-feedback` via UI submit.)

8. **Relevant log excerpts:**
   - Puppeteer stdout (evidence of pass):
     - `>>> RESULT: Browser default locale (es, navigator stub) on first load OK (no FEEDBACK.* leaks)`
     - `>>> RESULT: Public feedback i18n OK (en + de + fr + es + ca + zh-CN + hi, no FEEDBACK.* leaks)`
     - `>>> RESULT: Token URL path OK (no FEEDBACK.* leaks)`
     - `>>> RESULT: Post-submit thank-you page i18n OK (de, no FEEDBACK.* leaks)`
     - `>>> RESULT: Invalid tenant /feedback/0 error UI i18n OK`
   - `pos-haproxy` (sample): `GET /feedback/0 HTTP/1.1` 200; `POST /api/public/tenants/1/guest-feedback HTTP/1.1` 200; `GET /api/public/tenants/1 HTTP/1.1` 200; `GET /i18n/de.json` 304 — timestamps `24/Mar/2026:06:55:*` UTC.

**GitHub:** `gh issue comment` / label edit for **#67** failed with `Resource not accessible by personal access token`; labels **agent:testing** / start comment were not applied from this environment.
