# Table Reservation – Implementation Plan

This document summarizes findings from open-source reservation systems and proposes a concrete plan for adding table reservation to pos2.

---

## Essential scope

Two user groups are **essential** (in scope for the first release):

1. **Staff** – Create, edit, cancel, and list reservations; seat reservations at tables; finish reservations; see table status (available / reserved / occupied) on the table canvas.
2. **Web end users (customers)** – Reserve a table via the web (date, time, party size, name, phone); view their reservation(s); cancel their reservation. No login required for the minimal flow (identify by phone or booking reference).

Optional for a later phase: logged-in “My reservations,” email/SMS confirmations, opening-hours enforcement.

---

## 1. Reference repos reviewed

| Repo | Stack | Reservation model | Table ↔ reservation | Best for |
|------|--------|-------------------|---------------------|----------|
| **skurshner/restaurant-reservations** (Seatable) | React, Express, Knex, PostgreSQL | date, time, people, first/last name, mobile, **status** (booked → seated → finished) | Table has `reservation_id`; “seat” sets it, “finish” clears it | API shape, status flow |
| **slavyanHristov/restaurant-table-reservation-system** (RTRS) | Vue, Express, Sequelize, MySQL | resDate, resTime, people, **resStatus** (pending\|seated\|missed), customer FK | Table belongs to reservation; seat = assign table; free = clear | Seat/free flow, validations |
| **ewradcliffe/restaurant-booking-system** | Django, PostgreSQL | name, date, time, guests, email, booked_by (user) | No table assignment (out of scope) | CRUD, auth, past-date validation |
| **jossansik/Portfolio-project4-restaurant-booking** | Django, Heroku Postgres | Table, Reservation, Menu; date/time/guests; staff confirm | Tables + capacity; one active reservation per user; availability by date + guests | Availability, capacity, one-booking-per-user |
| **pjborowiecki/SEAT-FRENZY** | Next.js 14, Drizzle, PlanetScale | Full booking + venue listing | Multi-tenant, booking management | Product vision (not schema detail) |
| **natsumi-h/chopeseats** | MERN, Mantine | User, Booking, Restaurant | High-level only in README | — |

---

## 2. Patterns that matter for pos2

### 2.1 Reservation lifecycle (Seatable-style)

- **booked** – Reservation created (date, time, party size, contact). No table required yet.
- **seated** – Staff assigns a table; reservation is “seated” at that table (table holds `reservation_id` or reservation holds `table_id`).
- **finished** – Guest done; table cleared, reservation closed.
- **cancelled** – Reservation cancelled (no table link).

### 2.2 Table state

- **available** – No active order, no reservation assigned (or reservation finished/cancelled).
- **reserved** – Assigned to a reservation that is still **booked** (future or current slot); no order yet.
- **occupied** – Has active order (current pos2 “occupied”) or reservation **seated** here and order may exist.

So “reserved” = table is assigned to an upcoming/current reservation but guests not yet seated (no order). After seating, we already have “occupied” via existing order flow.

### 2.3 Data model (aligned with Seatable + pos2)

- **Reservation** (new): tenant-scoped; date, time, party_size, customer name/phone (and optionally user_id); **status** (booked | seated | finished | cancelled); **table_id** (optional, set when staff “seats” the reservation).
- **Table** (existing): add optional **reservation_id** (or rely only on Reservation.table_id). Either:
  - **Option A** – Table has `reservation_id`: when we seat, set `table.reservation_id` and reservation.status = seated; when we finish, clear `table.reservation_id` and set reservation.status = finished. “Reserved” then means: some reservation with status=booked has this table_id.
  - **Option B** – Only Reservation has `table_id`. Table status “reserved” = exists reservation with table_id = this table and status = booked. No FK on Table. Simpler schema change; table status is derived from reservations.

Recommendation: **Option B** (only `Reservation.table_id`). Table has no new column; “reserved” is computed: “exists reservation where table_id = table.id and status = 'booked' and date/time in relevant window”.

### 2.4 APIs (from references)

