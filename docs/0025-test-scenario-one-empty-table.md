# 0025 – Test scenario: all tables seated, one empty

This document maps the **Reservations – overbooking detection and seating warnings (0025)** requirements to the situation: **all tables are seated/in use except one empty table**.

## Scenario

- **Venue:** e.g. 10 tables (T01–T10), total seats = 10×4 + 10×2 (demo: T01–T05 = 4 seats, T06–T10 = 2) = 30 seats.
- **State:** For a given slot (e.g. today 19:00), 9 reservations exist with status **seated** (or booked), each assigned to a different table. One table has no reservation → **one empty table**.
- **0025 capacity:** Capacity is **tenant-level** (all tables), not “tables currently free”. So `total_tables = 10`, `total_seats = 30`. Demand for that slot: `reserved_parties = 9`, `reserved_guests = sum(party_size)` of those 9.

## Requirements vs expected behaviour

| Requirement | Expected in this scenario |
|-------------|----------------------------|
| **Capacity = total tables/seats** | `total_tables = 10`, `total_seats = 30` (or your venue’s values). Not “1 table left” by physical occupancy alone – it’s “1 table left” because **reserved_parties = 9** so `tables_left = 10 - 9 = 1`. |
| **Slot capacity (create/edit)** | `GET /reservations/slot-capacity?date=…&time=19:00` returns `tables_left: 1`, `seats_left: total_seats - reserved_guests`. |
| **Overbooking report** | For that slot, `reserved_parties = 9`, `over_tables = false`, `over_seats = false`. Slot is **not** overbooked. |
| **Create 10th reservation (same slot)** | **Allowed.** `reserved_parties + 1 = 10 ≤ total_tables`, and seats check must pass. |
| **Create 11th reservation (same slot)** | **400.** Message like: “Slot is over capacity: … parties for this time (max … tables).” |
| **Overbooked badge (list)** | That slot does **not** show “Overbooked” (only when `over_seats` or `over_tables` is true for that slot). |
| **Next-available (public)** | With `party_size` param: returns first slot where `reserved_guests + party_size ≤ total_seats` and `reserved_parties + 1 ≤ total_tables`. For today 19:00 with 9 parties, adding one more is allowed, so 19:00 can be returned if it’s the next open slot. |
| **Seat modal – “N upcoming with no table”** | Count of other **booked** reservations same date, no `table_id`, time ≥ current (or ≥ reservation being seated). Independent of “all seated”. |
| **Seat modal – “Table X has upcoming reservation”** | Only when a table has a **booked** reservation with that `table_id` and time in the future. In “all seated, one empty”, the empty table has no reservation → no warning. Tables that are seated already have no **upcoming** booked reservation on that table. |

## Summary

- **One empty table** = one table with no reservation (and typically no active order). For the slot, demand = 9 parties → **1 table left**, so one more reservation is allowed and the 11th is rejected.
- Capacity is **by reservation count per slot**, not by “tables currently occupied”. So the system correctly shows 1 table left and prevents overbooking when you try to add an 11th party to that slot.

## How to verify

Run the automated check: `docker compose exec back python -m app.seeds.check_overbooking_0025` (exit 0 = pass). It creates test data if needed, runs two scenarios (one empty table; full slot), asserts, then cleans up. Unittest: `docker compose exec back python -m tests.test_overbooking_0025 -v`.
