# Table reservation – User guide and URLs

This document describes how table reservations work for **staff** and **end users**, the public URLs, and what has been implemented.

---

## 1. What has been done

### Staff (admin dashboard)

- **Reservations list** (`/reservations`): Filter by date, phone, status; create, edit, cancel, **seat at table**, and finish reservations. Table column shows assigned table name or "—" when not assigned.
- **Waiting list tab** (`/reservations` → **Waiting list**): View the walk-in queue; filter by phone or status. Actions on active entries (`waiting` / `notified`): **Mark notified**, **Book table** (opens reservation form prefilled with guest details), **Mark seated**, **No show**, and **Cancel**.
- **Guest feedback** (`/guest-feedback`): Review ratings and comments submitted via the public feedback link (when the reservations module is enabled). Includes a **trends** panel (averages, star distribution, daily volume) and **CSV export** — see `docs/0064-guest-feedback-analytics.md`.
- **Tables canvas** (`/tables/canvas`): Table status **Reserved** (amber) when a reservation is assigned; **Available** / **Occupied** as before.
- **Permissions**: `reservation:read` and `reservation:write` for owner, admin, waiter, receptionist.
- **API**: List/create/update reservations; seat (assign table), finish, cancel; reservation responses include `table_name` when `table_id` is set.

### End users (public, no login)

- **Book a table**: Public page at **`/{public_slug}/book`** when the restaurant has a public slug (e.g. `/demo-restaurant-barcelona/book`), or **`/book/:tenantId`** (numeric id still works and redirects to the slug form when set). Form: date, time, party size, name, phone. Submit creates a reservation (status `booked`). Success screen shows a link to view/cancel. When no slot is available, guests can follow **“Join the waiting list”** to **`/waitlist/:tenantId`**.
- **Service labels**: Under **Settings → Opening hours**, staff can set an optional **service label** on each day (continuous hours) or **morning / evening** labels when the day has a break. The public book page and staff reservation form show those labels for **Service** (empty = default “Lunch” / “Dinner” / “Lunch and dinner”). API values stay `lunch` / `dinner` for filtering.
- **Join the waiting list**: Public page at **`/waitlist/:tenantId`**. Form: name, party size, phone (no date/time). Submit adds the guest to the tenant queue (status `waiting`). Also reachable from the book page link above.
- **View or cancel**: Public page at **`/reservation?token=...`**. Shows reservation details and status; allows cancelling if status is `booked` or `seated`.
- **Leave feedback**: Public page at **`/feedback/:tenantId`** (no login). Guests submit a rating and optional comment; staff review entries at **`/guest-feedback`**. Optional `?token=` binds the submission to a reservation. Receipt printers can encode the same URLs (see `docs/0064-guest-feedback-analytics.md`).

### Backend

- **Reservation** model: `tenant_id`, `customer_name`, `customer_phone`, `reservation_date`, `reservation_time`, `party_size`, `status` (booked | seated | finished | cancelled), `table_id` (optional), `token` (unique, for public view/cancel).
- **Table status**: `available` | `reserved` | `occupied` (reserved = assigned to a booked reservation, no order yet).
- **Migrations**: `reservation` table; fix for `reservation_date` / `reservation_time` column types (DATE, TIME).
- **Public API**: `POST /reservations` with `tenant_id` (no auth); `GET /reservations/by-token?token=...`; `PUT /reservations/{id}/cancel?token=...`.
- **Waiting list**: `waiting_list_entry` table (tenant-scoped; no reservation date/time). Statuses: `waiting` → `notified` → `seated` / `cancelled` / `no_show`. Public `POST /public/tenants/{tenant_id}/waiting-list` (rate-limited); staff `GET /waiting-list`, `POST /waiting-list`, `PUT /waiting-list/{id}/status` (same `reservation:read` / `reservation:write` permissions as reservations).

---

## 2. End-user flow: How the customer reserves a table

1. **Get the booking link**  
   The restaurant shares a link that uses the **public slug** when set (Settings → Business profile), or the numeric tenant ID:
   - **Preferred URL**: `https://your-domain.com/demo-restaurant-barcelona/book`  
   - **Legacy URL**: `https://your-domain.com/book/1` (still works; redirects to the slug form when a slug exists)  
   - Replace `your-domain.com` with your app host (e.g. `localhost:4202` for local, or your production domain).  
   - Set the slug under **Settings → Business profile** (same name-city slug as the public menu).

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
- The **booking link** (`/{public_slug}/book` or `/book/<tenantId>`) to create a reservation.
- The **view link** (`/reservation?token=...`) to see or cancel it (this link is shown after booking and can be sent by email/SMS by the restaurant if implemented later).

When a table is not available for a chosen slot, the book page shows **“No table now? Join the waiting list”** linking to the waiting-list form (see section 3).

---

## 3. Waiting list

