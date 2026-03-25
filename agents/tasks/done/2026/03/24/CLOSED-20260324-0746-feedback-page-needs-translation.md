---
## Closing summary (TOP)

- **What happened:** Closing review for GitHub **#67** (public feedback i18n): another coder/tester cycle concluded with no new code—implementation already matched acceptance.
- **What was done:** Coder documented that `FeedbackPublicComponent` and locale JSON already cover guest copy, title updates, and API error paths; **no product changes** in this pass.
- **What was tested:** `npm run test:feedback-public-i18n --prefix front` with `BASE_URL=http://127.0.0.1:4202` — **PASS** (exit 0; five `>>> RESULT: … OK` lines; thank-you, token URL, invalid tenant); front logs show clean bundle generation per test report.
- **Why closed:** Tester **overall PASS**; all task pass/fail criteria satisfied; optional production check on satisfecho.de and issue **#67** close remain per product (`docs/agent-loop.md`).
- **Closed at (UTC):** 2026-03-24 08:05
---

# Feedback page needs translation

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal
Public guest feedback URLs such as `/feedback/{tenant}` with optional `?token=…` must show **fully translated** UI in the selected language. The issue reports untranslated strings on production-style URLs (example in issue body). Every part of the form and related states should use i18n; no raw translation keys in visible copy or document title. See `front/src/app/feedback-public/`, `front/public/i18n/`, and prior `agents/tasks/done/**/CLOSED-*-feedback-page-needs-translation.md` archives for context.

## High-level instructions for coder
- Re-read issue **#67** and reproduce on local Docker (`/feedback/{tenant}`, with and without token) across supported locales (picker and `Accept-Language`).
- Confirm no raw `FEEDBACK.*` keys in DOM, user-visible strings, or tab title after locale switches.
- If gaps exist, fix templates/services and JSON under `front/public/i18n/`; keep API error paths localized where user-facing.
- If dev already matches acceptance, capture concise evidence; optional production check on **satisfecho.de**; support product/GitHub closure of **#67** when agreed (`docs/agent-loop.md`).

## Coder (feature) — 2026-03-24

- **FEAT → WIP** on pickup. Verified `FeedbackPublicComponent` uses `translate` pipe for all guest copy; document title uses `translate.get` with `onLangChange`/`onTranslationChange` so no raw `FEEDBACK.*` in tab. `FEEDBACK` keys present in all locales (en, de, es, fr, ca, zh-CN, hi); `BOOK.ADDRESS` and `BOOK.OPEN_IN_GOOGLE_MAPS` used in thank-you header; API error paths use `translate.instant`.
- **No code changes** — behaviour already meets acceptance. `BASE_URL=http://127.0.0.1:4202 npm run test:feedback-public-i18n --prefix front` **PASS** (exit 0; five `>>> RESULT: … OK` lines). Front logs: `Application bundle generation complete`, no TS errors.

## Testing instructions

### What to verify

- Public `/feedback/{tenant}` (with and without `?token=…`) shows **no raw `FEEDBACK.*` strings** in the page body or **document title** for supported locales (picker + first-visit language detection).
- Error states (invalid id, tenant not found) and thank-you after submit stay fully translated.

### How to test

- Stack: `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (HAProxy host port often **4202**).
- From repo root: `BASE_URL=http://127.0.0.1:4202 npm run test:feedback-public-i18n --prefix front`  
  or `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs`.
- Optional manual: `/feedback/1`, switch language via picker, confirm title and strings match (no key paths).

### Pass / fail criteria

- **Pass:** Script exits **0**; logged `>>> RESULT: … OK` lines; no `FEEDBACK.` in visible UI or title during checks; front logs show successful bundle generation without TS/template errors.
- **Fail:** Raw i18n keys in DOM or title, script throws, or Angular errors in `docker compose … logs --tail=80 front`.

### Follow-up (outside automated test)

- Optional production check on **https://satisfecho.de**; GitHub **#67** comment / close when product accepts (`docs/agent-loop.md`).

---

## Test report

**Date/time (UTC):** 2026-03-24 ~05:47 UTC  
**Log window:** `docker compose … logs --tail=30 front` (UTC aligned with test run)

**Environment:**  
- Compose: `docker-compose.yml` + `docker-compose.dev.yml`  
- BASE_URL: `http://127.0.0.1:4202`  
- Branch: `development`

**What was tested:**  
Public `/feedback/{tenant}` (with and without `?token=…`) for no raw `FEEDBACK.*` strings in body or document title across supported locales; error states and thank-you after submit; first-visit language detection.

**Results:**

| Criterion | Result | Evidence |
|-----------|--------|----------|
| Script exit code 0 | PASS | `npm run test:feedback-public-i18n` returned 0 |
| Five `>>> RESULT: … OK` lines | PASS | All five checks logged: browser default locale, en+de+fr+es+ca+zh-CN+hi, token URL, post-submit thank-you, invalid tenant error |
| No FEEDBACK.* in UI/title | PASS | Per-script assertion (no leaks reported) |
| Front bundle generation no TS errors | PASS | `Application bundle generation complete. [0.254 seconds]`; no TS/template errors in logs |

**Overall:** **PASS**

**Product owner feedback:**  
Behaviour meets acceptance: feedback page is fully translated across supported locales; document title, form, thank-you state, and error states show no raw i18n keys. Ready for closing reviewer; optional production check on satisfecho.de remains if desired.

**URLs tested:**  
- `http://127.0.0.1:4202/feedback/1` (with locale picker and token variants)  
- `http://127.0.0.1:4202/feedback/0` (invalid tenant error)

**Relevant log excerpts:**
```
>>> RESULT: Browser default locale (es, navigator stub) on first load OK (no FEEDBACK.* leaks)
>>> RESULT: Public feedback i18n OK (en + de + fr + es + ca + zh-CN + hi, no FEEDBACK.* leaks)
>>> RESULT: Token URL path OK (no FEEDBACK.* leaks)
>>> RESULT: Post-submit thank-you page i18n OK (de, no FEEDBACK.* leaks)
>>> RESULT: Invalid tenant /feedback/0 error UI i18n OK
pos-front | Application bundle generation complete. [0.254 seconds]
```
