---
## Closing summary (TOP)

- **What happened:** Issue #67 reported the public guest feedback page (`/feedback/{tenant}`) still showing wrong or untranslated UI, including the document title on first load when the browser locale differed from the default translation load order.
- **What was done:** The coder updated `feedback-public.component.ts` to drive the document title via `translate.stream()` and merged `onDefaultLangChange` with the existing title refresh so titles update once HTTP-loaded locale files are ready (fixing ngx-translate timing on production-style first paint).
- **What was tested:** Puppeteer `test-feedback-public-i18n.mjs` on local Docker (`BASE_URL=http://127.0.0.1:4202`) — all supported locales, first-load `es` stub, token URL, post-submit thank-you, invalid tenant; exit 0, no `FEEDBACK.*` in body or title; front bundle generation clean in compose logs.
- **Why closed:** Tester test report overall **PASS**; acceptance criteria satisfied for local verification. Production re-check on satisfecho.de remains optional after deploy per task notes.
- **Closed at (UTC):** 2026-03-24 08:02
---

# Feedback page needs translation

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal
Public guest feedback at `/feedback/{tenant}` (e.g. with `?token=…`) must be **fully translated** in the selected language. The issue reports untranslated strings on production-style URLs. No raw translation keys in visible UI or document title. See `front/src/app/feedback-public/`, `front/public/i18n/`, and `docs/agent-loop.md` / prior `agents/tasks/done/**/CLOSED-*-feedback-page-needs-translation.md` archives.

## High-level instructions for coder
- Re-read issue **#67** and reproduce on local Docker (`/feedback/{tenant}`, with and without token) across supported locales (picker and `Accept-Language`).
- Confirm no raw `FEEDBACK.*` keys in DOM, user-visible strings, or tab title after locale switches.
- If gaps exist, fix templates/services and JSON under `front/public/i18n/`; keep API error paths localized where user-facing.
- If dev already matches acceptance, capture concise evidence; optional production check on **satisfecho.de**; support product/GitHub closure of **#67** when agreed (`docs/agent-loop.md`).

## Coder implementation (2026-03-24)
- Local Docker: `npm run test:feedback-public-i18n` (see below) already passed before code change; i18n JSON parity across locales was complete.
- **Production check** (`BASE_URL=https://satisfecho.de`): Puppeteer failed on step 1 — document title stayed `POS - Point of Sale` while body text was Spanish (browser `es-ES` stub, fresh profile). Root cause: ngx-translate `get()` can emit once with default-lang fallback while the selected locale file is still loading; HTTP-loaded locales do not emit `onTranslationChange`, so the tab title never refreshed.
- **Fix** (`feedback-public.component.ts`): use `translate.stream(key)` for the document title subscription so `onLangChange` delivers the loaded `event.translations`; also merge `onDefaultLangChange` into the existing title-refresh merge.

## Testing instructions

### What to verify
- Public `/feedback/{tenant}` (with and without `?token=…`): no raw `FEEDBACK.*` in visible UI; document title matches selected language (including first visit with browser locale, not only after picker change).
- Locale picker: `en`, `de`, `fr`, `es`, `ca`, `zh-CN`, `hi` — body and title stay localized.
- Submit flow → thank-you (DE in script): title and body stay localized.
- Invalid tenant `/feedback/0`: error copy and title localized (EN + DE checks in script).

### How to test
- Stack: `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (HAProxy e.g. `http://127.0.0.1:4202`).
- From repo root: `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs`  
  Or from `front/`: `BASE_URL=http://127.0.0.1:4202 npm run test:feedback-public-i18n`
- Optional after deploy: `BASE_URL=https://satisfecho.de node front/scripts/test-feedback-public-i18n.mjs` (should pass once this build is live).
- Confirm front build: `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` (no TS/Angular errors).

### Pass / fail criteria
- **Pass:** Script exits 0; no `FEEDBACK.` substring in `document.body.innerText` or document title during checks; front logs show successful bundle generation after changes.
- **Fail:** Any raw `FEEDBACK.*` in DOM/title, or script assertion errors (locale string / title mismatch).

## Test report

1. **Date/time (UTC):** 2026-03-24T08:01Z (verification run). **Log window:** `pos-front` tail ~2026-03-24T03:35Z–08:00Z (compose log timestamps, UTC).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development`, commit `496d43b`.
3. **What was tested:** Per “What to verify”: first-load browser locale (es stub), locale picker `en`→`de`→`fr`→`es`→`ca`→`zh-CN`→`hi` (body + document title), `/feedback/1?token=…`, submit → thank-you in DE, invalid `/feedback/0` EN + DE.
4. **Results:**
   - First visit / auto locale (es): **PASS** — script: “Browser default locale (es, navigator stub) on first load OK”.
   - Locales + titles: **PASS** — “Public feedback i18n OK (en + de + fr + es + ca + zh-CN + hi, no FEEDBACK.* leaks)”.
   - Token URL: **PASS** — “Token URL path OK”.
   - Thank-you (DE): **PASS** — “Post-submit thank-you page i18n OK (de, no FEEDBACK.* leaks)”.
   - Invalid tenant: **PASS** — “Invalid tenant /feedback/0 error UI i18n OK”.
   - Front build: **PASS** — `Application bundle generation complete` in `docker compose … logs --tail=80 front`; no TS/Angular errors in tail.
   - Pass criteria (exit 0, no `FEEDBACK.` in body/title): **PASS** — `node front/scripts/test-feedback-public-i18n.mjs` exited 0.
5. **Overall:** **PASS**.
6. **Product owner feedback:** Public feedback i18n is covered by an automated Puppeteer script on local Docker; this run confirms translated body and tab title across all supported picker languages, including first paint with a Spanish browser locale and the post-submit thank-you state. Production (`satisfecho.de`) was not re-run in this pass; optional after deploy per task instructions.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/feedback/1` (first load es stub; picker sweeps)
   2. `http://127.0.0.1:4202/feedback/1?token=dummy-token-for-i18n-smoke`
   3. `http://127.0.0.1:4202/feedback/1` (submit flow → thank-you)
   4. `http://127.0.0.1:4202/feedback/0` (invalid tenant EN/DE)
8. **Relevant log excerpts:** `pos-front`: `Application bundle generation complete. [0.354 seconds] - 2026-03-24T07:59:39.500Z` (and prior successful rebuilds in same tail; no “failed” / TS error lines).

**GitHub sync:** `gh issue comment 67` failed with “Resource not accessible by personal access token (addComment)”; issue labels/comment not updated from CI. Human or a PAT with **issues:write** can mirror this PASS on #67 per `docs/agent-loop.md`.
