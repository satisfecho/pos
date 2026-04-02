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

---

## Test report

1. **Date/time (UTC) and log window:** 2026-04-02, ~10:55–11:00 UTC; backend access log lines below from `docker logs pos-back` for `POST /reservations/1909/send-reminder` and related requests.

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL` `http://127.0.0.1:4202` (HAProxy); branch `development`, commit `f66dd6c`.

3. **What was tested:** Items 1–2 from **Testing instructions** (pytest; manual/API verification of `POST /reservations/{id}/send-reminder`, 503 messaging, reminder-sent fields). Item 3 optional smoke was attempted.

4. **Results:**
   - **Backend pytest `tests/test_reservation_reminder_email.py`:** **PASS** — `8 passed in 0.34s` (container `back`).
   - **503 + actionable `detail` when SMTP unavailable:** **PASS** — `POST /api/reservations/1909/send-reminder` returned HTTP 503 with body `{"detail":"Email is not configured: add SMTP credentials in Settings (Email) or server configuration."}` (not a generic failure only).
   - **Reminder timestamps not advanced on failed send:** **PASS** — `GET /api/reservations/1909` showed `reminder_24h_sent_at` and `reminder_2h_sent_at` both `null` after the failed send.
   - **Success path (SMTP configured and mail delivered):** **Not exercised** — local stack has no tenant/global SMTP; cannot confirm 200 + toast without configuring mail. **PASS (N/A)** for this environment; contract covered by unit tests and failure-path API check.
   - **Optional `test:landing-version`:** **FAIL** — landing semver `2.0.66` vs `package.json` `2.0.68` (environment/version drift; unrelated to reservation reminder change).

5. **Overall:** **PASS** — Required backend and failure-path behavior match the task; optional landing smoke failed for unrelated version display.

6. **Product owner feedback:** Staff will now see a clear explanation when reminders cannot be sent because email is not configured, instead of an opaque error. Retry after fixing SMTP remains possible because reminder-sent timestamps are not written on failure. Consider aligning the landing footer semver with `package.json` in dev builds to keep the optional smoke test green.

7. **URLs tested:**
   1. `http://127.0.0.1:4202/api/token?tenant_id=1` (POST — login)
   2. `http://127.0.0.1:4202/api/reservations/next-available?tenant_id=1&date=2026-04-10&party_size=2&min_lead_minutes=0` (GET)
   3. `http://127.0.0.1:4202/api/reservations` (POST — create test reservation id 1909)
   4. `http://127.0.0.1:4202/api/reservations/1909/send-reminder` (POST)
   5. `http://127.0.0.1:4202/api/reservations/1909` (GET — verify timestamps)

8. **Relevant log excerpts (last section):**

```
2026-04-02 10:58:25,334 - app.main - WARNING - Reservation confirmation skipped: tenant_id=1 (name=Cobalto) has no SMTP and global SMTP not set. ...
2026-04-02 10:58:28,642 - app.email_service - ERROR - SMTP credentials not configured (tenant or global)
INFO:     172.30.0.3:39104 - "POST /reservations/1909/send-reminder HTTP/1.1" 503 Service Unavailable
```
