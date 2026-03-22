# Reservation Overbooking Detection – Proposal

This document describes the current database and behaviour for tables (seated, reserved) and reservations, and proposes changes to detect and prevent overbooking. **No code changes yet** – implementation will follow in a separate step.

---

## 1. Current state

### 1.1 Database

**`reservation`** (from migration `20260313000000_add_reservation_table.sql`):

| Column             | Type    | Notes |
|--------------------|---------|--------|
| id                 | SERIAL  | PK |
| tenant_id          | INTEGER | FK tenant |
| customer_name      | VARCHAR(255) | |
| customer_phone     | VARCHAR(64)  | |
| customer_email     | VARCHAR(255) | nullable (added later) |
| reservation_date   | DATE    | |
| reservation_time   | TIME    | |
| party_size         | INTEGER | |
| status             | VARCHAR(20) | default `'booked'` → booked \| seated \| finished \| cancelled \| no_show |
| table_id           | INTEGER | nullable FK to `table`, set when staff **seat** the reservation |
| token              | VARCHAR(64) | unique, for public view/cancel |
| created_at, updated_at | TIMESTAMPTZ | |

Indexes: `tenant_id`, `(tenant_id, reservation_date)`, `(tenant_id, status)`, `table_id`, unique `token`.

**`table`** (from floor/canvas migration and seeds):

- `id`, `tenant_id`, `name`, `token`, `floor_id`, canvas fields, **`seat_count`** (default 4), waiter, PIN, `is_active`, `active_order_id`, etc.

**Important:** Reservations are created **without** `table_id`. `table_id` is set only when staff call “seat” (assign table at arrival). So at booking time we have (date, time, party_size) but no table.

### 1.2 How “tables seated” and “tables reserved” are derived

**Table status** (backend `GET /tables/with-status`):

- **Occupied:** table has `is_active` (staff activated ordering / guests in session), **or** an active order (status in `pending`, `preparing`, `ready`, `partially_delivered`), **or** a reservation with `table_id = table.id` and `status = 'seated'`.
- **Reserved:** else if there is **any** reservation with `table_id = table.id`, `status = 'booked'`, and `reservation_date >= today`. So “reserved” = table is linked to an upcoming/current booked reservation (in practice this only happens if we ever set `table_id` before seating, e.g. pre-assign at booking; today table is only set at seat time).
- **Available:** otherwise.

So “tables seated” = tables that are **occupied** because of a seated reservation or an active order. “Tables reserved” = tables that have a **booked** reservation with that `table_id` and date ≥ today.

### 1.3 Where overbooking can happen

1. **By time slot (capacity)**  
   Staff (and in theory public) can create many reservations for the **same** (date, time) with no check against:
   - Total seats (sum of `table.seat_count` per tenant, or per floor).
   - Number of tables (e.g. 20 reservations at 19:00 but only 10 tables).
   So we can overbook **guests per slot** even though each table is at most one party when we seat.

2. **By table (when table is pre-assigned)**  
   Today we don’t pre-assign tables at booking; we only assign at “seat”. If we later allow setting `table_id` at create/update:
   - We must ensure the same table is not double-booked for **overlapping** date+time (or time windows). Current `seat_reservation` checks “no other booked reservation with this table_id” but **does not** filter by `reservation_date` (and has no concept of duration). So we’d need date/time-scoped checks and possibly a notion of “slot duration” or “turn time”.

3. **“Next available” is one booking per 15‑min slot**  
   Public `GET /reservations/next-available` returns the first 15‑minute slot that has **no** reservation (booked or seated). So we allow only **one** reservation per slot for public flow. That avoids slot overbooking in that flow but:
   - Underuses capacity (e.g. many tables but one reservation per slot).
   - Staff can still create unlimited reservations for any date/time, so overbooking is still possible.

---

## 2. What “overbooking” means for this enhancement

We define overbooking as:

- **Slot overbooking:** For a given (tenant, date, time) — or (tenant, date, time window) — the number of **active** reservations (e.g. booked + seated) leads to:
  - more **guests** than total available seats, and/or
  - more **parties** than available tables.

“Active” here means status in `booked`, `seated` (exclude `cancelled`, `no_show`, `finished`).

So the enhancement is: **detect** and **prevent** slot overbooking by comparing, per slot, (a) total party size and (b) number of parties vs (a) total seats and (b) number of tables.

---

## 3. Implementation scope

What we will implement is defined below. Anything not listed here is out of scope for this enhancement.

### 3.1 In scope

**Database**

- No schema changes. Use existing `reservation` (date, time, party_size, status) and `table` (seat_count). Capacity = sum of `table.seat_count` per tenant; table count = count of tables per tenant.

**Backend**

1. **Capacity and demand**
   - **Total seats / tables:** sum of `table.seat_count` and count of tables for the tenant. For **today** (tenant timezone), capacity is reduced to tables that are **not** in active service: `is_active`, an in-progress order (`pending` … `partially_delivered`), or a **seated** reservation on that table. Future dates use full physical capacity.
   - **Demand per slot:** for (tenant, date, time), sum `party_size` and count reservations with status in (`booked`, `seated`). Slot = exact (date, time) match.
   - **Opening hours:** create/update reject closed days, times before open, times outside split lunch/dinner windows (`hasBreak`), and times within 1 hour of closing (when opening hours are configured).

