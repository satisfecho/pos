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