- **Reservations**: create, list (by date, by phone, by status), get by id, update, update status (including cancel).
- **Tables**: list (with status: available | reserved | occupied), “seat” (assign reservation to table → set reservation.table_id and status=seated; create or attach order if needed), “finish” (clear table assignment, set reservation to finished).

pos2 already has table activation (PIN, active order). Reservation “seating” can create or attach to the same order flow (activate table + set reservation.table_id and status=seated).

---

## 3. Current pos2 state

- **Table**: id, name, token, floor_id, layout, seat_count, order_pin, is_active, active_order_id, activated_at. No reservation link.
- **Order**: table_id, status, items, payment, etc. No reservation_id.
- **GET /tables/with-status**: returns `available` or `occupied` from presence of active order (pending/preparing/ready). No “reserved”.
- **Frontend**: `CanvasTable.status` is `'available' | 'occupied' | 'reserved'` and i18n has TABLES.RESERVED / TABLE_STATUS.reserved; UI only branches on occupied vs non-occupied (no reserved handling yet).

---

## 4. Proposed implementation plan

### Phase 1 – Backend: Reservation model and CRUD

1. **Migration**
   - Add table `reservation` (tenant_id, customer_name, customer_phone, reservation_date, reservation_time, party_size, status, table_id nullable FK to table, **token** unique nullable for public lookup/cancel, created_at, updated_at).
   - status: enum or string one of: `booked`, `seated`, `finished`, `cancelled`.
   - token: unique string (e.g. UUID), generated on create; used by end users to view/cancel without login.
   - Indexes: tenant_id, (tenant_id, reservation_date), (tenant_id, status), table_id, **token** (unique).

2. **Models (SQLAlchemy/ORM)**
   - `Reservation` with fields above; relationship to `Table` (optional).
   - Pydantic schemas: ReservationCreate, ReservationUpdate, ReservationStatusUpdate, ReservationOut.

3. **Endpoints**
   - `POST /reservations` – create (status=booked); validate date/time not in past. Used by **staff** (authenticated) and **end users** (public endpoint, see Phase 4).
   - `GET /reservations` – list by tenant; query params: date, status, phone (search). **Staff only** (permission RESERVATION_READ).
   - `GET /reservations/{id}` – get one. Staff by id; end users by id + token or phone (see Phase 4).
   - `PUT /reservations/{id}` – update (date, time, party_size, name, phone); only if status=booked. **Staff only** (or end user for own reservation with token).
   - `PUT /reservations/{id}/status` – set status (cancel → cancelled; seat → seated and set table_id). Cancel: staff or end user (with token); seat/finish: staff only.
   - Permissions: RESERVATION_READ, RESERVATION_WRITE for staff; **public** `POST /reservations` (and optionally public get/cancel by token) for end-user booking.

### Phase 2 – Backend: Table status “reserved” and seat/finish

4. **Table status**
   - In `GET /tables/with-status`, compute three states:
     - **occupied**: table has active order (existing logic) OR has a reservation with status=seated and table_id=this table.
     - **reserved**: no active order and exists reservation with table_id=this table and status=booked and reservation_date >= today (and optionally time window).
     - **available**: otherwise.
   - Return `status` as `"available" | "reserved" | "occupied"`.

5. **Seat / finish**
   - `PUT /reservations/{id}/seat` – body: `{ "table_id": number }`. Checks: reservation status=booked; table free (not occupied, not reserved by another); seat_count >= party_size. Set reservation.table_id and reservation.status=seated. Optionally auto-activate table and create order (reuse existing activate flow) so table becomes “occupied”.
   - `PUT /reservations/{id}/finish` (or `POST /reservations/{id}/finish`) – set reservation.status=finished, reservation.table_id=null. If you linked an order to the reservation, you can leave order/table as-is (staff closes table separately) or close table in one go; design choice.

### Phase 3 – Frontend: Tables canvas and reservation list

6. **Tables canvas**
   - Use existing `CanvasTable.status` and i18n. Add styling for `status === 'reserved'` (e.g. distinct color/pattern) and show “Reserved” in the side panel when selected table is reserved.
   - Optionally show reservation summary (date, time, party size, name) in panel.

