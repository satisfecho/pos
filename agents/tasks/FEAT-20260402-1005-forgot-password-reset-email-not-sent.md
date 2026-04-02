# Fix: “Forgot password” does not send the reset email (Login)

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/148

## Problem / goal
Staff and/or provider “Forgot password” flow does not deliver the password-reset email, even when the UI shows a generic success. Expected: a valid registered email receives a transactional message with a reset link that targets the correct public app URL. Rate limiting and non-enumeration (generic success for unknown emails) must remain as designed.

## High-level instructions for coder
- Trace **POST `/password-reset/request`** in `back/app/main.py`: ensure mail is actually sent when configuration allows; verify behavior when **`PUBLIC_APP_BASE_URL`** (or equivalent) is missing — avoid “success” responses that imply mail was sent when it was not.
- Review **`back/app/email_service.py`** (`send_password_reset_email` / `send_email`): global vs tenant SMTP, and failure paths.
- Align **`config.env`** / **`config.env.example`** documentation for SMTP and **`PUBLIC_APP_BASE_URL`** (and deployment notes if operators must set values).
- Check **`front/src/app/auth/forgot-password.component.ts`** only if the client calls the wrong endpoint, omits required params (e.g. tenant, `scope: "provider"` for provider), or hides API errors incorrectly.
- Acceptance: with valid SMTP + public base URL, a known user receives the email and the link opens the reset-password page; document any required env or ops steps.
