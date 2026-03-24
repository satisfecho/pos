---
## Closing summary (TOP)

- **What happened:** GitHub issue #67 (public guest feedback i18n) completed another dev/test cycle: coder confirmed existing implementation meets the bar; an independent tester re-ran the full feedback-public i18n smoke on local Docker.
- **What was done:** No additional product code in this pass; `FeedbackPublicComponent` already uses the translate pipe and `translate.get` for the document title; `FEEDBACK` / `BOOK` keys are present across locale JSON. Tester noted `gh issue comment` failed from this environment (token scope); GitHub sync remains a human/token follow-up per `docs/agent-loop.md`.
- **What was tested:** `npm run test:feedback-public-i18n --prefix front` with `BASE_URL=http://127.0.0.1:4202` — **PASS** (exit 0, five `>>> RESULT: … OK` lines; error and thank-you paths; front logs show successful bundle generation).
- **Why closed:** Tester overall **PASS**; all pass/fail criteria in the task met; optional production verification on satisfecho.de and issue #67 close remain product decisions.
- **Closed at (UTC):** 2026-03-24 07:40
---

# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback (e.g. `https://satisfecho.de/feedback/1?token=…`) must show **no untranslated UI**: every part of the form and related states should follow the selected language. Prior **CLOSED** archives under `agents/tasks/done/` document repeated dev/test **PASS**; the issue may stay open until optional production verification and product sign-off. See `front/public/i18n/`, `FeedbackPublicComponent`, and `docs/agent-loop.md`.

## High-level instructions for coder

- Re-read **#67** and verify `/feedback/{tenant}` with and without `?token=…` across supported locales (language picker and `Accept-Language`); confirm no raw `FEEDBACK.*` keys in visible UI or document title.
- If dev already matches acceptance, capture evidence for GitHub; optional production spot-check on **satisfecho.de**; support a short verification comment and closing **#67** when product agrees.
- If gaps remain, extend `front/public/i18n/*.json` and `feedback-public` templates so all guest-visible strings and titles stay localized.

## Coder (feature) — 2026-03-24

- **FEAT → WIP** on pickup. Reviewed `FeedbackPublicComponent` (`front/src/app/feedback-public/`): guest copy uses the `translate` pipe; document title uses `translate.get` with `onLangChange` / `onTranslationChange` so raw `FEEDBACK.*` does not linger in the tab (issue #67).
- **Locale parity:** `FEEDBACK` keys in `front/public/i18n/en.json` match the other locale files (de, es, fr, ca, zh-CN, hi); `BOOK.ADDRESS` / `BOOK.OPEN_IN_GOOGLE_MAPS` used on the thank-you header are present under `BOOK`.
- **No product code changes** this pass — behaviour already meets the stated bar on local dev.
- **Evidence:** `BASE_URL=http://127.0.0.1:4202 npm run test:feedback-public-i18n --prefix front` exited **0** (es-ES navigator stub on first visit, picker locales, `?token=`, thank-you after submit in de, `/feedback/0` errors). `docker compose … logs --tail=40 front`: `Application bundle generation complete`, no TS errors in tail.

## Testing instructions

### What to verify

- Public `/feedback/{tenant}` (with and without `?token=…`) shows **no raw `FEEDBACK.*` strings** in the page body or **document title** for supported locales (picker + first-visit language detection).
- Error states (invalid id, tenant not found) and thank-you after submit stay fully translated.

### How to test

- Stack: `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (HAProxy host port often **4202**).
- From repo root: `BASE_URL=http://127.0.0.1:4202 npm run test:feedback-public-i18n --prefix front`  
  or `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs`.
- Optional manual: `/feedback/1`, switch language, confirm title and strings match (no key paths).

### Pass / fail criteria

- **Pass:** Script exits **0**; logged `>>> RESULT: … OK` lines; no `FEEDBACK.` in visible UI or title during checks; front logs show successful bundle generation without TS/template errors.
- **Fail:** Raw i18n keys in DOM or title, script throws, or Angular errors in `docker compose … logs --tail=80 front`.

### Follow-up (outside automated test)

- Optional production check on **https://satisfecho.de**; GitHub **#67** comment / close when product accepts (`docs/agent-loop.md`).

---

## Test report (tester)

1. **Date/time (UTC) and log window:** Started **2026-03-24 07:38:43 UTC**; verification finished ~**07:40 UTC**. Log window for `pos-front`: tail reviewed ~**2026-03-24T03:35Z–04:46Z** build lines plus post-run **--tail=80** (2026-03-24 ~07:40 UTC).

2. **Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (HAProxy **4202** → front). **`BASE_URL`:** `http://127.0.0.1:4202`. **`HEADLESS=1`**. Branch **`development`**, commit **`268b7f3`**.

3. **What was tested:** Per **What to verify** — public `/feedback/{tenant}` with and without `?token=…`, all supported locales (picker + first-visit `es` stub), no raw `FEEDBACK.*` in body or document title; error `/feedback/0`; thank-you after submit (de).

4. **Results:**
   - No raw `FEEDBACK.*` in UI/title across automated checks — **PASS** (script asserted; five `>>> RESULT: … OK` lines).
   - Error states fully translated — **PASS** (`Invalid tenant /feedback/0 error UI i18n OK`).
   - Thank-you after submit localized — **PASS** (`Post-submit thank-you page i18n OK (de, no FEEDBACK.* leaks)`).
   - Script exit code — **PASS** (exit **0**).
   - Front bundle / no TS errors in reviewed logs — **PASS** (`Application bundle generation complete.` in tail; no `TS2345` / `NG8002` / “failed” in excerpt).

5. **Overall:** **PASS** (no failed criteria).

6. **Product owner feedback:** Guest feedback flows in dev look fully localized for the locales exercised by automation, including the Spanish-first-visit stub and the German thank-you path. Production sign-off on **satisfecho.de** is still optional per the task; GitHub **#67** can be updated or closed when product agrees.

7. **URLs tested:**
   1. `http://127.0.0.1:4202/feedback/1` (and locale iterations per script)
   2. `http://127.0.0.1:4202/feedback/1?token=…` (script-generated token URL)
   3. `http://127.0.0.1:4202/feedback/0` (invalid tenant error UI)

8. **Relevant log excerpts:**
   - Puppeteer stdout: `>>> RESULT: Browser default locale (es, navigator stub) on first load OK (no FEEDBACK.* leaks)` … `>>> RESULT: Invalid tenant /feedback/0 error UI i18n OK`
   - `pos-front` (excerpt): `Application bundle generation complete. [0.254 seconds] - 2026-03-24T04:46:37.705Z` (lazy `feedback-public-component` chunk rebuild; no error lines in tail).

**GitHub:** `gh issue comment 67` failed with **Resource not accessible by personal access token (addComment)** — labels **#67** / **`agent:testing`** not updated from this environment; human or token with `issues:write` should sync per **`docs/agent-loop.md`**.
