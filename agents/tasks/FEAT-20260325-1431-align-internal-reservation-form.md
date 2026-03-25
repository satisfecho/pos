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
