---
## Closing summary (TOP)

- **What happened:** GitHub issue #67 (public guest feedback i18n) was driven through coder verification and an independent tester run on local dev; no further frontend changes were required in the final pass.
- **What was done:** Confirmed `FeedbackPublicComponent` uses the translate pipe for guest-visible copy and updates the document title via `translate.get` so raw `FEEDBACK.*` keys do not appear; locale JSON under `front/public/i18n/` already covers the keys in use.
- **What was tested:** `node front/scripts/test-feedback-public-i18n.mjs` against `http://127.0.0.1:4202` (locales, token URL, thank-you in de, invalid tenant); **PASS** with exit 0 and Angular build healthy per front container logs.
- **Why closed:** All stated pass/fail criteria met; tester overall **PASS**; optional production check on satisfecho.de and GitHub comment/close remain product follow-up (not blocking archive).
- **Closed at (UTC):** 2026-03-24 07:30
---

# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback at `/feedback/{tenant}` (e.g. with `?token=…`) must show **no untranslated UI**: the full form and related states in the selected language. Implementation and multiple tester **PASS** archives exist under `agents/tasks/done/` for this theme; **#67** remains **open** on GitHub. Remaining work is **product verification** (optional production on **satisfecho.de**), any **real i18n gaps** found there, and **GitHub alignment** (verification comment, labels, close when product accepts). See `front/public/i18n/`, `FeedbackPublicComponent`, and `docs/agent-loop.md`.

## High-level instructions for coder

- Re-read **#67** and verify `/feedback/{tenant}` with and without `?token=…` across supported locales (picker + `Accept-Language`); confirm no raw `FEEDBACK.*` keys in visible UI or document title.
- If dev already matches acceptance, capture evidence for the issue; optional production spot-check on **satisfecho.de**; support a short verification comment and closing **#67** when product agrees.
- If gaps remain, fix copy, keys, or title handling in `FeedbackPublicComponent` and locale JSON; re-run the feedback i18n Puppeteer smoke if present.

## Coder (feature) — 2026-03-24

- **FEAT → WIP** on pickup. Reviewed `front/src/app/feedback-public/feedback-public.component.{ts,html}`: template uses `translate` pipe for all guest-visible copy; document title uses `translate.get` after `onLangChange` / `onTranslationChange` so raw `FEEDBACK.*` does not stick in the tab (issue #67).
- **No further front/i18n code changes** in this pass: locales under `front/public/i18n/` already define the keys used on the public form.
- **Evidence (local dev):** `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs` exited **0** (browser default `es-ES` stub, picker locales, token URL, post-submit thank-you in `de`, invalid `/feedback/0`). Front Docker logs: bundle generation complete, no TS/template errors.

## Testing instructions

### What to verify

- Public `/feedback/{tenant}` (with and without `?token=…`) shows **no raw `FEEDBACK.*` strings** in the page body or **document title** for any supported locale (picker + first-visit language detection).
- Error states (`invalid` id, tenant not found) and thank-you state after submit remain fully translated.

### How to test

- Stack: `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (HAProxy e.g. **4202**).
- From repo root or `front/`:  
  `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs`  
  or `npm run test:feedback-public-i18n --prefix front` with the same `BASE_URL` if the app is not on the default port probe list.
- Optional manual: open `/feedback/1`, switch language in the picker, confirm title and form strings match the locale (no key paths visible).

### Pass / fail criteria

- **Pass:** Script exits **0**; all logged lines show `>>> RESULT: … OK`; no `FEEDBACK.` substring in visible UI or title during checks.
- **Fail:** Any raw i18n key in DOM or title, script throws, or Angular build errors in `docker compose … logs --tail=80 front`.

### Follow-up (outside tester script)

- Optional production spot-check on **https://satisfecho.de**; GitHub **#67** verification comment and close when product accepts (see issue and `docs/agent-loop.md`).

---

## Test report (tester)

1. **Date/time (UTC)** and log window: **2026-03-24 07:28–07:29 UTC** (verification run); Docker front log excerpts reviewed for lines ending ~04:46Z (no errors in tail).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **BASE_URL** `http://127.0.0.1:4202` (HAProxy); branch **development**, commit **38d24b1**; **HEADLESS=1** for Puppeteer.

3. **What was tested:** Per “What to verify”: public `/feedback/1` with navigator-language stub (es-ES first visit); locale picker **en, de, fr, es, ca, zh-CN, hi** (body + document title); `/feedback/1?token=…`; post-submit thank-you in **de**; invalid tenant **`/feedback/0`** (en + de error copy and title).

4. **Results:**
   - No raw `FEEDBACK.*` in body or title (all locales + token path): **PASS** — script assertions and `>>> RESULT: … OK` lines.
   - Thank-you and error states fully translated: **PASS** — `Vielen Dank` / `Ungültiger Restaurant` checks passed.
   - Script exit **0**, all five summary lines **OK**: **PASS** — `node front/scripts/test-feedback-public-i18n.mjs` exit code 0.
   - Angular build healthy: **PASS** — `docker compose … logs --tail=80 front` shows `Application bundle generation complete`, no TS/template errors in tail.

5. **Overall:** **PASS** (all criteria met).

6. **Product owner feedback:** Public feedback matches the acceptance bar for local dev: every checked locale shows real copy, tab titles follow the language, and deep-link and error paths stay translated. Production on satisfecho.de was not exercised in this run; if you want parity proof there, a short manual pass is still optional. Closing the GitHub issue remains a product decision once you are satisfied.

7. **URLs tested:**
   1. `http://127.0.0.1:4202/feedback/1`
   2. `http://127.0.0.1:4202/feedback/1?token=dummy-token-for-i18n-smoke`
   3. `http://127.0.0.1:4202/feedback/0`

8. **Relevant log excerpts:**
   - Puppeteer stdout: `>>> RESULT: Browser default locale (es, navigator stub) on first load OK …` through `>>> RESULT: Invalid tenant /feedback/0 error UI i18n OK`; process exit **0**.
   - `pos-front` (tail): `Application bundle generation complete. [0.254 seconds] - 2026-03-24T04:46:37.705Z` (and prior successful rebuilds; no error lines in sampled tail).

**GitHub:** `gh issue comment 67` failed from this environment (`Resource not accessible by personal access token`). Closer should comment on **#67** manually with the same summary if needed.
