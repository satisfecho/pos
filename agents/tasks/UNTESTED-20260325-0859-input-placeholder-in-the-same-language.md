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

