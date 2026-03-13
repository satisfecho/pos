# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Table reservations**
  - Staff: Reservations list with filters (date, phone, status); create, edit, cancel, seat at table, and finish reservations. Permissions `reservation:read` and `reservation:write` for owner, admin, waiter, receptionist.
  - Tables canvas: Table status "Reserved" (amber) when a reservation is assigned; seating and finishing from reservations.
  - Public: Book a table at `/book/:tenantId` (date, time, party size, name, phone); view and cancel at `/reservation?token=...`.
  - API: `POST/GET/PUT /reservations`, seat/finish/cancel and public endpoints; optional auth for create; table status includes `reserved`.
- **Agent / ops**
  - AGENTS.md: Docker status, port detection, and log commands for debugging.
  - Frontend debug script `scripts/debug-reservations.mjs` (Chrome/CDP) to reproduce navigation and capture console output.
  - `.env` support for demo credentials (gitignored); `puppeteer-core` dev dependency for the debug script.

### Fixed

- Reservation create "failed to create": DB columns `reservation_date` and `reservation_time` were `timestamp`; migration updates them to `DATE` and `TIME` to match the API model.
- Reservations route and sidebar: Staff route `/reservations` defined before public `/reservation`; permission-based `reservationAccessGuard`; frontend build fixes (Router import, `minDate()`, `LowerCasePipe` in reservations component).
- Reservation API: invalid date/time in create now return HTTP 400 with a clear message instead of 500; parsing validates length and format.
- Puppeteer test: create/cancel flow uses DOM-set form values and date filter so create succeeds and the new card is visible; cancel confirmation works.
- Admin layout: main content area no longer constrained by `max-width`; Reservations, Products, Orders, etc. use full width beside the sidebar again.
