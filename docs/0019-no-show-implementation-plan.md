# No-show feature - Implementation plan and documentation

This document describes the **no-show** feature for reservations: why it exists, what was implemented, and how to implement or extend it (e.g. in a fork or another codebase).

---

## 1. Goals and scope

### Problem

Guests sometimes do not show up for a reservation. If the only outcomes are “booked”, “seated”, “finished”, or “cancelled”, staff either leave the slot as “booked” (blocking the table) or mark it “cancelled” (losing the fact that the guest simply did not show). That distorts metrics and makes it harder to reduce no-shows (e.g. reminders, deposits, or policies).

### Goals

1. **Record no-shows** - A distinct status so “did not show” is not conflated with “cancelled”.
2. **Free the table** - Marking a reservation as no-show must release the table (same as cancel/finish).
3. **Reduce no-shows** - Optional reminder before the reservation via **email** and/or **WhatsApp** (see [0024-whatsapp-reminder-notes.md](0024-whatsapp-reminder-notes.md)).

### Scope (implemented)

- Backend: new status `no_show`, status update clears `table_id`; `POST /reservations/{id}/send-reminder` (email and/or WhatsApp).
- Frontend: filter by no-show, badge and card style, “Mark as no-show” with confirmation, “Send reminder” when email **or** phone is present.
- i18n: all supported locales (en, de, es, fr, ca, zh-CN, hi).

### Out of scope (optional extensions)

- No-show count in reports - aggregate by status (reports already expose some overbooking/no-show signals; extend as needed).
- Deposits or penalties - product decision.

Shipped after the original plan (not re-specified here): scheduled 24h/2h reminder heartbeat; optional view/cancel link in the reminder email when `PUBLIC_APP_BASE_URL` and a reservation `token` are set.

---

## 2. What was implemented (summary)

| Layer      | Change |
|-----------|--------|
| **Model** | `ReservationStatus.no_show`; no new columns (status is already string). |
| **API**   | `PUT /reservations/{id}/status` accepts `no_show` and clears `table_id`; `POST /reservations/{id}/send-reminder` (staff, booked only; requires **at least one** of `customer_email`, or `customer_phone` with WhatsApp/Twilio configured). Returns `email_sent` / `whatsapp_sent`. |
| **Email / WhatsApp** | `send_reservation_reminder()` in `email_service.py`; WhatsApp via `whatsapp_service.py` when Twilio is configured. Optional `view_url` when `PUBLIC_APP_BASE_URL` and reservation `token` are set. |
| **Frontend** | Reservations list: status filter “No-show”, card style and badge; for “booked”: “Mark as no-show” (with confirm), “Send reminder” when email **or** phone is present. |
| **i18n**  | `RESERVATIONS.STATUS_NO_SHOW`, `NO_SHOW`, `NO_SHOW_CONFIRM_*`, `SEND_REMINDER`, `REMINDER_SENT_*`, `REMINDER_FAILED` in all locales. |

Table availability and “next available slot” logic already consider only `booked` and `seated`; `no_show` is never treated as holding a table.

---

## 3. Implementation plan (step-by-step)

Use this section to re-implement the feature elsewhere or to add similar behaviour (e.g. another status or reminder type).

### 3.1 Backend - Model

**File:** `back/app/models.py`

1. Add the new status to the enum:

```python
class ReservationStatus(str, Enum):
    booked = "booked"
    seated = "seated"
    finished = "finished"
    cancelled = "cancelled"
    no_show = "no_show"
```

2. **Database:** If `reservation.status` is a `VARCHAR` (e.g. length 20), no migration is needed. If you use a PostgreSQL enum type, add a migration to add the new value to that enum.

### 3.2 Backend - Status update handler

**File:** `back/app/main.py` (or wherever `PUT /reservations/{id}/status` is implemented)

In the handler that applies `ReservationStatusUpdate`:

- When `body.status == no_show`: set `reservation.status = no_show` and `reservation.table_id = None` (and update `updated_at`).
- Ensure only staff with `reservation:write` can call this endpoint.

No other reservation endpoints need to treat `no_show` specially: list/filter already work by status string; table “reserved” logic should only consider `booked` (and optionally `seated`) for reservations that hold a table.

### 3.3 Backend - Reminder email

**File:** `back/app/email_service.py`

1. Add a function, e.g. `send_reservation_reminder(to_email, customer_name, reservation_date, reservation_time, party_size, tenant_name, view_url=None, tenant=None)`.
2. Build a short HTML and plain-text body (restaurant name, date, time, party size, “contact us to change or cancel”, and optionally a “view/cancel” link if `view_url` is set).
3. Call `send_email(..., tenant=tenant)` so per-tenant SMTP is used when configured.

**File:** `back/app/main.py`

