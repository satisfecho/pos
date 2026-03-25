---
## Closing summary (TOP)
- **What happened:** Spanish register placeholders still shown in English for tenant name/password fields.
- **What was done:** Adjusted the placeholder/i18n wiring so `tenant_name`, `password`, and `password_confirm` render Spanish text when UI language is `es`.
- **What was tested:** Puppeteer verified the `Register` page shows Spanish placeholders and none of the known English placeholder strings remain (PASS).
- **Why closed:** Pass/fail criteria met for all required fields (tester marked PASS).
- **Closed at (UTC):** 2026-03-25 09:26
---

# Input placeholders not in the selected language (Account creation)

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/78

## Problem / goal
When the UI language is set to Spanish, the account creation form shows some input placeholders still in English (instead of Spanish).

## High-level instructions for coder
- Reproduce the placeholder mismatch in local stack with Spanish as the active language/locale.
- Identify which placeholders should be translated and verify whether they come from:
  - i18n keys (expected), or
  - hardcoded strings / fallback placeholders, or
  - browser/user-agent defaults.
- Trace the affected form fields and confirm the placeholder text updates with the active locale (including initial load scenarios).
- Check for SSR/hydration or caching differences if placeholders are pre-rendered before language selection is applied.
- Ensure any shared form components use the same i18n mechanism as the rest of the signup UI.
- Add/adjust automated coverage where possible (e.g. existing i18n/UI tests for auth forms) to prevent regressions.

## Testing instructions
### What to verify
- On `Register` (`/register`), when UI language is Spanish (`es`), the following input placeholders are translated (and not the old hardcoded English values):
  - `Organization Name` / `tenant_name` placeholder
  - `Password` / `password` placeholder
  - `Confirm password` / `password_confirm` placeholder

### How to test
1. Start the local stack (frontend reachable via HAProxy, typically `http://127.0.0.1:4202`).
2. Run the automated UI smoke test:
   - `BASE_URL=http://127.0.0.1:4202 HEADLESS=1 npm run test:register-page --prefix front`
3. (Optional manual check)
   - Open `/register`
   - Switch UI language to Spanish using the language picker
   - Confirm the three placeholders are Spanish.

### Pass/fail criteria
- PASS if the Puppeteer test prints `Placeholders (es)` with Spanish text for all 3 fields and does not report any remaining hardcoded English placeholder strings:
  - `Acme Restaurant`
  - `At least 6 characters`
  - `Repeat password`
- FAIL if any placeholder remains hardcoded English or the page errors.

## Test report
Date/time (UTC) and log window:
- Start: `2026-03-25 09:24:15 UTC`
- End: `2026-03-25 09:24:23 UTC`

Environment:
- Branch: `development`
- Compose: `docker-compose.yml` + `docker-compose.dev.yml`
- `BASE_URL`: `http://127.0.0.1:4202`
- Puppeteer: `HEADLESS=1`
- UI language forced to: `es`

What was tested:
- `Register` (`/register`) renders Spanish placeholders for:
  - `input#tenant`
  - `input#password`
  - `input#password_confirm`
- Placeholders do not contain the known English strings:
  - `Acme Restaurant`, `At least 6 characters`, `Repeat password`

Results:
- `tenant_name` placeholder translated to Spanish and not hardcoded English: PASS
  - Evidence: test printed `tenant: 'Nombre de tu restaurante'`.
- `password` placeholder translated to Spanish and not hardcoded English: PASS
  - Evidence: test printed `password: 'Introduce tu contraseña'`.
- `password_confirm` placeholder translated to Spanish and not hardcoded English: PASS
  - Evidence: test printed `confirm: 'Repite tu contraseña'`.

Overall: PASS

Product owner feedback:
The register page now shows Spanish placeholder text for the organization name and both password fields, without falling back to the old English placeholders. This should reduce confusion for Spanish-speaking users during account creation.

URLs tested:
1. `http://127.0.0.1:4202/register` (loaded twice: English check then Spanish forced via `localStorage`)

Relevant log excerpts (container logs; last window):
```text
pos-back  | INFO:     172.30.0.3:52224 - "GET /tenant/settings HTTP/1.1" 200 OK
pos-back  | INFO:     172.30.0.3:52242 - "GET /tenant/settings HTTP/1.1" 200 OK
pos-back  | INFO:     172.30.0.3:52242 - "GET /tenant/settings HTTP/1.1" 200 OK
pos-back  | INFO:     172.30.0.3:52224 - "GET /tenant/settings HTTP/1.1" 200 OK
pos-haproxy  | 192.168.65.1:30135 [25/Mar/2026:09:24:19.915] http_frontend frontend_backend/front1 0/0/0/3/3 200 1463 - - ---- 2/2/1/1/0 0/0 "GET /register HTTP/1.1"
pos-haproxy  | 192.168.65.1:39607 [25/Mar/2026:09:24:20.989] http_frontend frontend_backend/front1 0/0/0/2/2 200 1463 - - ---- 8/8/2/2/0 0/0 "GET /register HTTP/1.1"
```

