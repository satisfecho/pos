# Floor plan: decouple payment state from table fill — bottom chip for payment; operational color shows service phase only

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/187
- **187**

## Problem / goal
When payment-pending is shown as a full-table background color, it overrides operational meaning (open order, ready to serve, seated, etc.). Staff need two channels: **service/kitchen phase** via fill color, and **payment/collection** via a small indicator.

- Table surface fill and legend should reflect **operational/service status only** (available, reserved, occupied/seated, open order, ready to serve, etc., per existing rules).
- A **small label/chip at the bottom** of each table shape (SVG) shows payment text: “Payment pending” when payment is pending or bill is requested; “Paid” when applicable; **hidden** when there is no relevant payment state.
- **Backend (`GET /tables/with-status`):** Avoid one `operational_status` that mixes payment with service phases if that currently drives fill. Either split fields (e.g. service-only operational status plus `payment_status`: none | pending | paid, derived from bill/order data) or keep one enum with **clear priority** so fill is service-first and payment only drives the chip. Return what the canvas needs in one response where practical.
- **Frontend (`tables-canvas` + types):** Extend canvas/API types with payment field(s); map fill/stroke/legend from **service-only** operational mapping; add SVG group for payment chip (readable on dark canvas; does not obscure table name). i18n keys e.g. `TABLES.PAYMENT_PENDING`, `TABLES.PAID` (all locales). Default: hide chip when none; if “paid” implies table released and no active order, “Paid” may not need to show — document chosen behavior in comments.
- **Edge cases:** Joined table groups — align with existing group merge rules for operational status. Accessibility: title or aria-label on chip.
- **Tests:** Backend unit tests for `/tables/with-status` combinations; manual checks for small/large shapes, long translations, zoom.

## Out of scope
Redesigning the entire legend palette unless required for contrast with the new chip.

## High-level instructions for coder
- Review issue body and floor-plan docs in `docs/` if present; align with tenant scoping on API changes.
- Implement backend response shape and priority rules so **fill = service pipeline**, **chip = payment**.
- Update Angular types, canvas rendering, and legend; add i18n for all supported locales.
- Add focused backend tests for status combinations; note manual verification steps in the task when ready for testing.