1. Add `POST /reservations/{reservation_id}/send-reminder`.
2. Resolve the reservation by id and current user’s `tenant_id`; require `reservation:write`.
3. Require `reservation.status == booked` and **at least one** sendable channel: non-empty `customer_email`, and/or non-empty `customer_phone` with WhatsApp configured (Twilio). Return **400** only when neither channel can send.
4. Load tenant for name and SMTP; call `send_reservation_reminder(...)` when email is present; send WhatsApp when phone is present and configured (see [0024](0024-whatsapp-reminder-notes.md)).
5. Return e.g. `{"email_sent": bool, "whatsapp_sent": bool, "to_email": …, "to_phone": …}` or 400/503 with a clear message if no channel is available or send fails.

### 3.4 Frontend - API and types

**File:** `front/src/app/services/api.service.ts`

1. Extend `ReservationStatus` type with `'no_show'`.
2. Add a method, e.g. `sendReservationReminder(id: number): Observable<{ sent: boolean; to: string }>` that POSTs to `/reservations/{id}/send-reminder`.

No change to existing `updateReservationStatus(id, status)` is needed; the backend already accepts `no_show`.

### 3.5 Frontend - Reservations UI

**File:** `front/src/app/reservations/reservations.component.ts` (or equivalent)

1. **Filter:** Add an option for status `no_show` in the status dropdown; label from i18n (e.g. `RESERVATIONS.STATUS_NO_SHOW`).
2. **Card styling:** For `reservation.status === 'no_show'`, add a distinct class (e.g. `status-no_show`) and a badge with the same label.
3. **Actions for “booked”:**
   - **Mark as no-show:** Button that opens a confirmation modal; on confirm, call `updateReservationStatus(id, 'no_show')` and refresh list/tables.
   - **Send reminder:** Show when `reservation.customer_email` **or** `reservation.customer_phone` is set. Button calls `sendReservationReminder(id)`; show loading state and then success or error (e.g. toast or alert). Backend chooses email and/or WhatsApp.
4. **State:** Use a signal or flag for “reservation to confirm as no-show” and “sending reminder for id” to avoid double submits.

### 3.6 i18n

**Files:** `front/public/i18n/*.json` (and any other locale files)

Under the reservations section, add keys such as:

- `STATUS_NO_SHOW` - label for the status (e.g. “No-show”, “Nicht erschienen”).
- `NO_SHOW` - button label (e.g. “Mark as no-show”).
- `NO_SHOW_CONFIRM_TITLE` and `NO_SHOW_CONFIRM_MESSAGE` - confirmation modal text.
- `SEND_REMINDER`, `REMINDER_SENT`, `REMINDER_FAILED` - for the reminder action and feedback.

Use the same key names in every locale so the app does not fall back to the key string.

---

## 4. Optional extensions

### 4.1 No-show in reports

In the report that aggregates reservations (e.g. by date range), include a count or breakdown by `status`, and surface `no_show` separately so the business can track no-show rate.

### 4.2 View/cancel link in reminder email

**Shipped:** when `PUBLIC_APP_BASE_URL` is set and the reservation has a `token`, the reminder email includes `…/reservation?token=…`.

### 4.3 Scheduled reminders (e.g. 24h before)

**Shipped** via the reservation reminder heartbeat (tenant settings `reservation_reminder_24h_enabled` / `reservation_reminder_2h_enabled`). Same channel rules as `POST /reservations/{id}/send-reminder` (email and/or WhatsApp).

### 4.4 No-show policy or deposits

Product/legal territory. Implementation would likely involve: optional deposit on book, refund rules, and possibly storing “no-show count” per customer (e.g. by email/phone) to enforce policies.

---

## 5. Related documentation

| Document | Description |
|---------|-------------|
| [0010-table-reservation-implementation-plan.md](0010-table-reservation-implementation-plan.md) | Reservation model, table status, seat/finish flow. |
| [0011-table-reservation-user-guide.md](0011-table-reservation-user-guide.md) | User-facing behaviour and URLs for staff and public. |
| [0005-email-sending-options.md](0005-email-sending-options.md) | Email configuration (SMTP, tenant vs global). |
| [0056-gmail-setup.md](0056-gmail-setup.md) | Gmail SMTP setup for sending reminder emails. |
| [0024-whatsapp-reminder-notes.md](0024-whatsapp-reminder-notes.md) | WhatsApp/Twilio channel for the same send-reminder flow. |

---

## 6. Checklist for a new environment

- [ ] Backend: `ReservationStatus.no_show` and status handler clears `table_id`.
- [ ] Backend: `POST /reservations/{id}/send-reminder` (email and/or WhatsApp); SMTP and/or Twilio configured as needed.
- [ ] Frontend: `ReservationStatus` includes `no_show`; filter, badge, and card style for no-show.
- [ ] Frontend: “Mark as no-show” with confirmation; “Send reminder” when email **or** phone is present.
- [ ] i18n: All new keys added in every supported locale.
- [ ] (Optional) Reports: no-show count or breakdown.
- [ ] (Optional) `PUBLIC_APP_BASE_URL` for view/cancel link in reminder email.
- [ ] (Optional) Enable scheduled 24h/2h reminder settings per tenant.
