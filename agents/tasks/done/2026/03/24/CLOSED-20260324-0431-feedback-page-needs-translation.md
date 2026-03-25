---
## Closing summary (TOP)

- **What happened:** GitHub [#67](https://github.com/satisfecho/pos/issues/67) tracked missing translations on public guest feedback URLs (`/feedback/{tenant}`, token flow); the loop reached verified closure after coder hardening and a full tester run.
- **What was done:** Confirmed `FeedbackPublicComponent` uses ngx-translate end-to-end; extended `front/scripts/test-feedback-public-i18n.mjs` (hi locale, `/feedback/0` invalid-tenant + de switch, localStorage ordering) and aligned `docs/testing.md` with the script.
- **What was tested:** `BASE_URL=http://127.0.0.1:4202 npm run test:feedback-public-i18n` on docker dev (HAProxy 4202) — **PASS** (no `FEEDBACK.*` leaks, titles, token URL, invalid tenant i18n).
- **Why closed:** Test report documents **PASS** on all stated criteria; archive per `agents/tasks/README.md`. Optional production spot-check on satisfecho.de was not run; `gh issue comment` previously failed (token) — human may still post, adjust labels, and decide close vs prod confirmation.
- **Closed at (UTC):** 2026-03-24 04:37
---

# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback URLs (e.g. `/feedback/{tenant}` with `?token=…`) must show **the entire form and UI** in the user’s selected language. The reporter saw untranslated strings on production-style URLs. Multiple **`agents/tasks/done/`** archives document prior implementation and tester passes; **#67** remains **open** — treat remaining work as **final verification** (dev/staging/prod), any **real i18n gaps**, and **GitHub alignment** (comment, labels, close when product accepts). See `front/public/i18n/` and `docs/agent-loop.md`.

## High-level instructions for coder

- Re-check `/feedback/{tenant}` with and without token across supported locales; confirm no raw `FEEDBACK.*` keys, correct document titles, and API validation/error copy respecting `Accept-Language` / locale picker where applicable.
- Run or extend Puppeteer/smoke coverage for public feedback if documented in `docs/testing.md`.
- If behaviour matches the issue everywhere tested: hand off for tester and coordinate **close #67** on GitHub per `docs/agent-loop.md` (human may need to post if automation lacks Issues write).

## Coder notes (2026-03-24 UTC)

- Re-checked `FeedbackPublicComponent`: form, errors, loading, thank-you, and document title use ngx-translate; submit path maps **429**/**422** to `FEEDBACK.*`; string `detail` from API is used only when backend returns a localized message (`Accept-Language` via `acceptLanguageInterceptor` + `LanguageService`).
- Extended **`front/scripts/test-feedback-public-i18n.mjs`**: **hi** in the picker loop; invalid tenant **`/feedback/0`** (switches to **de** for body + title); before the invalid-tenant navigation, **`en`** is selected so **localStorage** from earlier steps does not assert the wrong language.
- **`docs/testing.md`:** table row for `test:feedback-public-i18n` updated to match the script.

## Testing instructions

### What to verify

- Public `/feedback/1` (or `TENANT_ID`): no raw `FEEDBACK.*` in visible text; document title matches selected locale after using the language picker.
- Same with `?token=…` (dummy token is fine for copy/title checks).
- `/feedback/0`: error state shows translated invalid-tenant copy and title; switching to **Deutsch** shows German strings, still no raw keys.

### How to test

- Stack up (e.g. HAProxy on **4202**): `docker compose -f docker-compose.yml -f docker-compose.dev.yml ps`
- From **`front/`:** `BASE_URL=http://127.0.0.1:4202 npm run test:feedback-public-i18n`
- Optional: manual spot-check production URL from the issue on **satisfecho.de** with the same picker locales.

### Pass / fail criteria

- **Pass:** Script exits **0**; manual checks show no English-only leaks when a non-English locale is selected (except tenant-provided fields: name, address, description).
- **Fail:** Any `FEEDBACK.` substring in body text, wrong tab title for the active locale, or script timeout/error.

### GitHub (#67)

- After tester **closed** loop: comment on the issue, align labels per **`docs/agent-loop.md`**; close when product accepts (human if no API token).

---

## Test report

1. **Date/time (UTC):** 2026-03-24 04:35:55 – 04:36:20 (verification run). Log excerpts below from **04:36** UTC (HAProxy / front).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **`BASE_URL`** `http://127.0.0.1:4202`; branch **`development`**, commit **`cae97c7`**.
3. **What was tested:** Public feedback i18n per **What to verify** (locales, token URL, invalid tenant `/feedback/0`).
4. **Results:**
   - No raw `FEEDBACK.*` in visible text on `/feedback/1` after picker cycles (**PASS**) — evidence: `npm run test:feedback-public-i18n` stdout: “no FEEDBACK.* leaks”.
   - Document title matches selected locale (**PASS**) — same script assertion path (title checks in script).
   - Token URL `?token=…` copy/title (**PASS**) — stdout: “Token URL path OK”.
   - `/feedback/0` translated error + Deutsch switch, no raw keys (**PASS**) — stdout: “Invalid tenant /feedback/0 error UI i18n OK”.
   - Script exit code (**PASS**) — exit **0**.
5. **Overall:** **PASS** (all criteria above).
6. **Product owner feedback:** Automated coverage now includes **hi** and invalid-tenant **de** assertions; local dev stack behaviour matches the stated acceptance criteria. Optional production spot-check on **satisfecho.de** was not run in this pass; recommend a quick manual picker check on prod before closing **#67** if desired.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/feedback/1` (en, de, fr, es, ca, zh-CN, hi via picker)
   2. `http://127.0.0.1:4202/feedback/1?token=dummy-token-for-i18n-smoke`
   3. `http://127.0.0.1:4202/feedback/0` (invalid tenant; en then de)
8. **Relevant log excerpts:**
   - HAProxy (sample during run): `GET /i18n/es.json`, `GET /i18n/en.json`, `GET /api/public/tenants/1` → **200**.
   - Front: `Application bundle generation complete` for lazy `feedback-public-component`; no TS/build errors in tail.

**GitHub (#67):** `gh issue comment` failed with *Resource not accessible by personal access token* — human should post the PASS summary and adjust labels per `docs/agent-loop.md`.
