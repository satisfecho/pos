---
## Closing summary (TOP)

- **What happened:** Tester handed off **CLOSED-20260324-1609-feedback-page-needs-translation** after a full **PASS** on public guest feedback i18n (issue #67) on local Docker (HAProxy 4202, `development` @ `5091691`).
- **What was done:** Coder confirmed no further product code was needed: `feedback-public` already uses ngx-translate with aligned **FEEDBACK** keys across seven locales; backend guest-feedback errors are localized via `Accept-Language`.
- **What was tested:** `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs` — exit **0**; all seven `>>> RESULT:` checks passed (locales, token path, invalid-token DE API message, thank-you, `/feedback/0`, missing tenant 404); compose stack and front/back logs reviewed — **PASS**.
- **Why closed:** Tester overall **PASS**; acceptance criteria for dev verification satisfied; production sign-off on #67 remains a product decision per test report.
- **Closed at (UTC):** 2026-03-24 16:20
---

# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback URLs (e.g. `https://satisfecho.de/feedback/1?token=…`) must show **every** user-visible part of the flow in the **selected** language—not mixed or English-only strings. The reporter wants the full form and related UI translated.

Relevant areas: `front/src/app/feedback-public/`, locale JSON under `front/public/i18n/`, and any API error messages surfaced on that route. See `docs/agent-loop.md` for optional GitHub closure / production sign-off after verification.

## High-level instructions for coder

- Reproduce on local Docker (`/feedback/{tenant}` with and without `?token=`) and compare with production URL pattern from the issue; exercise the language picker and supported locales.
- Ensure templates use translation for all guest-visible copy (including thank-you, validation, rate-limit, and invalid-tenant states); confirm document title tracks locale without flashing raw `FEEDBACK.*` keys.
- Align locale JSON files so no missing keys for strings used on this route.
- Run or extend `front/scripts/test-feedback-public-i18n.mjs` (or equivalent smoke) after changes; note evidence suitable for closing or updating the issue when product agrees.

## Coder notes (verification)

- Picked up as **WIP**; no additional product code changes were required: `feedback-public` already uses `TranslateModule` / keys under `FEEDBACK.*` and `BOOK.*`, document title uses `translate.stream()` with `takeUntilDestroyed` (issue #67 race).
- All seven locale files (`en`, `de`, `fr`, `es`, `ca`, `zh-CN`, `hi`) have the same **37** `FEEDBACK` keys as `en.json`.
- Backend `POST /public/tenants/{id}/guest-feedback` uses `_get_requested_language` + `get_message()` for localized `detail` (e.g. invalid reservation token).
- **Evidence:** `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs` — exit **0** (browser es auto-detect, locale switches, `?token=`, invalid token submit DE message, thank-you DE, `/feedback/0`, `/feedback/999999999`).

## Testing instructions

1. Stack up: `docker compose -f docker-compose.yml -f docker-compose.dev.yml ps` (HAProxy e.g. `127.0.0.1:4202`).
2. Run: `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs` (optional: `TENANT_ID=1`).
3. Manual spot-check: open `/feedback/1` and `/feedback/1?token=test`; switch language picker through **de / fr / es / ca / zh-CN / hi**; confirm no raw `FEEDBACK.` strings in UI or tab title; submit once with valid tenant (no token) and confirm thank-you + title.
4. If all pass, tester may move **UNTESTED → TESTING → CLOSED** per `agents/tasks/README.md` and update GitHub issue #67 if product agrees.

---

## Test report

1. **Date/time (UTC) and log window:** 2026-03-24 16:12 UTC; Docker `front` / `back` logs reviewed for the Puppeteer run window (~16:11–16:12 UTC).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `5091691`.

3. **What was tested:** Per **Testing instructions** §1–§3: compose stack up; `test-feedback-public-i18n.mjs` with `TENANT_ID=1` default; manual checklist (locales, token URLs, no raw `FEEDBACK.*`, thank-you/title) **subsumed by script assertions** (all seven locales, token path, invalid-token API message, post-submit thank-you, invalid/missing tenant).

4. **Results:**
   - Stack / HAProxy on 4202: **PASS** — `docker compose … ps` shows `pos-haproxy` `0.0.0.0:4202->4202/tcp`, other services up.
   - Puppeteer `test-feedback-public-i18n.mjs`: **PASS** — exit **0**; script printed all seven `>>> RESULT:` lines OK.
   - Browser default locale (es stub) / no `FEEDBACK.*` leaks: **PASS** — script line 1 result OK.
   - Locale picker coverage (en, de, fr, es, ca, zh-CN, hi): **PASS** — script line 2 OK.
   - `?token=` path: **PASS** — script line 3 OK.
   - Invalid token submit + localized API error (DE): **PASS** — script line 4 OK; back log `POST …/guest-feedback` 400.
   - Thank-you (de) after valid submit: **PASS** — script line 5 OK; back log `POST …/guest-feedback` 200.
   - `/feedback/0` error UI: **PASS** — script line 6 OK.
   - Missing tenant `/feedback/999999999`: **PASS** — script line 7 OK; back log `GET …/999999999` 404.

5. **Overall:** **PASS**.

6. **Product owner feedback:** Public feedback i18n behaves as specified on local Docker: no translation-key leaks in the exercised DOM/title checks, all supported locales and error paths covered by automation. Production sign-off on https://github.com/satisfecho/pos/issues/67 remains a product decision; this run validates the dev stack only.

7. **URLs tested** (via Puppeteer against `BASE_URL`):
   1. `http://127.0.0.1:4202/feedback/1` (default locale stub es-ES)
   2. `http://127.0.0.1:4202/feedback/1` — locale cycles en, de, fr, es, ca, zh-CN, hi
   3. `http://127.0.0.1:4202/feedback/1?token=…` (invalid token flow)
   4. `http://127.0.0.1:4202/feedback/1` — valid guest feedback submit → thank-you
   5. `http://127.0.0.1:4202/feedback/0`
   6. `http://127.0.0.1:4202/feedback/999999999`

8. **Relevant log excerpts:**
   - `pos-front`: `Application bundle generation complete. [0.293 seconds] - 2026-03-24T15:29:59.356Z` (no errors in tail).
   - `pos-back`: `POST /public/tenants/1/guest-feedback` 400 (invalid token) and 200 (success); `GET /public/tenants/999999999` 404.

**GitHub:** Issue #67 comment / label `agent:testing` not applied from this environment (`gh` PAT: resource not accessible for `addComment`). Closing reviewer or maintainer may update labels per `docs/agent-loop.md`.
