# Feedback page needs translation

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal
The feedback page has UI text that is not localized. Translations needed for different languages (i18n). This is a feature/enhancement issue.

## High-level instructions for coder
- Review feedback Public component UI strings and identify text that needs localization
- Map out missing translation keys for common patterns (titles, labels, buttons)
- Implement i18n configuration and translation files; update feedback component template and code to use localization pipes or services with locale-aware text
- Run smoke test: access feedback page and verify language appears correctly
- Ensure translation keys are consistent with existing i18n structure in the codebase
- No database or backend API changes required; pure frontend UI localization work

## Coder notes (verification)

- **Implementation:** Already on `development`. Public route `feedback/:tenantId` → `FeedbackPublicComponent` (`front/src/app/feedback-public/`): template uses `translate` pipe for all user-visible strings; submit/API errors use `translate.instant` for `FEEDBACK.RATE_LIMIT`, `FEEDBACK.VALIDATION_ERROR`, `FEEDBACK.SUBMIT_ERROR`. Document title follows locale via `TranslateService.stream()` (issue #67 race/flicker).
- **Locales:** `FEEDBACK` keys in `front/public/i18n/en.json` are mirrored in `de`, `es`, `fr`, `ca`, `zh-CN`, `hi`.
- **Related UI:** Staff guest feedback list and reservation “tell us how we did” link already use the same `FEEDBACK.*` namespace.

## Testing instructions

1. Start stack (e.g. `docker compose -f docker-compose.yml -f docker-compose.dev.yml`); use HAProxy host port (often **4202**).
2. From repo root:  
   `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs`
3. **Pass:** All `>>> RESULT:` lines print OK; no raw `FEEDBACK.` keys in page text; ES auto-detect, locale switching, token URL, invalid token error (DE), post-submit thank-you (DE), `/feedback/0`, and missing tenant (404) paths succeed as scripted.
4. Optional manual: open `/feedback/1`, use language picker, confirm labels and browser tab title update.