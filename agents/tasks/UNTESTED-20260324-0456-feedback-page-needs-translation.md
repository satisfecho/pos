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
