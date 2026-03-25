---
## Closing summary (TOP)

- **What happened:** GitHub issue #67 (public guest feedback i18n) was verified on `development`; no further code changes were required on the current tree.
- **What was done:** Locale parity for `FEEDBACK.*` (37 keys across seven locales) and public `FeedbackPublicComponent` behavior already matched acceptance; coder noted zero product diff.
- **What was tested:** `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs` — exit 0; all seven scripted `>>> RESULT:` paths passed with no raw `FEEDBACK.` leaks and correct DE API error wording for invalid token.
- **Why closed:** Test report overall **PASS**; acceptance criteria met.
- **Closed at (UTC):** 2026-03-24 15:51
---

# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback URL (e.g. production-style `https://satisfecho.de/feedback/1?token=…`) still shows parts of the form or page that are not in the user-selected language. Acceptance: every guest-visible part of the feedback flow is translated; no raw `FEEDBACK.*` keys or wrong-language copy. See `front/src/app/feedback-public/`, `front/public/i18n/`, and `front/scripts/test-feedback-public-i18n.mjs` for prior verification work documented in `agents/tasks/done/`.

## High-level instructions for coder

- Reproduce locally on Docker (`/feedback/{tenant}` with and without valid `?token=`) and compare every locale in the language picker plus default detection.
- Fix any remaining untranslated template strings, API error messages, document title, or loading/empty states; keep parity across locale JSON files.
- Run or extend the feedback-public i18n Puppeteer script; note any production-only gaps for the closer.

## Coder notes

- **2026-03-24 (UTC):** Confirmed current `development` already satisfies acceptance (same implementation as archived `agents/tasks/done/2026/03/25/CLOSED-20260325-1030-feedback-translation.md`).
- **Locale parity:** All seven locale files have the same `FEEDBACK` leaf keys as `en.json` (37 keys); no gaps.
- **Automated test:** `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs` — exit 0; all `>>> RESULT:` lines OK (ES first-visit stub, locale switching, token URL, invalid token + DE API message, thank-you, `/feedback/0`, missing tenant 404).
- **Product diff:** None required for this task on the current tree.

## Testing instructions

### What to verify

- Public `/feedback/:tenantId` shows no raw `FEEDBACK.*` keys in visible text or document title across supported locales; API-backed errors respect UI language (`Accept-Language`).

### How to test

1. Stack: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d` (or existing dev stack); use HAProxy port (often **4202**).
2. From repo root:  
   `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs`
3. Optional manual: open `/feedback/1`, switch languages, confirm form labels and browser tab title update; try `?token=` with invalid token after switching to DE and submit — error should be German API wording, not raw keys.

### Pass / fail

- **Pass:** Script completes with all `>>> RESULT:` success lines; no `FEEDBACK.` substring in body text where the script asserts against it; front container logs show no Angular build errors after any follow-up edits.
- **Fail:** Any raw i18n key in guest-visible UI, wrong-language API error for the selected UI locale, or script assertion timeout/error.

---

## Test report

1. **Date/time (UTC) and log window:** 2026-03-24T15:50:28Z (verification run ~15:50–16:01 UTC); `docker compose … logs --tail=80 front` sampled immediately after Puppeteer run.

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development`, commit `db52e21`; Puppeteer `HEADLESS=1`.

3. **What was tested:** Per “What to verify”: no raw `FEEDBACK.*` in visible text or document title on public `/feedback/:tenantId` across locales; API-backed invalid-token error respects UI language (`Accept-Language` / DE selection).

4. **Results:**
   - No raw `FEEDBACK.*` keys in guest-visible UI or title across locales — **PASS** (script asserts `!innerText.includes('FEEDBACK.')` and title checks for en/de/fr/es/ca/zh-CN/hi; exit 0).
   - Invalid `?token=` submit shows German API wording when UI is DE — **PASS** (`.form-error` contains `Ungültiger` / `Reservierungslink`).
   - Automated script completes with all success lines — **PASS** (`node front/scripts/test-feedback-public-i18n.mjs` exit 0, seven `>>> RESULT:` OK).
   - Front container shows no Angular build errors in sampled window — **PASS** (only “Application bundle generation complete” lines).

5. **Overall:** **PASS**

6. **Product owner feedback:** Public feedback stays fully localized in automated checks: language picker, titles, token URL, thank-you flow, and error states (invalid tenant / missing tenant) show human copy, not keys. Invalid reservation links surface a clear German message when the guest has chosen German, matching expectations for guest-facing polish.

7. **URLs tested:**
   1. `http://127.0.0.1:4202/feedback/1` (first browser: ES navigator stub)
   2. `http://127.0.0.1:4202/feedback/1` (locale cycling en → de → fr → es → ca → zh-CN → hi)
   3. `http://127.0.0.1:4202/feedback/1?token=dummy-token-for-i18n-smoke`
   4. `http://127.0.0.1:4202/feedback/1?token=bogus-reservation-token-i18n-check` (submit → DE error)
   5. `http://127.0.0.1:4202/feedback/1` (valid submit → thank-you DE)
   6. `http://127.0.0.1:4202/feedback/0` (invalid tenant, en + de)
   7. `http://127.0.0.1:4202/feedback/999999999` (404 missing tenant, en + de)

8. **Relevant log excerpts:**

```
pos-front | Application bundle generation complete. [1.575 seconds] - 2026-03-24T15:27:07.538Z
pos-front | Application bundle generation complete. [0.293 seconds] - 2026-03-24T15:29:59.356Z
```

Puppeteer stdout (evidence of pass):

```
>>> RESULT: Browser default locale (es, navigator stub) on first load OK (no FEEDBACK.* leaks)
>>> RESULT: Public feedback i18n OK (en + de + fr + es + ca + zh-CN + hi, no FEEDBACK.* leaks)
>>> RESULT: Token URL path OK (no FEEDBACK.* leaks)
>>> RESULT: Submit with invalid ?token= shows DE API error (no FEEDBACK.* leaks)
>>> RESULT: Post-submit thank-you page i18n OK (de, no FEEDBACK.* leaks)
>>> RESULT: Invalid tenant /feedback/0 error UI i18n OK
>>> RESULT: Missing tenant (404) error UI i18n OK
```
