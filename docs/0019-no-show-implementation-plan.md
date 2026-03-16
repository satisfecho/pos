# No-show feature – Implementation plan and documentation

This document describes the **no-show** feature for reservations: why it exists, what was implemented, and how to implement or extend it (e.g. in a fork or another codebase).

---

## 1. Goals and scope

### Problem

Guests sometimes do not show up for a reservation. If the only outcomes are “booked”, “seated”, “finished”, or “cancelled”, staff either leave the slot as “booked” (blocking the table) or mark it “cancelled” (losing the fact that the guest simply did not show). That distorts metrics and makes it harder to reduce no-shows (e.g. reminders, deposits, or policies).

### Goals

1. **Record no-shows** – A distinct status so “did not show” is not conflated with “cancelled”.
2. **Free the table** – Marking a reservation as no-show must release the table (same as cancel/finish).
3. **Reduce no-shows** – Optional reminder email before the reservation (when the guest has an email).

### Scope (implemented)

- Backend: new status `no_show`, status update clears `table_id`; reminder email endpoint.
- Frontend: filter by no-show, badge and card style, “Mark as no-show” with confirmation, “Send reminder” when email exists.
- i18n: all supported locales (en, de, es, fr, ca, zh-CN, hi).

### Out of scope (optional extensions)

- Scheduled/automatic reminder (e.g. 24h before) – requires a job runner or cron.
- No-show count in reports – aggregate by status.
- View/cancel link in reminder email – requires a configurable app base URL.
- Deposits or penalties – product decision.

---

## 2. What was implemented (summary)

| Layer      | Change |
|-----------|--------|
| **Model** | `ReservationStatus.no_show`; no new columns (status is already string). |
| **API**   | `PUT /reservations/{id}/status` accepts `no_show` and clears `table_id`; `POST /reservations/{id}/send-reminder` (staff, booked only, requires `customer_email`). |
| **Email** | `send_reservation_reminder()` in `email_service.py`: tenant name, date, time, party size; optional `view_url` (not set by default). |
| **Frontend** | Reservations list: status filter “No-show”, card style and badge; for “booked”: “Mark as no-show” (with confirm), “Send reminder” (when email present). |
| **i18n**  | `RESERVATIONS.STATUS_NO_SHOW`, `NO_SHOW`, `NO_SHOW_CONFIRM_*`, `SEND_REMINDER`, `REMINDER_SENT`, `REMINDER_FAILED` in all locales. |

Table availability and “next available slot” logic already consider only `booked` and `seated`; `no_show` is never treated as holding a table.

---

## 3. Implementation plan (step-by-step)

Use this section to re-implement the feature elsewhere or to add similar behaviour (e.g. another status or reminder type).

### 3.1 Backend – Model

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

### 3.2 Backend – Status update handler

**File:** `back/app/main.py` (or wherever `PUT /reservations/{id}/status` is implemented)

In the handler that applies `ReservationStatusUpdate`:

- When `body.status == no_show`: set `reservation.status = no_show` and `reservation.table_id = None` (and update `updated_at`).
- Ensure only staff with `reservation:write` can call this endpoint.

No other reservation endpoints need to treat `no_show` specially: list/filter already work by status string; table “reserved” logic should only consider `booked` (and optionally `seated`) for reservations that hold a table.

### 3.3 Backend – Reminder email

**File:** `back/app/email_service.py`

1. Add a function, e.g. `send_reservation_reminder(to_email, customer_name, reservation_date, reservation_time, party_size, tenant_name, view_url=None, tenant=None)`.
2. Build a short HTML and plain-text body (restaurant name, date, time, party size, “contact us to change or cancel”, and optionally a “view/cancel” link if `view_url` is set).
3. Call `send_email(..., tenant=tenant)` so per-tenant SMTP is used when configured.

**File:** `back/app/main.py`

1. Add `POST /reservations/{reservation_id}/send-reminder`.
2. Resolve the reservation by id and current user’s `tenant_id`; require `reservation:write`.
3. Require `reservation.status == booked` and `reservation.customer_email` non-empty.
4. Load tenant for name and SMTP; call `send_reservation_reminder(...)`.
5. Return e.g. `{"sent": true, "to": email}` or 400/502 with a clear message if email is missing or send fails.

### 3.4 Frontend – API and types

**File:** `front/src/app/services/api.service.ts`

