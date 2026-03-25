---
## Closing summary (TOP)

- **What happened:** Tester completed verification for GitHub issue **#67** (public guest feedback URL i18n) and recorded **PASS** with evidence on dev.
- **What was done:** Ran `test-feedback-public-i18n.mjs` and `test:landing-version` against HAProxy **4202**; confirmed no raw `FEEDBACK.*` in body or document title across picker locales, token URL, thank-you, and invalid-tenant error paths.
- **What was tested:** Automated i18n script (exit **0**) and landing smoke — both **PASS** per test report (2026-03-24 ~06:08 UTC).
- **Why closed:** All task pass criteria met; tester overall **PASS**.
- **Closed at (UTC):** 2026-03-24 06:11
---

# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback URLs (e.g. `https://satisfecho.de/feedback/1?token=…`) must show **the entire form and UI** in the selected language. The reporter still saw untranslated fragments on that flow.

Implementation and multiple tester **PASS** archives already exist under `agents/tasks/done/` for this theme; **#67** remains **open** on GitHub. Treat remaining work as **verification** (dev and, if product requires, production), any **real i18n gaps** found there, and **GitHub alignment** (short verification comment, labels, close when product accepts). See `front/public/i18n/`, `FeedbackPublicComponent`, and `docs/agent-loop.md`.

## High-level instructions for coder

- Re-read **#67** and verify `/feedback/{tenant}` with and without `?token=…` across supported locales (picker + `Accept-Language`); confirm no raw `FEEDBACK.*` keys in visible UI or document title.
- If dev/staging already match acceptance: optional production spot-check on **satisfecho.de**; if product agrees, post a verification comment on **#67** and support closing the issue (human may need to post if automation lacks **Issues** write on `gh`).
- Run or extend automated coverage if gaps appear (e.g. `front/scripts` feedback-public i18n tests when applicable).

## Coder notes (2026-03-24)

- **FEAT → WIP:** picked up for verification; **no `front/` or `back/` code changes** — public feedback flow already uses `FEEDBACK.*` for all visible copy and async document title updates (`FeedbackPublicComponent`).
- **Locale files:** `FEEDBACK` keys present and translated in `en`, `de`, `es`, `fr`, `ca`, `zh-CN`, `hi` under `front/public/i18n/`.
- **Automated:** `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs` — **PASS** (picker locales, `?token=`, submit → thank-you `de`, `/feedback/0` errors).
- **Regression smoke:** `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` — **PASS**.
- **Note (out of scope for public URL):** `SETTINGS.PUBLIC_GOOGLE_REVIEW_HINT` is still English in some non-`en` JSON files (staff settings hint only).
- **`gh issue comment`:** not posted from this environment (token lacks Issues write). Human can paste the summary from **Coder notes** + test commands into **#67** when closing the loop.

## Testing instructions

### What to verify

- Public `/feedback/{tenant}` shows **no raw `FEEDBACK.*` strings** in body or **document title**, with and without `?token=…`, for every language in the picker and for browser-default locale on first visit (no `pos_language`).
- Language switches update visible copy and tab title; submit flow reaches localized thank-you state.

### How to test

- Stack up (e.g. HAProxy dev): `docker compose -f docker-compose.yml -f docker-compose.dev.yml ps` — use host port from **haproxy** (often `4202`).
- From repo: `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs`
- Optional manual: open `/feedback/1`, cycle languages, submit a rating; optional prod spot-check on `https://satisfecho.de/feedback/1` if product requires.

### Pass / fail criteria

- **Pass:** script exits 0; no `FEEDBACK.` substring in `document.body.innerText` or `document.title` during checks; thank-you and error states localized per selected language.
- **Fail:** any raw i18n key visible, wrong language after picker change, or script assertion failure — return task to **WIP** for coder.

### GitHub (#67)

- If tester and product accept: short verification comment on the issue; remove **agent:wip** / apply closure labels per `docs/agent-loop.md`; close **#67** when agreed.

---

## Test report (tester)

1. **Date/time (UTC) and log window:** 2026-03-24 06:08–06:09 UTC (primary run ~06:08:38–06:08:50); HAProxy/front traffic through 06:09 for optional landing smoke.

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; HAProxy host port **4202**; **`BASE_URL=http://127.0.0.1:4202`**; **`HEADLESS=1`**; branch **`development`**, commit **`348de9a`**.

3. **What was tested:** Per **What to verify**: public `/feedback/1` i18n (picker locales, first-visit browser default, `?token=` path), no raw `FEEDBACK.*` in body or document title, language switches and thank-you/error states; optional regression landing/nav smoke.

4. **Results:**
   - No raw `FEEDBACK.*` in visible UI or title (automated checks): **PASS** — `test-feedback-public-i18n.mjs` reported OK for en, de, fr, es, ca, zh-CN, hi, token URL, thank-you (de), `/feedback/0` errors.
   - Browser-default locale on first load (es stub, no `pos_language`): **PASS** — script line `Browser default locale (es, navigator stub) on first load OK`.
   - Language / title updates and localized thank-you: **PASS** — script `Post-submit thank-you page i18n OK (de, no FEEDBACK.* leaks)`.
   - Script exit code: **PASS** — exit **0**.
   - Regression smoke (`test:landing-version`): **PASS** — exit **0**, `>>> RESULT: Landing version OK`.

5. **Overall:** **PASS** (all criteria above).

6. **Product owner feedback:** Public guest feedback is covered by automated i18n checks on dev; no leaked translation keys were observed. Production spot-check on satisfecho.de was not required by pass criteria; recommend a quick manual glance on prod before closing **#67** if desired.

7. **URLs tested (Puppeteer):**
   1. `http://127.0.0.1:4202/feedback/1` (multiple locales and flows per script)
   2. `http://127.0.0.1:4202/feedback/1?token=…` (script token path)
   3. `http://127.0.0.1:4202/feedback/0` (invalid tenant)
   4. `http://127.0.0.1:4202/` and post-login staff routes (landing smoke only)

8. **Relevant log excerpts:**
   - Script stdout (exit 0): `>>> RESULT: Public feedback i18n OK (en + de + fr + es + ca + zh-CN + hi, no FEEDBACK.* leaks)`; `>>> RESULT: Token URL path OK`; `>>> RESULT: Post-submit thank-you page i18n OK (de, no FEEDBACK.* leaks)`; `>>> RESULT: Invalid tenant /feedback/0 error UI i18n OK`.
   - `pos-front` (tail): `Application bundle generation complete` for `feedback-public-component` (no TS/NG errors in window).
   - `pos-haproxy` (tail): `GET /i18n/en.json` 200/304 during same minute window as tests.
