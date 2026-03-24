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
