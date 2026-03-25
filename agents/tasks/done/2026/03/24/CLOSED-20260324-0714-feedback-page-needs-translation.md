---
## Closing summary (TOP)

- **What happened:** Work tracked for GitHub **#67** (fully localized guest feedback at `/feedback/{tenant}`) was completed on **development** and handed to the tester with clear PASS evidence.
- **What was done:** Guest feedback UI uses `TranslateModule` / pipes and translated document titles; `FEEDBACK` keys are present across **en**, **de**, **fr**, **es**, **ca**, **zh-CN**, and **hi**; API error paths use translated strings. The coder pass found no further product code changes needed.
- **What was tested:** `npm run test:feedback-public-i18n` and `npm run test:landing-version` (BASE_URL `http://127.0.0.1:4202`) both **PASS** on commit **a6d14f7**; manual full language-picker sweep and production spot-check were explicitly out of scope for this test report.
- **Why closed:** Required automated verification passed; task meets archive criteria per **`agents/tasks/README.md`**. **#67** may stay open until optional product sign-off on **satisfecho.de** (as noted in the test report).
- **Closed at (UTC):** 2026-03-24 07:19
---

# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback (e.g. `/feedback/{tenant}` with optional `?token=…`, including production URLs) must show **fully localized** UI: no untranslated segments in the form or related states for the user’s selected language. Issue reporter listed several untranslated spots on the token deep link.

Prior **`agents/tasks/done/`** archives document repeated dev/test **PASS** on **`development`**; **#67** may remain open until optional production spot-check and product sign-off. See `front/public/i18n/`, `FeedbackPublicComponent`, and `docs/agent-loop.md`.

## High-level instructions for coder

- Re-read **#67** and exercise `/feedback/{tenant}` with and without `?token=…` across supported locales (language picker and `Accept-Language`).
- Confirm no raw `FEEDBACK.*` keys (or other i18n leaks) in visible DOM, document title, or post-submit states.
- If anything is still missing, add keys in all locale JSON files under `front/public/i18n/` and bind in the guest feedback templates/components.
- Run or extend the existing feedback i18n smoke (Puppeteer under `front/scripts/` if present) and note results for the closer.
- If dev matches acceptance: optional verification on **satisfecho.de**; support a short GitHub verification comment and closing **#67** when product agrees.

## Coder verification (2026-03-24 UTC, feature-coder)

- **Flow:** `FEAT-20260324-0714-…` → `WIP-20260324-0714-…` on start.
- **Code review:** `FeedbackPublicComponent` (`front/src/app/feedback-public/`) uses `TranslateModule` / pipes for all guest-visible strings; document title uses `translate.get(…)` with subscriptions on `onLangChange` / `onTranslationChange` (issue **#67**). API error paths use `translate.instant` for rate limit, validation, and generic submit errors.
- **Locale parity:** `FEEDBACK` keys in `front/public/i18n/en.json` match the key set in `de`, `fr`, `es`, `ca`, `zh-CN`, `hi` (script check: no missing keys).
- **No product code changes** required in this pass; behaviour matches acceptance in dev.

### Evidence (automated)

- `BASE_URL=http://127.0.0.1:4202 npm run test:feedback-public-i18n --prefix front` — **PASS** (commit **3435dce**, branch **development**).
- `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` — **PASS**.

**Product:** Optional spot-check on **https://satisfecho.de/feedback/1** (and with a real reservation `?token=` if available); close **#67** when product agrees.

---

## Testing instructions

1. **Primary:** With app reachable (e.g. Docker dev on **4202**), from repo root:  
   `BASE_URL=http://127.0.0.1:4202 npm run test:feedback-public-i18n --prefix front`  
   Expect exit **0** and log lines ending with “no FEEDBACK.* leaks” / “Invalid tenant … OK”.
2. **Regression:** `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` — exit **0**.
3. **Manual (optional):** Open `/feedback/1`, cycle language picker; repeat with `?token=…`; open `/feedback/0` and confirm error strings are translated, not raw keys.
4. **Production (optional):** Same checks on **satisfecho.de** before closing **#67**.

---

## Test report

1. **Date/time (UTC) and log window:** Started **2026-03-24 07:17:19 UTC**; finished **2026-03-24 07:18:05 UTC** (approx.). Docker `pos-front` / `pos-back` tails reviewed for the same window.

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **BASE_URL** `http://127.0.0.1:4202` (HAProxy → front). Branch **development**, commit **a6d14f7**.

3. **What was tested:** Items 1–2 from **Testing instructions** (primary feedback i18n smoke + landing regression). Items 3–4 (manual browser sweep, production) **not** run this pass.

4. **Results:**
   - **Primary (`test:feedback-public-i18n`):** **PASS** — exit 0; console lines: browser default locale (es stub) OK; en+de+fr+es+ca+zh-CN+hi OK; token URL OK; post-submit thank-you (de) OK; invalid tenant `/feedback/0` OK; all “no FEEDBACK.* leaks”.
   - **Regression (`test:landing-version`):** **PASS** — exit 0; “Landing version OK; demo login (tenant=1) OK; sidebar nav OK.”

5. **Overall:** **PASS** (required automated criteria met).

6. **Product owner feedback:** Guest feedback i18n automation on dev matches the acceptance described in **#67**: locales, token path, thank-you, and invalid-tenant error are covered without raw `FEEDBACK.*` in the DOM. Optional manual language-picker pass and **satisfecho.de** spot-check remain for product sign-off before closing the issue.

7. **URLs tested (Puppeteer, primary script):**
   1. `http://127.0.0.1:4202/feedback/1` (multiple locale switches and loads)
   2. `http://127.0.0.1:4202/feedback/1?token=…` (test token query)
   3. `http://127.0.0.1:4202/feedback/0` (invalid tenant)
   - **Landing regression** additionally hit `/`, `/dashboard`, and 15+ staff routes per `test-landing-version.mjs` (sidebar nav).

8. **Relevant log excerpts:**
   - **pos-back:** `GET /public/tenants/1` 200; `POST /public/tenants/1/guest-feedback` 200 (feedback submit during i18n test).
   - **pos-front:** `Application bundle generation complete` for `feedback-public-component` chunk (no TS/NG errors in tail).
