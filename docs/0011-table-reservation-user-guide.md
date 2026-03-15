# Table reservation – User guide and URLs

This document describes how table reservations work for **staff** and **end users**, the public URLs, and what has been implemented.

---

## 1. What has been done

### Staff (admin dashboard)

- **Reservations list** (`/reservations`): Filter by date, phone, status; create, edit, cancel, **seat at table**, and finish reservations. Table column shows assigned table name or "—" when not assigned.
- **Tables canvas** (`/tables/canvas`): Table status **Reserved** (amber) when a reservation is assigned; **Available** / **Occupied** as before.
- **Permissions**: `reservation:read` and `reservation:write` for owner, admin, waiter, receptionist.
- **API**: List/create/update reservations; seat (assign table), finish, cancel; reservation responses include `table_name` when `table_id` is set.

### End users (public, no login)

- **Book a table**: Public page at **`/book/:tenantId`**. Form: date, time, party size, name, phone. Submit creates a reservation (status `booked`). Success screen shows a link to view/cancel.
- **View or cancel**: Public page at **`/reservation?token=...`**. Shows reservation details and status; allows cancelling if status is `booked` or `seated`.

### Backend

- **Reservation** model: `tenant_id`, `customer_name`, `customer_phone`, `reservation_date`, `reservation_time`, `party_size`, `status` (booked | seated | finished | cancelled), `table_id` (optional), `token` (unique, for public view/cancel).
- **Table status**: `available` | `reserved` | `occupied` (reserved = assigned to a booked reservation, no order yet).
- **Migrations**: `reservation` table; fix for `reservation_date` / `reservation_time` column types (DATE, TIME).
- **Public API**: `POST /reservations` with `tenant_id` (no auth); `GET /reservations/by-token?token=...`; `PUT /reservations/{id}/cancel?token=...`.

---

## 2. End-user flow: How the customer reserves a table

1. **Get the booking link**  
   The restaurant shares a link that includes the **tenant ID** (e.g. tenant 1):
   - **URL**: `https://your-domain.com/book/1`  
   - Replace `your-domain.com` with your app host (e.g. `localhost:4203` for local, or your production domain).  
   - Replace `1` with the tenant’s ID (same tenant as in the admin).

2. **Open the booking page**  
   The customer opens that URL. They see:
   - Title: “Book a table”
   - Form: Date, Time, Party size, Customer name, Phone
   - Submit button: “Book table”

3. **Submit the form**  
   The customer fills the form and clicks “Book table”. The app sends the data to the API (no login). On success:
   - Message: “Your table has been reserved.”
   - Reservation details (date, time, party size, name)
   - Button/link: “View or cancel my reservation” → goes to the view page with the reservation token.

4. **View or cancel**  
   The view page URL includes the **token** in the query string:
   - **URL**: `https://your-domain.com/reservation?token=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`  
   - The customer can bookmark or save this link to later view status or cancel.
   - On that page they see: date, time, party size, name, phone, status (Booked / Seated / Finished / Cancelled).
   - If status is Booked or Seated, they can click “Cancel” to cancel the reservation.

**Important**: The customer does **not** need an account. They only need:
- The **booking link** (`/book/<tenantId>`) to create a reservation.
- The **view link** (`/reservation?token=...`) to see or cancel it (this link is shown after booking and can be sent by email/SMS by the restaurant if implemented later).

---

## 3. URL reference

| Purpose | URL | Who |
|--------|-----|-----|
| Book a table (public) | `/book/:tenantId` e.g. `/book/1` | End user |
| View / cancel reservation (public) | `/reservation?token=<uuid>` | End user |
| Reservations list (staff) | `/reservations` | Staff (logged in) |
| Tables canvas (staff) | `/tables/canvas` | Staff (admin) |

**Base URL**: Use the same host and port as the rest of the app (e.g. `http://localhost:4203` or `https://your-domain.com`). The booking and view pages are served by the same Angular app and API.

**Tenant ID**: The tenant ID in `/book/1` is the database ID of the tenant (restaurant). Staff can find it in the admin (e.g. from the API or database). Typically the first tenant is `1`.

---

## 4. Testing the end-user flow

- **Book**: Open `http://localhost:4203/book/1` (or your app URL), fill the form, submit. You should see the success screen and the “View or cancel” link.
- **View**: Open the link shown after booking, or `http://localhost:4203/reservation?token=<paste-token>`. You should see the reservation and, if status is booked/seated, the Cancel button.
- **API (no UI)**:  
  - Create: `POST /api/reservations` with body `{ "tenant_id": 1, "customer_name": "...", "customer_phone": "...", "reservation_date": "YYYY-MM-DD", "reservation_time": "HH:MM", "party_size": 2 }` (no auth).  
  - Get by token: `GET /api/reservations/by-token?token=<uuid>`.  
  - Cancel: `PUT /api/reservations/<id>/cancel?token=<uuid>`.

---

## 5. Related files

- **Changelog**: `CHANGELOG.md` (reservation feature and fixes).
- **Implementation plan**: `docs/0010-table-reservation-implementation-plan.md`.
- **Agent instructions**: `AGENTS.md` (Docker, logs, ports).
