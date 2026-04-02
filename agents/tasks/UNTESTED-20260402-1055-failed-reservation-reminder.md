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

## Implementation notes (coder)

- **`POST /reservations/{id}/send-reminder`:** If every attempted channel fails (email and/or WhatsApp), the API now returns **503** with a plain-text `detail` explaining missing SMTP vs send failure vs WhatsApp failure (no secrets). **`reminder_24h_sent_at` / `reminder_2h_sent_at` are updated only when at least one channel actually delivers**, so staff can retry after fixing configuration.
- **Reservation reminder heartbeat:** No longer marks reminders as sent when no channel delivered (aligned with manual send).
- **`email_service`:** `smtp_credentials_configured()`, `reminder_send_failure_message()`; unit tests in `back/tests/test_reservation_reminder_email.py`.

## Testing instructions

1. **Backend:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest tests/test_reservation_reminder_email.py -q`
2. **Manual (app on e.g. `http://127.0.0.1:4202`):** Log in as staff → Reservations → pick a **booked** reservation with email → **Send reminder**.  
   - With SMTP configured and working: success toast/alert as before.  
   - With SMTP missing or invalid: expect **503**-driven alert text describing configuration or send failure (not a generic “failed” only).  
   - Confirm a failed send does **not** advance reminder-sent state (retry after fix should still be allowed for automated reminders).
3. Optional smoke: `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` if other changes touched the stack in the same session.
