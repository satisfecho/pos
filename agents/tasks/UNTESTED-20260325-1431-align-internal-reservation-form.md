# Align internal reservation form

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/94

## Problem / goal

- The public booking flow shows a week calendar with green/red availability for tables.
- The internal staff flow at `/reservations` still uses separate date and time inputs; it should match the public UX and behavior.
- See `docs/` for reservation/booking behavior if needed (public vs staff flows).

## High-level instructions for coder

- Reuse or mirror the public book-week / slot-selection UX on the internal reservations screen so staff pick date/time the same way customers do.
- Keep API and tenant rules consistent with the public form (slots, party size, validation).
- Add or adjust tests/smoke steps if a Puppeteer script covers reservations.

## Coder notes (2026-03-25)

- Added shared `front/src/app/shared/reservation-week-slot-grid.component.{ts,html,scss}`; public `/book/:id` and staff `/reservations` modal use it.
- Backend `GET /reservations/book-week-slots` accepts optional `exclude_reservation_id` (demand excludes that reservation for edit).
- `ApiService.getReservationBookWeekSlots` passes through `excludeReservationId`.
- Staff modal loads `getPublicTenant` for IANA timezone (same as book page).
- Save: new bookings require an **available** grid slot; edits allow unchanged date/time even if the cell is no longer “available” (e.g. past).
- Test: `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest tests/test_book_week_slots_public.py -q`

## Testing instructions

### What to verify

- Public book page still shows the week grid, party size, and submit validation (slot must be green/available).
- Staff `/reservations` → New opens a modal with the **same** week grid (legend, prev/next week, green/red cells) instead of separate date + time inputs.
- Changing party size refreshes availability; edit flow shows the reservation’s week and current slot; saving after moving to another **available** slot works.
- Backend accepts `exclude_reservation_id` on book-week-slots (no 422).

### How to test

- Stack: `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (HAProxy e.g. `http://127.0.0.1:4202`).
- Backend: `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest tests/test_book_week_slots_public.py -q`
- Frontend build: `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` (no TS/NG errors).
- Smoke: `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` (hits `/reservations` in nav).
- Manual: log in as staff with `reservation:write` → `/reservations` → New → pick a green cell → fill customer → Save; Edit an existing row → change slot → Save.

### Pass/fail criteria

- **Pass:** All of the above succeed; create/edit reservations behave like public booking for slot selection; pytest book-week-slots tests pass (3 tests).
- **Fail:** Grid missing or broken on staff modal; book page regression; save accepts a full/unavailable slot for **new** bookings; pytest failures.