7. **Reservations list (staff)**
   - New view: list reservations by date (default today); filters status, search by phone/name. Actions: Edit, Cancel, Seat (open table picker), Finish.
   - “Seat” opens modal with list of available tables (capacity >= party_size); on confirm call `PUT /reservations/{id}/seat` with chosen table_id.

8. **Create / edit reservation (staff)**
   - Form: date, time, party size, customer name, phone. Submit → POST or PUT. Validate not in past.

### Phase 4 – End-user web booking (essential)

9. **Public API for customers**
   - **Public** `POST /reservations` – no auth; body: tenant_id or tenant slug, reservation_date, reservation_time, party_size, customer_name, customer_phone (and optionally customer_email). Returns created reservation with **token** (e.g. UUID) for later lookup/cancel. Validate: date/time not in past; rate limiting per IP/phone.
   - **Public** `GET /reservations/by-token?token=xxx` – return one reservation (masked or full) for “view my reservation” and cancel flow. Token is returned on create and optionally in confirmation copy.
   - **Public** `PUT /reservations/{id}/cancel` (or `PUT /reservations/{id}/status` with body `{ "status": "cancelled" }`) – allowed only with valid token (e.g. query param or header) or for the reservation that matches token. Idempotent if already cancelled.

10. **Customer booking page (frontend)**
   - **Booking form**: tenant context (e.g. from URL or tenant selector). Fields: date, time, party size, name, phone (required); optional email. Submit → call public `POST /reservations` → show success + reservation details + “View / Cancel” link (with token in URL or stored in sessionStorage).
   - **View / Cancel reservation**: page or modal that accepts token (from link). GET by token → show date, time, party size, status. Button “Cancel reservation” → confirm → call cancel API → show confirmation.
   - No login required for minimal flow; token is the proof for view/cancel.

11. **Routing and tenant**
   - End-user booking must be reachable in a tenant-aware way (e.g. `/book` with tenant in path or subdomain, or tenant slug). Reuse existing tenant resolution (e.g. from menu/public pages) so the booking form knows which tenant_id to send.

### Phase 5 – Polish and ops

12. **Validation**
    - Opening hours / closed days (optional for v1): reject or warn for out-of-hours or closed days.
    - Max party size per table (seat_count) when seating.
    - No double-booking: when assigning table_id, ensure no other booked reservation has same table_id in overlapping slot; simple version: one “reserved” per table at a time.

13. **Notifications**
    - Optional (later): email/SMS confirmations or reminders.

---

## 5. Minimal schema summary

**New table: `reservation`**

| Column            | Type      | Notes                          |
|-------------------|-----------|--------------------------------|
| id                | serial PK |                                |
| tenant_id         | int FK    | tenant.id                       |
| customer_name     | varchar   |                                |
| customer_phone    | varchar   | for search                     |
| reservation_date  | date      |                                |
| reservation_time  | time      |                                |
| party_size        | int       |                                |
| status            | varchar   | booked, seated, finished, cancelled |
| table_id          | int FK?   | nullable, table.id; set when seated |
| token             | varchar   | unique; for end-user view/cancel without login |
| created_at        | timestamptz |                             |
| updated_at        | timestamptz |                             |

**Existing `table`**  
No schema change if we derive “reserved” from reservations where `table_id = table.id` and `status = 'booked'`.

**Existing `order`**  
Optional: add `reservation_id` nullable FK later to link order to reservation when seated (helps analytics and “finish reservation” flow). Not required for MVP.

---

## 6. References (logic used)

- **skurshner/restaurant-reservations**: reservation status (booked → seated → finished), table.reservation_id for seating, PUT/DELETE on `/tables/:id/seat`, list by date and mobile_number.
- **slavyanHristov/restaurant-table-reservation-system**: reservation (date, time, people, status), table capacity and “seat/free” flow.
- **jossansik/Portfolio-project4-restaurant-booking**: one active reservation per user, availability by date + guests, table capacity checks, staff confirm.
- **ewradcliffe/restaurant-booking-system**: CRUD, auth, past-date validation, no table assignment.

