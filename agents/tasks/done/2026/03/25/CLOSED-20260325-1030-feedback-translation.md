---
## Closing summary (TOP)

- **What happened:** GitHub issue #67 (feedback page i18n) was implemented on `development` and handed to the tester for verification.
- **What was done:** Public `FeedbackPublicComponent` uses the `translate` pipe / `translate.instant` for errors; `FEEDBACK.*` keys exist in en, de, es, fr, ca, zh-CN, and hi; document title follows locale.
- **What was tested:** `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs` — all scripted paths passed with no raw `FEEDBACK.*` key leaks in the DOM.
- **Why closed:** Test report overall **PASS**; acceptance criteria met.
- **Closed at (UTC):** 2026-03-24 15:40
---

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

---

## Test report

1. **Date/time (UTC) and log window:** 2026-03-24 15:39 UTC (verification run ~15:39–15:40 UTC). Log tail reviewed immediately after run.

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `440297a`.

3. **What was tested:** Task **Testing instructions** §2–3: `BASE_URL=http://127.0.0.1:4202 HEADLESS=1 node front/scripts/test-feedback-public-i18n.mjs` — ES auto-detect on first load, locale switching (en, de, fr, es, ca, zh-CN, hi), token URL, invalid token API error (DE), post-submit thank-you (DE), `/feedback/0`, missing tenant 404.

4. **Results:**
   - Browser default locale (es stub, no `pos_language`): **PASS** — `>>> RESULT: Browser default locale (es, navigator stub) on first load OK (no FEEDBACK.* leaks)`
   - Public feedback i18n all locales: **PASS** — `>>> RESULT: Public feedback i18n OK (en + de + fr + es + ca + zh-CN + hi, no FEEDBACK.* leaks)`
   - Token URL path: **PASS** — `>>> RESULT: Token URL path OK (no FEEDBACK.* leaks)`
   - Invalid `?token=` DE API error: **PASS** — `>>> RESULT: Submit with invalid ?token= shows DE API error (no FEEDBACK.* leaks)`
   - Post-submit thank-you (de): **PASS** — `>>> RESULT: Post-submit thank-you page i18n OK (de, no FEEDBACK.* leaks)`
   - Invalid tenant `/feedback/0`: **PASS** — `>>> RESULT: Invalid tenant /feedback/0 error UI i18n OK`
   - Missing tenant 404: **PASS** — `>>> RESULT: Missing tenant (404) error UI i18n OK`

5. **Overall:** **PASS**

6. **Product owner feedback:** Public feedback is fully covered by automated i18n checks across seven locales plus Spanish-first-visit detection, with no raw translation keys leaking into the DOM. Error and edge routes (`/feedback/0`, huge missing id) behave as expected for localized UI.

7. **URLs tested:**
   1. `http://127.0.0.1:4202/feedback/1` (primary flow, locales, token variants, submit)
   2. `http://127.0.0.1:4202/feedback/0`
   3. `http://127.0.0.1:4202/feedback/999999999`

8. **Relevant log excerpts:** `pos-front`: `Application bundle generation complete. [0.293 seconds] - 2026-03-24T15:29:59.356Z` (no errors in tail). **GitHub:** `gh issue comment` for #67 failed here with `Resource not accessible by personal access token (addComment)`; labels not updated from this environment.