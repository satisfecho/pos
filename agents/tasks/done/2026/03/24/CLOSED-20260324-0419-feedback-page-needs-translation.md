---
## Closing summary (TOP)

- **What happened:** GitHub #67 tracked public guest feedback URLs showing untranslated or mixed-language UI (`/feedback/{tenant}`).
- **What was done:** The feedback public component sets the document title via `TranslateService.get()` (avoids flashing raw `FEEDBACK.*` keys while i18n loads), and `test-feedback-public-i18n.mjs` was extended to cover **ca** and **zh-CN** plus token URLs; guest POST locale behavior was confirmed unchanged (Accept-Language path already in place).
- **What was tested:** On `development` @ `20b72f6` via HAProxy `http://127.0.0.1:4202`, automated `test:feedback-public-i18n` and `test:landing-version` **PASS** (2026-03-24T04:19–04:24Z per test report).
- **Why closed:** Tester overall **PASS**; verification criteria in the task met. GitHub comment/label automation failed for PAT scope—human follow-up on #67 remains per test report.
- **Closed at (UTC):** 2026-03-24 04:25
---

# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback URLs (e.g. `https://satisfecho.de/feedback/1?token=…`) must show **every** part of the form and related UI in the **selected** language—not a mix of English and the locale. The reporter saw untranslated strings on that flow. Prior implementation and multiple **CLOSED** tasks under `agents/tasks/done/` document rounds of i18n work and tester passes; the issue remains **open**—treat this queue item as **feature-coder follow-up**: confirm no regressions, close any real gaps, and support **GitHub alignment** (comment / labels / close when product accepts). See `docs/agent-loop.md` and `front/public/i18n/`.

## High-level instructions for coder

- Exercise `/feedback/{tenant}` with and without a valid token across several locales (picker + `Accept-Language`); confirm no raw `FEEDBACK.*` keys or English fallbacks where translations exist.
- Ensure API-driven validation or error messages on that flow respect locale where the backend already supports it; extend i18n keys or server messages only if gaps are real.
- Re-run or extend any existing Puppeteer/locale checks for public feedback if documented in `docs/testing.md` or `front/scripts/`.
- When behaviour matches the issue in the environments you test, hand off for tester and for **#67** closure per `docs/agent-loop.md` (human may need to post on GitHub if automation lacks Issues write).

## Coder implementation (2026-03-24)

- **Document title:** `FeedbackPublicComponent` now sets the tab title via `TranslateService.get()` instead of `instant()`, so the browser tab does not briefly show raw keys like `FEEDBACK.LOADING` while `/i18n/*.json` is still loading (GitHub #67).
- **Automated coverage:** `front/scripts/test-feedback-public-i18n.mjs` now switches the language picker to **ca** and **zh-CN** in addition to de/fr/es, and asserts body text and `document.title` contain expected localized phrases with no `FEEDBACK.*` substrings.
- **API locale:** No backend change; guest-feedback POST already uses `_get_requested_language` and the Angular `acceptLanguageInterceptor` already sends `Accept-Language` from the picker.

---

## Testing instructions

1. Stack up (e.g. HAProxy on `http://127.0.0.1:4202`).
2. **Automated:** `BASE_URL=http://127.0.0.1:4202 npm run test:feedback-public-i18n --prefix front` — expect two `>>> RESULT:` lines (main locales + token URL), exit **0**.
3. **Manual spot-check:** Open `/feedback/1` (and with a real or dummy `?token=`). Switch **English → Deutsch → Français → Español → Català → 中文（简体）**; confirm form labels, buttons, intro, and thank-you copy are fully translated (no `FEEDBACK.` literals). Optionally hard-refresh and confirm the **tab title** never flashes a raw key during load.
4. **Regression:** `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` exits **0**.
5. **Product / GitHub:** If all pass, note on **#67** for closure when product agrees.

---

## Test report

1. **Date/time (UTC) and log window:** 2026-03-24T04:24Z (verification ~04:19–04:24Z). Docker `pos-front` tail reviewed for the same window (rebuild lines only; no errors).

2. **Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (HAProxy `0.0.0.0:4202->4202/tcp`). **`BASE_URL`:** `http://127.0.0.1:4202`. **Branch:** `development` @ `20b72f6`.

3. **What was tested:** Per **Testing instructions** §1–4: stack reachability implied by tests; automated public-feedback i18n (all listed locales + token URL); regression landing/nav; manual spot-check criteria **as exercised by** `test-feedback-public-i18n.mjs` (picker locales en/de/fr/es/ca/zh-CN, `document.title` + body, no `FEEDBACK.*` substrings).

4. **Results:**
   - **Stack / HAProxy:** **PASS** — services up; tests reached the app on 4202.
   - **§2 Automated feedback i18n:** **PASS** — exit 0; two `>>> RESULT:` lines as specified (`Public feedback i18n OK …`, `Token URL path OK …`).
   - **§3 Manual spot-check:** **PASS** (equivalent) — script drives the same locale sequence and assertions (labels/title/no raw keys); no separate interactive browser session beyond Puppeteer.
   - **§4 Regression landing-version:** **PASS** — exit 0; `>>> RESULT: Landing version OK …`.

5. **Overall:** **PASS**

6. **Product owner feedback:** Public feedback i18n automation now covers six locales plus a token URL and confirms no leaked `FEEDBACK.*` keys in the checked DOM/title paths. Landing and main nav still smoke-clean after these changes. Please confirm in production (`/feedback/{tenant}` with real token) and close **#67** when satisfied.

7. **URLs tested (Puppeteer):**
   1. `http://127.0.0.1:4202/feedback/1` (per-locale navigation and assertions).
   2. `http://127.0.0.1:4202/feedback/1?token=…` (dummy token path; script assertion).
   3. `http://127.0.0.1:4202/` and logged-in sidebar routes (landing-version script).

8. **Relevant log excerpts:** `docker logs pos-front 2>&1 | tail -n 40` — `Application bundle generation complete` for `feedback-public-component` / `main` with timestamps ~`2026-03-24T04:09Z`–`04:21Z`; no TS/NG errors in tail.

**GitHub automation:** `gh issue comment` / label edit for **#67** failed with `Resource not accessible by personal access token (addComment)`. Human: post verification summary on **#67**, adjust labels (`agent:testing` → remove when done), and close the issue per product sign-off.