---

## 7. Implementation plan (ordered steps)

### Backend (Phases 1–2)

| Step | Task | Delivered |
|------|------|-----------|
| 1 | Migration: `reservation` table with tenant_id, customer_name, customer_phone, reservation_date, reservation_time, party_size, status, table_id (nullable), token (unique), created_at, updated_at | SQL migration |
| 2 | ORM model `Reservation` + Pydantic schemas (Create, Update, StatusUpdate, Out, PublicCreate, PublicOut) | back/app/models.py + schemas |
| 3 | Staff endpoints: POST/GET/PUT /reservations, GET /reservations/{id}, PUT /reservations/{id}/status (guarded by RESERVATION_READ / RESERVATION_WRITE) | back/app/main.py |
| 4 | GET /tables/with-status: add “reserved” (reservation with table_id and status=booked) and keep “occupied” (active order or seated reservation) | back/app/main.py |
| 5 | PUT /reservations/{id}/seat (body: table_id), PUT or POST /reservations/{id}/finish; validate capacity and availability | back/app/main.py |
| 6 | Public endpoints: POST /reservations (no auth; tenant from body/path; return token), GET /reservations/by-token?token=, PUT /reservations/{id}/cancel (require token) or status=cancelled with token | back/app/main.py |

### Staff frontend (Phase 3)

| Step | Task | Delivered |
|------|------|-----------|
| 7 | Tables canvas: style for status=reserved, show “Reserved” and reservation summary in side panel | front tables-canvas |
| 8 | Reservations list view: by date (default today), filters (status, search by phone/name), actions Edit / Cancel / Seat / Finish | front new view + API calls |
| 9 | Create / Edit reservation form (staff): date, time, party size, name, phone; POST/PUT /reservations | front |
| 10 | Seat modal: list available tables (capacity ≥ party_size), confirm → PUT /reservations/{id}/seat | front |

### End-user frontend (Phase 4 – essential)

| Step | Task | Delivered |
|------|------|-----------|
| 11 | Public booking page: tenant context, form (date, time, party size, name, phone); submit → POST /reservations; success screen with reservation details and token-based “View / Cancel” link | front (public route) |
| 12 | View / Cancel reservation page: input token (from link or manual); GET by token; show reservation; “Cancel” → confirm → cancel API | front (public route) |
| 13 | Routing: tenant-aware URL for booking (e.g. /book or /t/{tenant}/book) reusing existing tenant resolution | front routing + tenant |

### Polish (Phase 5)

| Step | Task | Delivered |
|------|------|-----------|
| 14 | Validation: past date/time on create/update; seat_count ≥ party_size when seating; optional opening hours later | back + front |
| 15 | Optional: link order to reservation (reservation_id on order) when seating; optional notifications later | back |

---

**Summary:** Staff and web end-user reservation are both essential. Backend delivers staff CRUD + seat/finish + table status “reserved,” and public create + token-based view/cancel. Frontend delivers staff list/create/edit/seat/finish and table canvas “reserved,” plus public booking form and view/cancel by token.

---

## 8. Readiness checklist (before implementation)

| Item | Status | Notes |
|------|--------|--------|
| Reservation permissions | **To do** | Add `RESERVATION_READ` and `RESERVATION_WRITE` to `back/app/permissions.py`; assign to owner, admin, and staff (same pattern as TABLE_READ / TABLE_WRITE). |
| Tenant for public booking | **Decided** | Public `POST /reservations` takes `tenant_id` in body. No tenant slug in DB today; optional later (e.g. `/book/{slug}`). |
| Migration naming | **Convention** | Next timestamp, e.g. `back/migrations/20260313000000_add_reservation_table.sql`. |
| Public vs staff create | **Decided** | One `POST /reservations`: with auth → staff (tenant from user); without auth → public (tenant_id required in body). |

**Verdict:** Ready for implementation. Start with Step 1 (migration); add the two permissions when implementing Step 3 (staff endpoints).
