---
## Closing summary (TOP)

- **What happened:** Follow-up on GitHub **#67** (public feedback fully localized); prior work was archived; this task captured a coder fix for the invalid-tenant error path and full tester re-verification.
- **What was done:** Error branch now uses `errorKind` + `translate` pipe, `app-language-picker`, and layout shell styles so locale can change on `/feedback/0` (and related errors); i18n JSON parity across locales was confirmed.
- **What was tested:** Per instructions §1–4: `/feedback/1` (form, thank-you, BOOK strings, multiple locales via Puppeteer), `/feedback/0` picker + title/error updates, `test:landing-version` **exit 0**, front bundle logs — **overall PASS**.
- **Why closed:** All documented pass/fail criteria met; ready for archive. **GitHub:** close **#67** when product accepts; if automation lacks **Issues: write**, a human should post the closing comment per `docs/agent-loop.md`.
- **Closed at (UTC):** 2026-03-24 02:29
---

# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public feedback URL (e.g. `/feedback/{tenant}` with token) must show **every** part of the form in the user’s selected language. The reporter noted untranslated strings on the live-style URL. Prior implementation and multiple tester **PASS** archives exist under `agents/tasks/done/` (e.g. `CLOSED-20260323-2214-feedback-page-needs-translation.md` and 2026-03-24 close-loop / housekeeping / alignment tasks); issue **#67** is still **open** on GitHub.

## High-level instructions for coder

- Re-verify `/feedback/{tenant}` across supported locales (language picker + direct navigation); confirm `FEEDBACK` (and related) keys in `front/public/i18n/*.json` cover all UI copy, including errors and success states.
- If any gap remains, add or fix keys and bindings only where needed; validate JSON (no syntax regressions like past `de.json` issues).
- Run targeted smoke / Puppeteer if documented for feedback or landing; align with `docs/agent-loop.md` for GitHub handoff when product accepts closure of **#67**.

## Implementation (coder, 2026-03-24)

- Audited `front/public/i18n/*.json`: all locales include the same `FEEDBACK.*` keys as `en.json`; `node` JSON parse check OK for every file.
- **Gap fixed:** The error branch (`invalid_tenant` / `tenant_not_found`) used `translate.instant()` at load time and had **no** language picker, so copy stayed in the language active at navigation time and users could not switch locale on that screen. Replaced with `errorKind` + `translate` pipe in the template, added `app-language-picker` and a small layout shell (`feedback-error-shell` / `feedback-error-bar` in `feedback-public.component.scss`).

## Testing instructions

1. With the stack up (e.g. HAProxy `http://127.0.0.1:4202`), open `/feedback/1`. Use the language picker and confirm form, thank-you (after submit), and **BOOK** strings (address label, Google Maps button) match **Español**, **Deutsch**, and at least two other supported locales.
2. Open `/feedback/0` (or another invalid id). Confirm **language picker** is visible, **title** and **error line** match the selected language; change language on that page and confirm **both** title and error update (not frozen English).
3. Optional: use a non-existent tenant id that passes numeric validation but fails API (if reproducible in your DB) — `FEEDBACK.TENANT_NOT_FOUND` should behave like step 2.
4. **Automated:** `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` (exit 0). **Front build:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` — no TS/NG errors after changes.

---

## Test report

1. **Date/time (UTC)** — Started ~2026-03-24T02:26Z; finished ~2026-03-24T02:32Z. Log window for evidence: `docker compose … logs --tail=80 front` immediately after verification (~02:32Z).

2. **Environment** — `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development`; host Puppeteer (`puppeteer-core` via `NODE_PATH=front/node_modules`) + Chrome at default macOS path.

3. **What was tested** — Per **Testing instructions** §1–4: `/feedback/1` locales (form, BOOK address/maps when present, thank-you after submit), `/feedback/0` error UI + picker updates, automated landing smoke, front build logs.

4. **Results**

   - §1 Form + picker + **Español**, **Deutsch**, **Français**, **Català**, **中文（简体）** for `FEEDBACK.TITLE` / `FEEDBACK.INTRO` on `/feedback/1` — **PASS** (Puppeteer: pill + intro text matched expected substrings per locale).
   - §1 BOOK strings (`.oh-label` / `.book-maps-btn`) in **Deutsch** when tenant exposes address/maps — **PASS** (demo tenant had elements; “Adresse” / Google Maps DE text verified).
   - §1 Thank-you state (`FEEDBACK.THANK_YOU` / detail) after submit, language switch to **Español** — **PASS** (success title contains “Gracias”; detail not English).
   - §2 `/feedback/0`: language picker visible; **en** / **de** / **es** title + error line match translations; both update when changing language (after resetting picker to **en** first to avoid stored locale skew) — **PASS**.
   - §3 Optional `TENANT_NOT_FOUND` — **N/A** (not reproduced; not required for overall pass).
   - §4 `npm run test:landing-version` — **PASS** (`exit_code: 0`, ended 2026-03-24T02:27:27.324Z).
   - §4 Front build — **PASS** (latest tail shows `Application bundle generation complete`; historical TS2339 during an intermediate rebuild appears resolved in the same log window).

5. **Overall:** **PASS** (no failed criteria).

6. **Product owner feedback** — Public feedback and the invalid-tenant screen now follow the language picker consistently, including the error path that previously froze copy. Español, Deutsch, and additional locales were checked on the live form and error page; automated landing smoke still passes. Issue **#67** can be closed from a product perspective once you confirm no further scope (e.g. production deploy).

7. **URLs tested**

   1. `http://127.0.0.1:4202/feedback/1`
   2. `http://127.0.0.1:4202/feedback/0`

8. **Relevant log excerpts**

   ```
   pos-front  | Application bundle generation complete. [0.262 seconds] - 2026-03-24T02:25:55.570Z
   pos-front  | Page reload sent to client(s).
   ```

   Landing script (host): `>>> RESULT: Landing version OK; … exit_code: 0`.
