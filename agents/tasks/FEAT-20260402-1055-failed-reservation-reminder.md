# Failed to send reservation reminder (Reservations)

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/149

## Problem / goal

On the Reservations screen, using the **Remind** control shows a failure to the user (see issue screenshot). The product should either send the reminder email successfully or show a clear, accurate reason when mail cannot be sent (configuration, DNS/host, authentication), consistent with how other mail flows behave. See **`docs/`** and reservation/email-related notes if present.

## High-level instructions for coder

- Trace the **Remind** action end-to-end: Angular reservations UI → API (`send-reminder` or equivalent) → email service.
- Ensure API responses and UI messaging match reality: avoid reporting success in the UI when the backend could not deliver mail; surface actionable errors where appropriate (e.g. missing tenant/global SMTP, connection/DNS failures) without leaking sensitive details.
- Verify tenant vs global SMTP configuration paths and logging; align error handling with similar flows (e.g. other reservation or auth emails).
- Add or adjust tests/smoke steps as needed after implementation.
