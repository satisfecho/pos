---
## Closing summary (TOP)

- **What happened:** Tester ran the public feedback i18n Puppeteer script on the dev stack and recorded an overall **PASS** for automated criteria aligned with GitHub **#67**.
- **What was done:** Prior work confirmed FEEDBACK keys across locales, public feedback UI uses translations, and `test-feedback-public-i18n.mjs` was extended (es navigator stub, `/feedback/0` error UI); this run verified those checks end-to-end.
- **What was tested:** `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs` — **exit 0**, four expected `>>> RESULT:` lines, no raw `FEEDBACK.` in DOM/title assertions; optional manual and staging/prod spot-checks were **N/A** in the report.
- **Why closed:** Automated acceptance criteria in the task test report are satisfied; file archived per agent closing workflow (GitHub verification comment on **#67** still needs a human if PAT cannot post).
- **Closed at (UTC):** 2026-03-24 05:02
---

# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback URLs (e.g. `/feedback/{tenant}?token=…`) must show **the whole form and UI** in the user’s selected language. The reporter still sees untranslated strings on production-style URLs. Multiple **CLOSED** archives under `agents/tasks/done/` document prior i18n work and tester passes; **#67** is still **open** — treat as **final verification** (dev/staging/prod), any **real gaps**, and **GitHub alignment** (comment, labels, close when product accepts). See `front/public/i18n/` and `docs/agent-loop.md`.

## High-level instructions for coder

- Re-read **#67** and spot-check `/feedback/{tenant}` with and without token across several locales (picker + `Accept-Language`).
- Run or extend automated coverage (e.g. `test-feedback-public-i18n` if present) so regressions are caught.
- If behaviour matches acceptance everywhere tested: hand off to tester; coordinate **close #67** per `docs/agent-loop.md` (automation may lack Issues write — human can comment/close).

## Coder notes (2026-03-24 UTC)

- Confirmed **FEEDBACK** object keys match **en.json** across **de**, **es**, **fr**, **ca**, **zh-CN**, **hi** (no missing keys).
- **Public feedback UI** (`feedback-public.component.html` / `.ts`) already uses the translate pipe / `TranslateService` for visible copy and document title; no additional template changes in this pass.
- Extended **`front/scripts/test-feedback-public-i18n.mjs`**: second Chromium instance with **`evaluateOnNewDocument`** stub of **`navigator.language` / `navigator.languages`** to **es-ES** (no `pos_language` in storage) so **LanguageService** browser detection is covered on first load, in addition to picker-driven locale switches.

## Testing instructions

1. Start the stack (e.g. HAProxy on **4202** per dev compose).
2. From repo root: `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs` — expect **exit 0** and four `>>> RESULT:` lines, including **“Browser default locale (es, navigator stub) on first load OK”** and **“Invalid tenant /feedback/0 error UI i18n OK”**.
3. Optional manual: open `/feedback/1`, `/feedback/1?token=dummy`, cycle the language picker; open `/feedback/0` and confirm error strings and tab title track the picker — **no** raw **`FEEDBACK.`** substrings in the visible page.
4. If product requires: repeat a quick spot-check on **staging/production** (GitHub **#67**).
5. **GitHub:** After pass, add a short verification comment on **#67**; close the issue when product accepts (automation may not have Issues write access).

---

## Test report

1. **Date/time (UTC):** 2026-03-24T05:00:44Z (script start). **Log window:** ~05:00:44Z–05:01:05Z (HAProxy timestamps 24/Mar/2026:05:00:51–05:00:54).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **BASE_URL** `http://127.0.0.1:4202`; branch **development**; **TENANT_ID** default `1` (script).

3. **What was tested:** Per **Testing instructions** §1–2 (stack + `test-feedback-public-i18n.mjs`). Optional manual §3 and staging/prod §4 not run.

4. **Results:**
   - **Stack reachable / script exit 0:** **PASS** — `node front/scripts/test-feedback-public-i18n.mjs` exited **0**.
   - **Four `>>> RESULT:` lines including es navigator stub and /feedback/0 i18n:** **PASS** — console showed all four expected lines verbatim.
   - **No raw `FEEDBACK.*` in automated DOM checks:** **PASS** — script asserts absence of `FEEDBACK.` in body/title checks.
   - **Optional manual / prod spot-check:** **N/A** (not required for automated criteria).

5. **Overall:** **PASS**.

6. **Product owner feedback:** Public feedback i18n is covered by the extended Puppeteer script, including first-load browser locale (es stub) and invalid-tenant error copy across locales. Staging/production were not exercised in this run; if anything still looks untranslated on a specific URL, capture locale and a screenshot for a follow-up.

7. **URLs tested** (Puppeteer, tenant `1` unless noted):
   1. `http://127.0.0.1:4202/feedback/1` (multiple passes: es auto, then picker locales)
   2. `http://127.0.0.1:4202/feedback/1?token=dummy-token-for-i18n-smoke`
   3. `http://127.0.0.1:4202/feedback/0` (invalid tenant, en then de)

8. **Relevant log excerpts:**
   - **HAProxy:** `GET /feedback/1` and related assets 200/304; `GET /api/public/tenants/1` 200; `GET /feedback/0` 200; `GET /i18n/en.json`, `GET /i18n/de.json` 304 — timestamps `24/Mar/2026:05:00:51`–`05:00:54`.
   - **pos-front:** Recent lines show `feedback-public-component` lazy chunk rebuild complete with no errors (e.g. `Application bundle generation complete` at 2026-03-24T04:46:37.705Z prior to test window).

**GitHub:** `gh issue comment 67` failed (`Resource not accessible by personal access token`). Per task instructions, a human should add the short verification comment on **#67** and close when product accepts.
