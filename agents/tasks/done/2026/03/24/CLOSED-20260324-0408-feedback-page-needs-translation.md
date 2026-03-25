---
## Closing summary (TOP)

- **What happened:** Issue **#67** (public guest feedback i18n) was verified after coder changes to tab titles, i18n parity, and the public feedback Puppeteer script.
- **What was done:** Coder aligned `FEEDBACK` keys across locales, error-route document titles, and extended `test-feedback-public-i18n.mjs` for token URLs; tester ran automated checks and manual spot-checks on invalid-tenant routes.
- **What was tested:** `npm run test:feedback-public-i18n` and `npm run test:landing-version` both **PASS**; no literal `FEEDBACK.` in UI; language picker and error-specific titles confirmed.
- **Why closed:** Test report **overall PASS**; acceptance criteria met. GitHub comment/label/close on **#67** remains for a human with Issues write access (PAT could not add comments).
- **Closed at (UTC):** 2026-03-24 04:14
---

# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback (`/feedback/{tenant}` with optional token) must be fully localized: every visible string (form, validation, errors, loading, invalid-tenant paths) in the user’s language — no raw `FEEDBACK.*` keys, and API-driven errors should respect locale where applicable (`Accept-Language` / ngx-translate). Reporter example: production-style URL with token.

Prior implementation and multiple **CLOSED** archives under `agents/tasks/done/` document coder/tester work; issue **#67** is still **open** — treat as **final verification** (dev/staging/prod), any **real gaps**, and **GitHub alignment** (comment, labels, close when product accepts). See `docs/agent-loop.md` and `front/public/i18n/`.

## High-level instructions for coder

- Re-verify `/feedback/1` (and tokenized URLs) across locales; confirm document title and DOM have no untranslated keys.
- If gaps appear, fix templates, i18n JSON parity, and backend error messaging for feedback-related endpoints as needed.
- Run documented smoke or Puppeteer scripts for feedback/landing if present; keep `npm run test:landing-version` (or equivalent) green.
- When behaviour matches the issue everywhere tested: hand off for tester and GitHub close per `docs/agent-loop.md` (human may need to comment if automation lacks Issues write).

## Coder notes (2026-03-24)

- Audited `front/public/i18n/*.json`: `FEEDBACK` keys match `en.json` across `de`, `es`, `fr`, `ca`, `zh-CN`, `hi` (no missing keys for the public form).
- **Tab title:** for `invalid_tenant` / `tenant_not_found`, document title now uses `FEEDBACK.INVALID_TENANT` / `FEEDBACK.TENANT_NOT_FOUND` instead of the generic `FEEDBACK.TITLE` (aligns title with error copy when the picker language changes).
- **Puppeteer:** `front/scripts/test-feedback-public-i18n.mjs` now also loads `/feedback/1?token=dummy-token-for-i18n-smoke` and asserts no raw `FEEDBACK.*` in the DOM.
- Public POST `/public/tenants/{id}/guest-feedback` already uses `_get_requested_language` + `get_message` for 404/400 paths; the app sends `Accept-Language` via `accept-language.interceptor.ts`.

---

## Testing instructions

### What to verify

- `/feedback/1` and `/feedback/1?token=…` show no raw i18n keys (`FEEDBACK.*`) in the visible page; language picker switches copy and **document title** for default, Deutsch, Français, Español.
- Error routes: `/feedback/0` (or non-numeric id) and a non-existent tenant id (if available) show translated error text and a tab title that matches the error (not the generic form title).

### How to test

- Stack up: `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (HAProxy e.g. `http://127.0.0.1:4202`).
- From `front/`:  
  `BASE_URL=http://127.0.0.1:4202 npm run test:feedback-public-i18n`  
  `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version`
- Manual spot-check: open `/feedback/1`, switch languages, check form + thank-you path after submit; optional invalid tenant URLs above.

### Pass / fail criteria