The waiting list is for **walk-in guests** who want a table **without** picking a date/time slot. It complements timed reservations; staff manage both from **`/reservations`**.

### Guest flow (public, no login)

1. **Get the waiting-list link**  
   Share **`/waitlist/:tenantId`** (same tenant ID as booking), or send guests to **`/{public_slug}/book`** (or `/book/:tenantId`) and have them click **Join the waiting list** when no table is free.
   - **Local example**: `http://127.0.0.1:4202/waitlist/1`
   - **Production example**: `https://www.satisfecho.de/waitlist/1`

2. **Open the form**  
   The guest sees name, party size, and phone (same contact validation as booking). No account required.

3. **Submit**  
   On success the page confirms they are on the waiting list. There is no public token page for waiting-list entries — the restaurant contacts the guest when a table is ready (staff mark entries **notified** in the admin).

### Staff flow

1. Open **`/reservations`** and select the **Waiting list** tab.
2. The queue lists active entries (default filter: `waiting` and `notified`). Filter by phone or status as needed.
3. For each active entry:
   - **Mark notified** — guest has been called or messaged (`waiting` → `notified`).
   - **Book table** — opens the new-reservation modal with name, phone, and party size prefilled; after saving, the entry is marked **seated**.
   - **Mark seated** — guest seated without creating a timed reservation.
   - **No show** / **Cancel** — remove the guest from the active queue.

Staff can also add waiting-list entries manually via the staff API (`POST /waiting-list`). See **`docs/0010-table-reservation-implementation-plan.md`** for API and schema detail.

---

## 4. URL reference

| Purpose | URL | Who |
|--------|-----|-----|
| Book a table (public) | `/{public_slug}/book` (preferred) or `/book/:tenantId` e.g. `/book/1` | End user |
| Join waiting list (public) | `/waitlist/:tenantId` e.g. `/waitlist/1` | End user |
| View / cancel reservation (public) | `/reservation?token=<uuid>` | End user |
| Guest feedback (public) | `/feedback/:tenantId` e.g. `/feedback/1` | End user |
| Reservations + waiting list (staff) | `/reservations` (Reservations / Waiting list tabs) | Staff (logged in) |
| Guest feedback (staff) | `/guest-feedback` | Staff (logged in) |
| Tables canvas (staff) | `/tables/canvas` | Staff (admin) |

**Base URL**: Use the same host and port as the rest of the app (e.g. `http://localhost:4203` or `https://your-domain.com`). The booking and view pages are served by the same Angular app and API.

**Tenant ID / public slug**: Numeric `/book/1` still works. Prefer **`/{public_slug}/book`** from Settings → Business profile (same slug as `/public-menu/{slug}`).

---

## 5. Testing the end-user flow

- **Book**: Open `http://127.0.0.1:4202/book/1` (or `/{public_slug}/book`), fill the form, submit. You should see the success screen and the “View or cancel” link. Numeric `/book/1` should canonicalize to the slug URL when a slug exists.
- **Waiting list link from book**: On the book page, follow **Join the waiting list** → `/waitlist/1`.
- **Slug smoke**: `BASE_URL=http://127.0.0.1:4202 npm run test:public-book-slug --prefix front`.
- **Waiting list form**: Open `http://127.0.0.1:4202/waitlist/1`, submit name, party size, phone → success message.
- **View**: Open the link shown after booking, or `http://127.0.0.1:4202/reservation?token=<paste-token>`. You should see the reservation and, if status is booked/seated, the Cancel button.
- **Staff waiting list**: Log in → `/reservations` → **Waiting list** tab. Test **Mark notified**, **Book table**, **Mark seated**, **Cancel**.
- **Demo seed (tenant 1):** After `reset_demo_data` (or `python -m app.seeds.seed_demo_waiting_list` on an empty queue), tenant 1 has sample waiting/notified rows so the Waitlist tab is not empty on a fresh demo.
- **API (no UI)**:  
  - Create reservation: `POST /api/reservations` with body `{ "tenant_id": 1, "customer_name": "...", "customer_phone": "...", "reservation_date": "YYYY-MM-DD", "reservation_time": "HH:MM", "party_size": 2 }` (no auth).  
  - Join waiting list: `POST /api/public/tenants/1/waiting-list` with body `{ "customer_name": "...", "customer_phone": "...", "party_size": 2 }` (no auth).  
  - Get by token: `GET /api/reservations/by-token?token=<uuid>`.  
  - Cancel reservation: `PUT /api/reservations/<id>/cancel?token=<uuid>`.

---

## 6. Related files

- **Changelog**: `CHANGELOG.md` (reservation feature and fixes).
- **Implementation plan**: `docs/0010-table-reservation-implementation-plan.md` (reservations and waiting-list API/schema).
- **Waiting list migration**: `back/migrations/20260712120000_waiting_list_entry.sql`.
- **Agent instructions**: `AGENTS.md` (Docker, logs, ports).