1. Extend `ReservationStatus` type with `'no_show'`.
2. Add a method, e.g. `sendReservationReminder(id: number): Observable<{ sent: boolean; to: string }>` that POSTs to `/reservations/{id}/send-reminder`.

No change to existing `updateReservationStatus(id, status)` is needed; the backend already accepts `no_show`.

### 3.5 Frontend – Reservations UI

**File:** `front/src/app/reservations/reservations.component.ts` (or equivalent)

1. **Filter:** Add an option for status `no_show` in the status dropdown; label from i18n (e.g. `RESERVATIONS.STATUS_NO_SHOW`).
2. **Card styling:** For `reservation.status === 'no_show'`, add a distinct class (e.g. `status-no_show`) and a badge with the same label.
3. **Actions for “booked”:**
   - **Mark as no-show:** Button that opens a confirmation modal; on confirm, call `updateReservationStatus(id, 'no_show')` and refresh list/tables.
   - **Send reminder:** Show only when `reservation.customer_email` is set. Button calls `sendReservationReminder(id)`; show loading state and then success or error (e.g. toast or alert).
4. **State:** Use a signal or flag for “reservation to confirm as no-show” and “sending reminder for id” to avoid double submits.

### 3.6 i18n

**Files:** `front/public/i18n/*.json` (and any other locale files)

Under the reservations section, add keys such as:

- `STATUS_NO_SHOW` – label for the status (e.g. “No-show”, “Nicht erschienen”).
- `NO_SHOW` – button label (e.g. “Mark as no-show”).
- `NO_SHOW_CONFIRM_TITLE` and `NO_SHOW_CONFIRM_MESSAGE` – confirmation modal text.
- `SEND_REMINDER`, `REMINDER_SENT`, `REMINDER_FAILED` – for the reminder action and feedback.

Use the same key names in every locale so the app does not fall back to the key string.

---

## 4. Optional extensions

### 4.1 No-show in reports

In the report that aggregates reservations (e.g. by date range), include a count or breakdown by `status`, and surface `no_show` separately so the business can track no-show rate.

### 4.2 View/cancel link in reminder email

- Add a configurable base URL (e.g. per tenant or in `config.env`) for the public app (e.g. `https://your-domain.com`).
- When sending the reminder, set `view_url = f"{base_url}/reservation?token={reservation.token}"` and pass it to `send_reservation_reminder(..., view_url=view_url)`.
- The email template already supports an optional “view or cancel” block when `view_url` is present.

### 4.3 Scheduled reminders (e.g. 24h before)

- Add a job (cron, Celery, or in-process scheduler) that runs periodically.
- Query reservations with `status == booked`, `reservation_date` = tomorrow (in tenant TZ), and `customer_email` set; optionally filter by “reminder not yet sent” if you add a `reminder_sent_at` column.
- For each, call the same email flow as `POST /reservations/{id}/send-reminder` (or a shared function). Set `reminder_sent_at` to avoid duplicate emails.

### 4.4 No-show policy or deposits

Product/legal territory. Implementation would likely involve: optional deposit on book, refund rules, and possibly storing “no-show count” per customer (e.g. by email/phone) to enforce policies.

---

## 5. Related documentation

| Document | Description |
|---------|-------------|
| [0010-table-reservation-implementation-plan.md](0010-table-reservation-implementation-plan.md) | Reservation model, table status, seat/finish flow. |
| [0011-table-reservation-user-guide.md](0011-table-reservation-user-guide.md) | User-facing behaviour and URLs for staff and public. |
| [0005-email-sending-options.md](0005-email-sending-options.md) | Email configuration (SMTP, tenant vs global). |
| [0018-gmail-setup.md](0018-gmail-setup.md) | Gmail SMTP setup for sending reminder emails. |

---

## 6. Checklist for a new environment

- [ ] Backend: `ReservationStatus.no_show` and status handler clears `table_id`.
- [ ] Backend: `send_reservation_reminder()` and `POST /reservations/{id}/send-reminder`; SMTP configured (tenant or global).
- [ ] Frontend: `ReservationStatus` includes `no_show`; filter, badge, and card style for no-show.
- [ ] Frontend: “Mark as no-show” with confirmation; “Send reminder” when email present.
- [ ] i18n: All new keys added in every supported locale.
- [ ] (Optional) Reports: no-show count or breakdown.
- [ ] (Optional) Reminder email: base URL and view/cancel link.
- [ ] (Optional) Scheduled reminder job.