- **Pass:** Both npm scripts exit 0; manual checks show no literal `FEEDBACK.` strings in the UI; titles update with language.
- **Fail:** Any `FEEDBACK.` visible in DOM, wrong/missing translations for a supported locale, or regression in landing smoke test.

### GitHub (tester / closer)

- Issue **#67:** after verification, update labels/comments per `docs/agent-loop.md`; close when product accepts.

---

## Test report

1. **Date/time (UTC)** and log window.  
   **2026-03-24 04:11–04:13 UTC.** Log window for evidence: **04:09–04:12** (container timestamps align with HAProxy `24/Mar/2026:04:12:*`).

2. **Environment.**  
   Compose: `docker-compose.yml` + `docker-compose.dev.yml`. **`BASE_URL`:** `http://127.0.0.1:4202` (HAProxy → front). **Branch:** `development` @ `0fe62d6`.

3. **What was tested.**  
   Per “What to verify”: public `/feedback/1` and token URL i18n (en/de/fr/es), document titles on locale switch; landing smoke; invalid-tenant error routes `/feedback/0` and `/feedback/999999` (no raw keys, error-specific titles).

4. **Results.**

   | Criterion | Result | Evidence |
   |-----------|--------|----------|
   | `npm run test:feedback-public-i18n` | **PASS** | Exit 0; console: “Public feedback i18n OK …”; “Token URL path OK”. |
   | `npm run test:landing-version` | **PASS** | Exit 0; “Landing version OK; demo login … sidebar nav OK.” |
   | No literal `FEEDBACK.` in UI (happy + token paths) | **PASS** | Covered by i18n script assertions + spot-check error routes. |
   | Language picker + document titles (de/fr/es) | **PASS** | Script asserts DE/FR/ES body phrases and title substrings (“Wie war”, “Comment”, “Cómo”). |
   | Error routes: copy + title match error (not generic form title) | **PASS** | Spot-check: `/feedback/0` title “Invalid restaurant link.”; `/feedback/999999` title “Restaurant not found.”; no `FEEDBACK.` in `document.body.innerText`. |

5. **Overall:** **PASS.**

6. **Product owner feedback.**  
   Public feedback and the tokenized URL behave as intended for localization: automated checks cover four locales and titles, and invalid-tenant pages show human-readable English error titles without leaking i18n keys. Landing navigation smoke did not regress. **Issue #67** can be closed from a product perspective once someone with Issues write access applies the GitHub comment/label/close steps below.

7. **URLs tested (numbered).**

   1. `http://127.0.0.1:4202/feedback/1` (Puppeteer: `test:feedback-public-i18n`)
   2. `http://127.0.0.1:4202/feedback/1?token=dummy-token-for-i18n-smoke` (same script)
   3. `http://127.0.0.1:4202/feedback/0` (Puppeteer spot-check)
   4. `http://127.0.0.1:4202/feedback/999999` (Puppeteer spot-check)
   5. `http://127.0.0.1:4202/` and staff sidebar targets from `test:landing-version` (/, /dashboard, /my-shift, /staff/orders, /reservations, /guest-feedback, /tables, /kitchen, /bar, /customers, /products, /catalog, /reports, /working-plan, /users, /settings, /inventory/*)

8. **Relevant log excerpts.**

   - **pos-front** (build healthy during window):  
     `Application bundle generation complete. [0.312 seconds] - 2026-03-24T04:09:56.900Z` … lazy chunk `feedback-public-component`.
   - **pos-haproxy** (sample lines **04:12:11**): `GET /i18n/en.json` **200/304**; API `GET /api/users/me` **200** (landing test traffic).

**GitHub automation:** `gh issue comment 67` / label update failed here with `Resource not accessible by personal access token (addComment)`. **Human/closer:** add “Verification passed” comment on **#67**, set labels per `docs/agent-loop.md` (**remove `agent:testing` / `agent:wip`** as appropriate), and **close #67** if accepted.
