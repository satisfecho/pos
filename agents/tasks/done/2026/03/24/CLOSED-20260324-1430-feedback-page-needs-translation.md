---
## Closing summary (TOP)

- **What happened:** Tester handed off after a full PASS on public feedback i18n verification (issue #67), following the French locale JSON fix and cross-locale checks.
- **What was done:** `front/public/i18n/fr.json` `FEEDBACK` block was repaired to valid JSON and aligned with other locales; remaining locales were validated; `FeedbackPublicComponent` already localized title and copy via translate pipe / stream and API errors via `Accept-Language`.
- **What was tested:** `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs` (exit 0, all `>>> RESULT: … OK`), `python3 -m json.tool` on all `front/public/i18n/*.json`, and front container logs — no `FEEDBACK.*` leaks in DOM or title for en, de, fr, es, ca, zh-CN, hi.
- **Why closed:** Overall **PASS** in the test report; acceptance criteria met for localized guest-visible feedback flow on dev.
- **Closed at (UTC):** 2026-03-24 14:36
---

# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback URL (e.g. `/feedback/{tenant}` with optional `?token=…`) shows parts of the form or UI that are not translated for the selected language. Acceptance: every guest-visible part of the flow uses the active locale—no raw `FEEDBACK.*` keys in the DOM or document title. See `front/public/i18n/` and `FeedbackPublicComponent` (`front/src/app/feedback-public/`). Prior CLOSED archives under `agents/tasks/done/` document repeated dev/test passes; issue may stay open until product/production sign-off.

## High-level instructions for coder

- Reproduce on local Docker across supported locales (language picker and `Accept-Language`), with and without a valid reservation token.
- Confirm templates, dynamic strings, API error paths, and document title stay localized; fix any missing keys or pipe/`TranslateService` usage gaps.
- Align all locale JSON files under `front/public/i18n/` for `FEEDBACK` (and related keys) where needed.
- Run or extend feedback-public i18n smoke / Puppeteer coverage if present; document evidence for GitHub when dev matches acceptance.
- Optional: spot-check production (`https://satisfecho.de`) per `docs/agent-loop.md`; support closing **#67** when product agrees.

## Coder notes (2026-03-24)

- **`front/public/i18n/fr.json`:** The `FEEDBACK` block had been **invalid JSON** (missing comma after `RATE_LIMIT`, then a duplicate key block). That prevents the locale from loading and surfaces raw `FEEDBACK.*` in the UI for French. Corrected to one `FEEDBACK` object matching the `en.json` key set and order (working tree now matches valid `development` content).
- **Other locales:** `de`, `es`, `ca`, `zh-CN`, `hi` already had complete `FEEDBACK` keys; validated with `python3 -m json.tool` on all `front/public/i18n/*.json`.
- **Component/API:** No code changes; `FeedbackPublicComponent` already uses the translate pipe / `stream()` for the document title; API errors use `Accept-Language` via the existing interceptor for localized `detail` where the backend returns `get_message(...)`.

## Testing instructions

- **What to verify:** Public `/feedback/:tenantId` (with and without `?token=…`) shows no raw `FEEDBACK.*` strings in the DOM or tab title for **en, de, fr, es, ca, zh-CN, hi**; form submit reaches thank-you with localized copy; `/feedback/0` shows localized error.
- **How to test:** Stack up with `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (HAProxy e.g. `http://127.0.0.1:4202`). Run:
  - `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs`
  - Optional: `python3 -m json.tool front/public/i18n/fr.json` (and other locales) — must exit 0.
  - After front edits: `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` — no Angular/TS build errors.
- **Pass/fail:** Puppeteer script exits 0 and prints all `>>> RESULT: … OK` lines; French locale shows human-readable French strings, not keys.

---

## Test report

1. **Date/time (UTC) and log window:** Verification run **2026-03-24T14:33Z–14:35Z** (script finished ~14:34:37Z). Front container log tail reviewed for the same session.

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **BASE_URL** `http://127.0.0.1:4202`; git branch **development**, **c9fcd92**.

3. **What was tested:** As in **Testing instructions**: `/feedback/:tenantId` with and without `?token=…`; locales **en, de, fr, es, ca, zh-CN, hi**; browser default **es** (navigator stub); POST submit → thank-you (**de**); **`/feedback/0`** error UI; no raw **`FEEDBACK.*`** in DOM or document title; optional JSON validation on locale files; front build health via container logs.

4. **Results:**
   - All listed locales, no `FEEDBACK.*` leaks (incl. FR human copy): **PASS** — `>>> RESULT: Public feedback i18n OK (en + de + fr + es + ca + zh-CN + hi, no FEEDBACK.* leaks)`
   - Token URL path: **PASS** — `>>> RESULT: Token URL path OK (no FEEDBACK.* leaks)`
   - Post-submit thank-you (de): **PASS** — `>>> RESULT: Post-submit thank-you page i18n OK (de, no FEEDBACK.* leaks)`
   - Invalid tenant `/feedback/0`: **PASS** — `>>> RESULT: Invalid tenant /feedback/0 error UI i18n OK`
   - Browser default locale (es) first load: **PASS** — `>>> RESULT: Browser default locale (es, navigator stub) on first load OK (no FEEDBACK.* leaks)`
   - `python3 -m json.tool` on **`front/public/i18n/*.json`** (incl. `fr.json`): **PASS** — all exit 0
   - `docker compose … logs --tail=80 front`: **PASS** — `Application bundle generation complete`, no TS/Angular errors in tail

5. **Overall:** **PASS**

6. **Product owner feedback:** Public feedback is localized end-to-end for every locale in scope, including French after the JSON fix. Thank-you and invalid-tenant states show real copy, not keys. Dev verification matches acceptance; issue **#67** can be closed or left for production sign-off per team habit.

7. **URLs tested:**
   1. `http://127.0.0.1:4202/feedback/1`
   2. `http://127.0.0.1:4202/feedback/1?token=dummy-token-for-i18n-smoke`
   3. `http://127.0.0.1:4202/feedback/0`

8. **Relevant log excerpts:**

Puppeteer (exit code 0):

```
>>> RESULT: Browser default locale (es, navigator stub) on first load OK (no FEEDBACK.* leaks)
>>> RESULT: Public feedback i18n OK (en + de + fr + es + ca + zh-CN + hi, no FEEDBACK.* leaks)
>>> RESULT: Token URL path OK (no FEEDBACK.* leaks)
>>> RESULT: Post-submit thank-you page i18n OK (de, no FEEDBACK.* leaks)
>>> RESULT: Invalid tenant /feedback/0 error UI i18n OK
```

`pos-front` (tail):

```
Application bundle generation complete. [0.022 seconds] - 2026-03-24T14:32:32.085Z
```
