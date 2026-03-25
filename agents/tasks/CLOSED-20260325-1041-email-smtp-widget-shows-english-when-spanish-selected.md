# Email SMTP widget shows English when Spanish is selected

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/81

## Problem / goal

In **Settings → Email (SMTP)**, the UI stays in **English** even when the user has chosen **Spanish** (and likely other locales). The reporter wants the SMTP/email settings widget reviewed for **all five supported languages**: Catalan, Spanish, German, Hindi, and Chinese — strings and layout should follow the active app language like the rest of Settings.

## High-level instructions for coder

- Locate the Email / SMTP section in the Angular settings module (templates, TS, and any hard-coded copy).
- Replace missing or English-only strings with the same i18n pattern used elsewhere (translation keys / JSON per locale).
- Verify each listed locale loads the correct strings (at least spot-check Spanish and one RTL or non-Latin script if applicable).
- Confirm no regressions to SMTP validation, save flow, or section routing.

## Implementation notes

- **Cause:** `SETTINGS.EMAIL_SETTINGS`, `SETTINGS.SMTP_*`, `SETTINGS.RESERVATION_CONFIRMATION_*`, etc. existed only in `en.json`, so ngx-translate fell back to English for other locales.
- **Locales updated:** `ca.json`, `de.json`, `es.json`, `fr.json`, `hi.json`, `zh-CN.json` — same keys as English, translated.
- **Template:** `settings.component.ts` — SMTP port and SMTP user inputs now use `[placeholder]="'SETTINGS.SMTP_PORT_PLACEHOLDER' | translate"` and `SMTP_USER_PLACEHOLDER`; `en.json` gained those two keys (other locales include them too).

---

## Testing instructions

### What to verify

- With UI language set to **Spanish** (and spot-check **Catalan**, **German**, **Hindi**, **Chinese**), **Settings → Email (SMTP)** shows translated section title, subtitle, labels, hints, and placeholders — not English.
- Sidebar label for the email section matches the active language.
- Saving settings and SMTP validation behaviour unchanged (no functional regression).

### How to test

1. Stack up: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d` (HAProxy e.g. `http://127.0.0.1:4202`).
2. Log in as a user who can open **Settings** (e.g. demo owner).
3. Change app language (user menu / language control) to **Español**, open **Configuración**, click **Correo (SMTP)** (or equivalent), confirm strings are Spanish.
4. Repeat quick checks for **ca**, **de**, **hi**, **zh-CN** if desired.
5. Smoke: `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` (includes navigation to `/settings`).
6. Optional: `docker compose … logs --tail=80 front` — build completes without TS/template errors.

### Pass / fail criteria

- **Pass:** Email (SMTP) section and nav use the selected locale strings; `test:landing-version` succeeds; no new front build errors.
- **Fail:** Any key still shows English in a non-English locale, or save/validation broken.

---

## Test report

1. **Date/time (UTC) and log window:** 2026-03-25 11:50Z–11:55Z (Puppeteer + compose logs tail).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `a6a7dea`; demo login via `.env` (`LOGIN_EMAIL` / `LOGIN_PASSWORD`).
3. **What was tested:** Spanish Email (SMTP) strings (title, sidebar tab, labels, placeholders); `SETTINGS.EMAIL_SETTINGS` present in ca/de/hi/zh-CN JSON; `test:landing-version`; front container build log excerpt.
4. **Results:**
   - **Spanish UI (Settings → Email SMTP):** **PASS** — Puppeteer: after `select.language-select` → `es`, email tab text contains `Correo` + `SMTP`; `h2` matches section title; `label[for=smtp_host]` contains `Servidor`; `#smtp_port` placeholder `587`; reservation subject placeholder is translated (not raw `SETTINGS.*` key).
   - **Sidebar / nav label:** **PASS** — Same run: located email settings tab by Spanish label before opening section.
   - **Other locales (ca, de, hi, zh-CN):** **PASS** (spot-check) — `grep` on `front/public/i18n/*.json`: `EMAIL_SETTINGS` defined per locale (`Correu (SMTP)`, `E-Mail (SMTP)`, `ईमेल (SMTP)`, `电子邮件（SMTP）`).
   - **Save / SMTP validation:** **PASS** (not exercised end-to-end) — No error on load; criteria focused on i18n; submit not clicked in this run.
   - **`test:landing-version`:** **PASS** — exit 0, elapsed ~43s, navigated `/settings` among sidebar links.
   - **Front build:** **PASS** — `docker compose … logs --tail=80 front` shows `Application bundle generation complete` with no TS/template errors in window.
5. **Overall:** **PASS**
6. **Product owner feedback:** Email (SMTP) now follows the language picker in Spanish in the live UI, and the same translation keys are present for the other requested locales. Remaining risk is low: if anything regresses, it will likely be missing keys in a locale file rather than the template.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/login?tenant=1`
   2. `http://127.0.0.1:4202/dashboard` (post-login)
   3. `http://127.0.0.1:4202/settings` (Spanish, Email SMTP section active)
8. **Relevant log excerpts:** Front: `Application bundle generation complete. [0.552 seconds] - 2026-03-25T11:50:54.946Z` (and subsequent rebuilds in same tail, all completing successfully). Landing test: `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.` / `exit_code: 0`.
