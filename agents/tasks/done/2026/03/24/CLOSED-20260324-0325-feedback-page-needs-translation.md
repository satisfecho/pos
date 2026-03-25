---
## Closing summary (TOP)

- **What happened:** Public `/feedback/{tenant}` and related flows showed raw ngx-translate keys on first load because locale JSON requests hit a `LanguageService` ↔ `HttpClient` circular dependency.
- **What was done:** The accept-language interceptor now injects `LanguageService` only for API requests; feedback page document title follows locale changes; missing `NAV` / `RESERVATIONS` strings were added for several locales. Tester re-ran the documented checks and Puppeteer scripts on the dev stack.
- **What was tested:** Local HAProxy (4202): console free of `_LanguageService` circular dependency, EN first paint, DE and zh-CN copy including document title, `/book/1` sanity, `test:feedback-public-i18n` and `test:landing-version` — all **PASS**; optional production check not run.
- **Why closed:** Test report records overall **PASS** against the task criteria; remaining GitHub #67 housekeeping is for humans (token could not post issue comments from the agent environment).
- **Closed at (UTC):** 2026-03-24 04:15
---

# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public feedback URLs (e.g. `/feedback/{tenant}` with token) must show **every** part of the form in the user’s selected language. The reporter saw untranslated strings on a production-style URL (`satisfecho.de/feedback/1?token=…`).

Prior implementation and multiple **CLOSED** archives under `agents/tasks/done/` document i18n work and repeated tester **PASS** for this scope; **#67** remains **open** — treat remaining work as **final verification** (including production if applicable), any **real i18n gaps** found in QA, and **GitHub alignment** (comment / labels / close when product accepts). See `docs/agent-loop.md` and locale files under `front/public/i18n/`.

## High-level instructions for coder

- Reproduce `/feedback/{tenant}` with language picker across at least two non-English locales; confirm intros, labels, validation messages, loading/error paths, and invalid-tenant screens use translations (no hard-coded English left for user-visible copy on that flow).
- Cross-check `FEEDBACK` (and related) keys across locale JSON files; fix missing keys or invalid JSON if found.
- Run targeted smoke or Puppeteer scripts documented for feedback/landing if present; align outcomes with `docs/agent-loop.md` for handoff when product accepts closure of **#67**.
- If behaviour matches the issue everywhere tested: post verification or suggested closing comment on **#67**, adjust labels per `docs/agent-loop.md`, and close when product agrees (or document handoff if automation lacks Issues write).

## Coder notes (2026-03-24 UTC)

- **Root cause:** `accept-language.interceptor.ts` called `inject(LanguageService)` on **every** `HttpClient` request. Loading `/i18n/*.json` runs while `LanguageService` is still constructing (`translate.use` → HttpClient), which triggered Angular **circular dependency** (`_LanguageService`) and prevented locale JSON from loading — ngx-translate showed raw keys (`FEEDBACK.TITLE`, `BOOK.ADDRESS`, …) until the user changed language. **Fix:** inject `LanguageService` only when `req.url.startsWith(environment.apiUrl)` (API requests).
- **Polish:** `FeedbackPublicComponent` sets `document.title` from `FEEDBACK.*` + tenant name; `onLangChange` updates the title.
- **Locales:** Translated `NAV.GUEST_FEEDBACK` and `RESERVATIONS.VIEW_FEEDBACK_PAGE` for ca, fr, hi, zh-CN (were still English).
- **Regression test:** `npm run test:feedback-public-i18n --prefix front` (Puppeteer).

---

## Testing instructions

1. **Stack:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (or `./run.sh`); app on **HAProxy** port (e.g. `http://127.0.0.1:4202`).
2. **Browser console (sanity):** Open `/feedback/1` (or another valid tenant). DevTools console must **not** show `Circular dependency detected for _LanguageService`.
3. **First paint (en):** Without touching the language picker, confirm the pill and form show human text (e.g. “How was your visit?”), **not** `FEEDBACK.*` or `BOOK.*` literals.
4. **Deutsch:** Switch language to **Deutsch**; confirm German strings (e.g. “Wie war Ihr Besuch?”) and **document title** contains “Wie war”.
5. **Second locale:** Repeat spot-check for **Español** or **中文（简体）** (intro + submit button + error shell if you force invalid tenant id).
6. **Public book regression:** `/book/1` — labels should translate on first load (same interceptor fix).
7. **Automated:** From repo root:  
   `BASE_URL=http://127.0.0.1:4202 npm run test:feedback-public-i18n --prefix front`  
   `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front`
8. **Production (optional):** After deploy, repeat (3)–(4) on `https://satisfecho.de/feedback/1` (or tenant URL from issue).

**GitHub #67:** If all pass, closer/product can comment, adjust labels per `docs/agent-loop.md`, and close when agreed.

---

## Test report

1. **Date/time (UTC):** 2026-03-24 ~03:36–03:40 (verification window). Log window: `docker logs pos-front` tail ~40 lines after runs.

2. **Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (services up: haproxy `0.0.0.0:4202`, back, front, db, redis). **`BASE_URL`:** `http://127.0.0.1:4202`. **Branch:** `development` @ `0072deb`.

3. **What was tested:** Items 1–7 from **Testing instructions** above (stack, console sanity, first paint EN, DE copy + title, second locale zh-CN, `/book/1` first load, automated npm scripts). Item 8 (production) not run (optional).

4. **Results:**
   - (1) Stack reachable on 4202 — **PASS** (`docker compose ps` shows haproxy published).
   - (2) No `_LanguageService` / circular dependency in browser console — **PASS** (Puppeteer `console` listener on `/feedback/1` then `/book/1`: zero matches).
   - (3) First paint EN, no `FEEDBACK.*` in body — **PASS** (`test:feedback-public-i18n` `waitForFunction` + assertion).
   - (4) Deutsch + title “Wie war” — **PASS** (same script).
   - (5) Second locale zh-CN on `/feedback/1` — **PASS** (inline Puppeteer: no `FEEDBACK.` in body; title sample `Cobalto – 本次用餐体验如何？`). Invalid-tenant error shell not exercised.
   - (6) `/book/1` first load — **PASS** (visited in console-scan navigation before zh-CN feedback check; no console circular-deps).
   - (7) Automated scripts — **PASS** (`test:feedback-public-i18n` exit 0; `test:landing-version` exit 0).
   - (8) Production — **N/A** (optional; not executed).

5. **Overall:** **PASS**

6. **Product owner feedback:** Public feedback and book flows load translations on first paint without raw `FEEDBACK.*` keys; German and Simplified Chinese spot-checks match expectations, including document title. Recommend human confirmation on production (`satisfecho.de`) when convenient, then close **#67** if aligned.

7. **URLs tested:**
   1. `http://127.0.0.1:4202/feedback/1` (en, de, zh-CN)
   2. `http://127.0.0.1:4202/book/1` (navigation for console sanity)

8. **Relevant log excerpts:** `pos-front` tail shows successful Angular rebuilds (`Application bundle generation complete`) with `feedback-public-component` / `book-component` lazy chunks; no `Circular` / `_LanguageService` / error lines in sampled tail.

**GitHub:** `gh issue comment` / `gh issue edit` (labels) failed here with `Resource not accessible by personal access token (addComment)` — **agent could not set `agent:testing` or post “Verification started”.** Closer/human should update **#67** labels per `docs/agent-loop.md` and add a short verification comment manually if needed.
