# Translate e-Mail Password reset

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/97

## Problem / goal

Password-reset emails must be available in all five supported languages. The copy is produced in the backend (see `back/app/email_service.py`); align with the project’s translation approach (e.g. `i18n.json` / locale files used elsewhere).

## High-level instructions for coder

- Audit how password-reset (and related auth) emails are built today in `email_service.py` and which strings are hard-coded.
- Add or extend translation sources so every user-visible string in those emails exists for all five locales; wire the sender to pick the recipient’s language (or a documented fallback) consistently with other mail flows.
- Keep behaviour and security unchanged (same links, expiry, no leakage of account existence beyond current design); add or adjust tests if the repo already covers email templates.
- Smoke any path that triggers the reset email in dev if practical.

## Implementation summary (coder)

- **Strings:** New keys `email_password_reset_*` in `back/app/messages.py` for every backend-supported locale (`language_service.SUPPORTED_LANGUAGES`: en, es, ca, de, fr, zh-CN, hi).
- **Email:** `send_password_reset_email(..., lang=...)` builds subject/HTML/text via `get_message`; dynamic URL still escaped; same link and SMTP behaviour.
- **API:** `POST /password-reset/request` passes the same `lang` as the JSON confirmation (`_get_requested_language`) into the email sender.
- **Frontend:** `ApiService.requestPasswordReset` / `confirmPasswordReset` append `?lang=<LanguageService>` so the email matches the in-app language picker, not only the browser `Accept-Language` default.

## Testing instructions

1. **Backend (required):** From repo root, with dev compose up:
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back pytest /app/tests/test_password_reset.py -q`
   Expect 6 passed (includes locale coverage for all `email_password_reset_*` keys).
2. **Manual email (optional):** Configure SMTP + `PUBLIC_APP_BASE_URL`. Open forgot-password, set UI language (e.g. Deutsch), submit reset for a real user; confirm subject/body are German. Link and expiry unchanged.
3. **Frontend build:** `docker compose ... logs --tail=40 front` — no Angular compile errors after `api.service.ts` change.

---

## Test report

1. **Date/time (UTC):** 2026-03-25T15:33:35Z (report written). **Log window:** ~2026-03-25T15:31Z–15:33Z UTC (compose `front` tail + pytest run).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL` not used (no browser run); branch **development**, commit **8d273c7**.
3. **What was tested:** Items 1 and 3 from **Testing instructions** (required backend pytest; front log check). Item 2 (manual SMTP + forgot-password UI) **skipped** — optional per task.
4. **Results:**
   - **Backend pytest `test_password_reset.py`:** **PASS** — `6 passed in 2.62s` (`docker compose … exec -T back pytest /app/tests/test_password_reset.py -q`).
   - **Manual email (optional):** **N/A** — not executed (no SMTP/live inbox verification in this run).
   - **Frontend build / logs:** **PASS** — last 40 lines of `pos-front` show `Application bundle generation complete` with no `error`, `TS`, or `NG` failure lines.
5. **Overall:** **PASS** (all executed criteria passed).
6. **Product owner feedback:** Password-reset email copy is now covered by automated tests across the supported backend locales, which reduces regression risk when strings change. The optional step—sending a real reset in Deutsch (or another locale) with SMTP enabled—is still the strongest check that the full stack matches user expectations. No browser URLs were exercised in this verification pass.
7. **URLs tested:** **N/A — no browser** (optional manual flow not run).
8. **Relevant log excerpts:**

```text
# pytest (back container)
......                                                                   [100%]
6 passed in 2.62s

# docker compose logs --tail=40 front (excerpt)
pos-front  | Application bundle generation complete. [1.249 seconds] - 2026-03-25T15:31:59.518Z
pos-front  | Application bundle generation complete. [0.299 seconds] - 2026-03-25T15:32:04.593Z
```
