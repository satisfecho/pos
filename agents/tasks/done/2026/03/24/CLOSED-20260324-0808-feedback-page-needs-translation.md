---
## Closing summary (TOP)

- **What happened:** GitHub issue **#67** (public guest feedback i18n) was verified after coder parity checks showed no code change was required and the tester ran the full local verification plan.
- **What was done:** Confirmed **FEEDBACK** key parity across locales, translate pipe usage and document-title handling in **FeedbackPublicComponent**, and **Accept-Language** wiring for guest feedback; implementation already matched acceptance on **development**.
- **What was tested:** Local Docker (**4202**): **PASS** — `test-feedback-public-i18n.mjs` (multi-locale, token path, invalid tenant), `curl` **200** on `/feedback/1`, `npm run test:landing-version` **exit 0**; optional submit-error and production spot-checks were **N/A** this run.
- **Why closed:** Tester **overall PASS**; task criteria met on **development**; production re-check left optional per test report.
- **Closed at (UTC):** 2026-03-24 08:16
---

# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback (`/feedback/{tenant}`, e.g. with `?token=…`) must show **fully translated** UI: every part of the form and related states in the selected language—no leftover English or raw translation keys. Reporter cited **satisfecho.de** example URL. Prior **`agents/tasks/done/`** archives record repeated dev/test **PASS** on **`development`**; the issue may still be open until **production** verification and product sign-off. See `front/public/i18n/`, `FeedbackPublicComponent` (`front/src/app/feedback-public/`), and `docs/agent-loop.md`.

## High-level instructions for coder

- Re-read **#67** and reproduce on local Docker (`/feedback/{tenant}`, with and without token) across supported locales (language picker and `Accept-Language`); confirm no raw `FEEDBACK.*` keys in visible UI or document title.
- If gaps remain, extend JSON in `front/public/i18n/` and wire any missing strings in `FeedbackPublicComponent` (template + title + error paths).
- If dev already matches acceptance, capture concise evidence; optional production check on **https://satisfecho.de**; support product/GitHub closure of **#67** when agreed (`docs/agent-loop.md`).

## Coder verification (2026-03-24 UTC)

- **i18n parity:** Ran a small Node check on `front/public/i18n/*.json`: every locale’s `FEEDBACK` object has the **same 37 keys** as `en.json` (de, es, fr, ca, hi, zh-CN included). `BOOK.ADDRESS` and `BOOK.OPEN_IN_GOOGLE_MAPS` exist in all files (used on the public feedback page next to `FEEDBACK.*` strings).
- **Component:** `FeedbackPublicComponent` template uses the translate pipe for all guest-visible `FEEDBACK.*` strings; document title uses `TranslateService.stream()` and reacts to `onLangChange` / `onTranslationChange` / `onDefaultLangChange` (avoids raw keys in the tab, issue **#67**).
- **API localization:** `acceptLanguageInterceptor` adds `Accept-Language` from `LanguageService`; backend guest-feedback endpoint uses `_get_requested_language` + `get_message()` for localized 400/404 details where applicable.
- **Smoke:** `GET http://127.0.0.1:4202/feedback/1` → **200**. `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` → **exit 0** (2026-03-24). Front container logs: bundle generation **complete**, no TS errors in tail.
- **Code change:** None required in this pass; acceptance on **development** already met by current tree.

## Testing instructions (for tester)

1. **Stack:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml up` (or project norm); HAProxy e.g. **4202**.
2. **Happy path:** Open `http://127.0.0.1:4202/feedback/1` (replace `1` with a real tenant id). With and without `?token=…` when a valid reservation token exists for that tenant.
3. **Locales:** Use the header language picker for **en, de, es, fr, ca, hi, zh-CN**. Confirm: no visible raw keys like `FEEDBACK.TITLE`; form, loading state, error shell, thank-you block, and **browser tab title** are all in the selected language.
4. **Error states:** `http://127.0.0.1:4202/feedback/0` (or non-numeric id) → invalid-tenant message translated. Unknown tenant id → not-found message translated.
5. **Submit errors (optional):** With UI in e.g. **Deutsch**, submit invalid contact email/phone or trigger rate limit; confirm user-visible message is German (frontend `FEEDBACK.*` and/or backend `detail` via `Accept-Language`), not a bare key.
6. **Regression:** `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` → exit **0**.
7. **Production (optional):** After deploy, spot-check `https://satisfecho.de/feedback/<tenant>` for the same checks; close **#67** when product agrees.

---

## Test report (tester)

1. **Date/time (UTC):** 2026-03-24T08:12Z–08:14Z (verification run).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch **`development`**, commit **`d8d953b`**.
3. **What was tested:** Testing instructions §1–§6 (§5 optional not executed; §7 production optional **N/A** this run).
4. **Results:**
   - **Stack / feedback/1 HTTP:** **PASS** — `curl` → `200` for `http://127.0.0.1:4202/feedback/1`.
   - **Locales / no raw keys / title / token / submit thank-you:** **PASS** — `node front/scripts/test-feedback-public-i18n.mjs` with `BASE_URL=http://127.0.0.1:4202` exited **0**; console: en+de+fr+es+ca+zh-CN+hi, navigator stub (es), token URL, DE post-submit thank-you + tab title, no `FEEDBACK.*` in DOM/title.
   - **Invalid tenant /feedback/0:** **PASS** — same script asserts EN (“Invalid restaurant…”) and DE (“Ungültiger Restaurant…”) body + DE document title, no `FEEDBACK.*` leaks.
   - **Non-numeric tenant id:** **PASS** (indirect) — `FeedbackPublicComponent` treats non-numeric `tenantId` like `tid < 1` (`invalid_tenant`); same template path as `/feedback/0`, which was exercised above.
   - **Unknown numeric tenant (not-found):** **PASS** (indirect) — API error sets `tenant_not_found`; template uses `{{ 'FEEDBACK.TENANT_NOT_FOUND' | translate }}` (same pipe as invalid branch). Coder verification documents `FEEDBACK` key parity across locales; automated script fully covered invalid branch without raw keys.
   - **Submit errors / rate limit (optional):** **N/A** — not run.
   - **Regression landing:** **PASS** — `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` → exit **0** (ended 2026-03-24T08:13:52Z).
   - **Production spot-check:** **N/A** — optional; not executed.
5. **Overall:** **PASS**
6. **Product owner feedback:** Public guest feedback on local Docker matches the acceptance goal for issue **#67**: translated UI and titles across the exercised locales, with no visible raw i18n keys. Production on **satisfecho.de** was not re-verified in this pass; recommend a short spot-check after the next deploy if the issue stays open for prod sign-off.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/feedback/1` (curl + Puppeteer flows in script)
   2. `http://127.0.0.1:4202/feedback/1?token=…` (script token path)
   3. `http://127.0.0.1:4202/feedback/0` (Puppeteer)
   4. `http://127.0.0.1:4202/` and logged-in nav (landing-version script)
8. **Relevant log excerpts:** `pos-front` tail shows `Application bundle generation complete` for `feedback-public-component` lazy chunk, no compilation errors in window. **GitHub:** `gh issue comment 67` failed with `Resource not accessible by personal access token (addComment)`; labels **`agent:testing`** / **`agent:wip`** were not updated from this environment—human or token with `issues:write` should sync labels per `docs/agent-loop.md`.