2. **Overbooking report**
   - New endpoint `GET /reservations/overbooking-report` (or equivalent): query params `date` (required), `time_from`, `time_to` (optional). Response: for each slot on that date, `reservation_time`, `total_seats`, `total_tables`, `reserved_guests`, `reserved_parties`, `over_seats` (boolean), `over_tables` (boolean).

3. **Prevention on create/update**
   - On `POST /reservations` and `PUT /reservations/{id}`: before saving, check that after the create/update the slot (reservation_date, reservation_time) is not over capacity (reserved_guests ≤ total_seats and reserved_parties ≤ total_tables). If over, return 400 with a clear message (e.g. “Slot is over capacity: X guests / Y tables for this time”). Exclude the current reservation when updating.

4. **Next-available (public)**
   - Change `GET /reservations/next-available` so it returns the first slot where adding one more reservation would not exceed capacity: `reserved_guests + requested_party_size ≤ total_seats` and `reserved_parties + 1 ≤ total_tables`. Use a default or query param for party size if needed. Slots remain 15-minute steps within opening hours.

5. **Seat modal – upcoming reservations with no table**
   - When the seat flow needs data (e.g. existing `GET /tables/with-status` or a dedicated call), also return a count of other reservations for the same tenant and same date with status `booked`, `table_id` null, and `reservation_time` > now (or ≥ the reservation being seated). Frontend shows in the seat modal: “You have N upcoming reservations today with no table assigned.”

6. **Seat modal – this table has an upcoming reservation**
   - Extend `GET /tables/with-status` so each table includes `upcoming_reservation: { reservation_id, reservation_time, customer_name } | null` when the table is “reserved” (a booked reservation with that `table_id`, same tenant, reservation_date ≥ today, reservation_time > now). In the seat modal, when listing tables (or when the user selects a table), if `upcoming_reservation` is set, show: “Table X has an upcoming reservation at HH:MM (Name). Seat here anyway?” and keep the “Seat” action (staff can confirm). No blocking.

**Frontend**

1. **Reservations list**
   - Use overbooking report (or slot data from list) to show a clear indicator for slots that are overbooked (e.g. over seats or over tables).

2. **Create/Edit reservation**
   - When the user picks (date, time), show remaining capacity for that slot (e.g. “X seats left”, “Y tables left”). When they save, if the backend returns 400 (over capacity), show the error and do not close the form.

3. **Reports**
   - Add an overbooking summary for the selected date range (e.g. count of slots with over_seats or over_tables, or a small table by date).

4. **Seat modal**
   - Show “You have N upcoming reservations today with no table assigned” (from backend count).
   - For each table that has `upcoming_reservation`, show the warning “Table X has an upcoming reservation at HH:MM (Name). Seat here anyway?” and leave the Seat button available.

**Table status (unchanged)**

- **Seated:** table has active order or a reservation with `table_id` and status `seated`.
- **Reserved:** table has a reservation with `table_id`, status `booked`, reservation_date ≥ today. No change to this definition.

### 3.2 Out of scope (not in this enhancement)

- **Schema:** No new columns or tables. No `duration_minutes`, no pre-assign table at booking (no setting `table_id` at create/update). No floor-level capacity (tenant-level only).
- **Time windows / overlap:** Slot is exact (date, time) only; no overlap or “turn time” logic.
- **Blocking seat action:** We do not block seating when a table has an upcoming reservation; we only warn. The existing backend check that blocks seating when another booked reservation already has that table_id stays as is.

---

## 4. Summary

| Area | Current | We will implement |
|------|--------|----------|
| **DB** | reservation (date, time, party_size, status, table_id set only at seat); table (seat_count) | No schema change. |
| **Table status** | Occupied = order or seated reservation; Reserved = booked reservation with table_id, date≥today | Unchanged. |
| **Overbooking** | Not defined; staff can create unlimited reservations per slot | Per (date, time): reserved_guests > total_seats or reserved_parties > total_tables. |
| **Detection** | None | GET /reservations/overbooking-report with per-slot metrics and over_seats / over_tables flags. |
| **Prevention** | None | Validate on create/update; return 400 if slot over capacity. Next-available returns first slot with capacity. |
| **UX** | No capacity info | Overbooking indicators per slot in list; show remaining capacity in create/edit and keep form open on save error; overbooking summary in reports. |
| **Seat modal** | None | (1) Show “You have N upcoming reservations today with no table assigned.” (2) For tables with upcoming_reservation: show “Table X has upcoming reservation at HH:MM (Name). Seat here anyway?” — allow Seat. |

All of the above is in scope. Out of scope: no new columns/tables, no duration/turn time, no pre-assign table at booking, no floor-level capacity, no blocking of the seat action (warn only).
