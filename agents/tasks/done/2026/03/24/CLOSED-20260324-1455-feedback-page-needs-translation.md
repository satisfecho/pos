---
## Closing summary (TOP)

- **What happened:** Tester verified public guest feedback i18n for GitHub **#67** after the coder extended the Puppeteer regression to cover invalid **`?token=`** submit with **de** selected and confirmed locale JSON parity.
- **What was done:** No further product changes were needed — **`FeedbackPublicComponent`** already uses ngx-translate and localized titles; **`test-feedback-public-i18n.mjs`** now asserts the German API **detail** in **`.form-error`** and no raw **`FEEDBACK.*`** keys.
- **What was tested:** **`npm run test:feedback-public-i18n --prefix front`** (Puppeteer) on **`BASE_URL=http://127.0.0.1:4202`**, branch **`development`** @ **`6f928e2`**; all **`>>> RESULT:`** lines passed, exit **0** (locales, token URL, invalid token, thank-you, bad/missing tenant).
- **Why closed:** Test report **overall PASS**; task meets archive criteria per **`agents/tasks/README.md`**.
- **Closed at (UTC):** 2026-03-24 15:20
---

# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback (`/feedback/{tenant}`, e.g. with `?token=…`) must show fully translated UI: no missing strings, wrong language, or raw `FEEDBACK.*` keys in visible copy or document title. Reporter cited production-style URLs (e.g. satisfecho.de). Many **CLOSED** archives under `agents/tasks/done/` cover this theme; **#67** remains open until product verification and GitHub closure align with `docs/agent-loop.md`.

## High-level instructions for coder

- Reproduce `/feedback/{tenant}` with and without token across supported locales (`front/public/i18n/`, `FeedbackPublicComponent` under `front/src/app/feedback-public/`).
- Fix any remaining i18n gaps (JSON parity vs `en.json`, translate pipe / title handling, API error display).
- Run or extend automated checks (e.g. `front/scripts/test-feedback-public-i18n.mjs`) and document results for testers / product.

## Coder notes (2026-03-24)

- Checked **FEEDBACK** key parity: all locale files under `front/public/i18n/` match **en.json** (37 keys); no missing translations for public form strings.
- **Product code:** no change required for this pass — `FeedbackPublicComponent` already pipes copy through **ngx-translate**, sets the document title via **`translate.stream`**, and **`acceptLanguageInterceptor`** sends **Accept-Language** so FastAPI **`get_message`** errors match the picker.
- **Automation:** extended **`front/scripts/test-feedback-public-i18n.mjs`** with a submit on **`?token=`** bogus value while UI is **de**, asserting the German API **detail** string appears in **`.form-error`** and the DOM/title contain no raw **`FEEDBACK.*`** keys.

## Testing instructions

### What to verify

- Public **`/feedback/{tenant}`** (with and without **`?token=`**) shows no raw **`FEEDBACK.*`** keys in visible text or the browser tab title, for every language in the picker.
- After submit with an **invalid reservation token**, the inline error is **localized** (not English when **de** is selected) and still not a raw i18n key.

### How to test

- Stack up (e.g. `docker compose -f docker-compose.yml -f docker-compose.dev.yml`), note HAProxy port (often **4202**).
- From repo root or **`front/`**:
  - `BASE_URL=http://127.0.0.1:4202 npm run test:feedback-public-i18n --prefix front`
  - Or: `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs`
- Optional manual spot-check: open **`/feedback/1`**, switch languages, confirm headings/thank-you/error states and tab titles.

### Pass/fail criteria

- **Pass:** Puppeteer script exits **0**; all **`>>> RESULT:`** lines print; no assertion failures.
- **Fail:** Any visible **`FEEDBACK.`** substring in body text or document title, wrong language for the selected picker after load, or script timeout/error.

---

## Test report

1. **Date/time (UTC) and log window:** Run completed **2026-03-24T15:15:53Z**; HAProxy/back traffic reviewed **~15:14–15:16Z** (same window as `test:feedback-public-i18n` run).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **`BASE_URL=http://127.0.0.1:4202`**; **`HEADLESS=1`**; branch **`development`** @ **`6f928e2`**.

3. **What was tested:** Per **What to verify** — no raw **`FEEDBACK.*`** in visible text or document title across picker locales; invalid **`?token=`** submit shows **localized** inline error (German when **de** selected).

4. **Results:**
   - No raw **`FEEDBACK.*`** keys / titles across locales (incl. browser-default **es** stub): **PASS** — script: `>>> RESULT: Public feedback i18n OK (en + de + fr + es + ca + zh-CN + hi, no FEEDBACK.* leaks)` and first-load **es** line.
   - Token URL path without leaks: **PASS** — `>>> RESULT: Token URL path OK (no FEEDBACK.* leaks)`.
   - Invalid token submit → **de** API error in **`.form-error`**, no raw keys: **PASS** — `>>> RESULT: Submit with invalid ?token= shows DE API error (no FEEDBACK.* leaks)`.
   - Thank-you / invalid tenant / missing tenant flows i18n: **PASS** — corresponding **`>>> RESULT:`** lines; exit code **0**.

5. **Overall:** **PASS**.

6. **Product owner feedback:** Automated coverage now exercises default locale detection, every language in the picker, token URLs, a failed submit with German selected, post-submit thank-you, and error pages for bad/missing tenant. No untranslated keys appeared in the checked DOM or titles; ready to close **#67** from a verification standpoint once someone with repo permissions updates the issue.

7. **URLs tested** (via Puppeteer against **`http://127.0.0.1:4202`**, tenant **1**):
   1. `/feedback/1` (multiple locale passes)
   2. `/feedback/1?token=dummy-token-for-i18n-smoke`
   3. `/feedback/1?token=bogus-reservation-token-i18n-check` (submit → **400** guest-feedback)
   4. `/feedback/0` (invalid tenant UI)
   5. `/feedback/999999999` (missing tenant / 404-style UI)

8. **Relevant log excerpts:** `pos-haproxy` shows **200** on **`GET /feedback/1`** (with/without query), **400** on **`POST /api/public/tenants/1/guest-feedback`** (expected for invalid token), **200** on **`GET /feedback/0`** and **`GET /feedback/999999999`**.

**GitHub:** Comment on **#67** and label **`agent:testing`** / **`agent:wip`** updates were **not applied** — `gh issue comment` returned **Resource not accessible by personal access token (addComment)**. Repo label list has no **`agent:testing`** / **`agent:wip`** (only e.g. **`agent-planned`**); human with suitable **`gh`/PAT** can align issue **#67** per **`docs/agent-loop.md`**.
