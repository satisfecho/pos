# Reservation reminder

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/74

## Problem / goal
Reservation reminder emails should include a link so guests can **update** the reservation (not only view/cancel), matching the ask in the issue.

See **`docs/0030-reservation-confirmation-email-troubleshooting.md`** (confirmation email, `public_app_base_url`, token links) and **`docs/0024-whatsapp-reminder-notes.md`** (reminder flow: `POST /reservations/{id}/send-reminder`, email content). Align reminder template with whatever public “manage reservation” URL pattern already exists or add one if missing.

## High-level instructions for coder
- Locate the **email body/template** used for reservation **reminders** (staff-triggered send path and any scheduled reminder if present).
- Confirm how **public reservation tokens** work for view/cancel; extend or mirror that for an **update/edit** link if the product supports guest-side changes.
- Ensure the link uses the tenant’s **public base URL** configuration (same rules as confirmation email).
- Add or adjust tests or manual checklist notes so a reminder with email can be verified end-to-end (log line + inbox) without breaking existing confirmation behaviour.
