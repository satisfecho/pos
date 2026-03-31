# Automatic tip detection and allocation (checkout / payments)

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/123

## Problem / goal

When a payment total exceeds the bill (e.g. card charge above menu total), treat the difference as a potential **tip**, let staff confirm or adjust before closing, attribute tips to the right **employee/session**, and keep **revenue vs tips** separable for reporting and compliance. Align with existing orders, payments, and reporting models.

## High-level instructions for coder

- **Detection:** On payment capture (especially card), compare amount paid to bill total; when the amount paid exceeds the bill, compute the difference and surface a clear confirmation step (“assign as tip?”) before finalizing.
- **Attribution:** Link confirmed tips to the waiter/employee tied to the table or POS session per product rules.
- **Reporting:** Ensure daily/Z-style and related reports show revenue vs tips distinctly (tips not rolled into taxable sales as configured by product/accounting rules).
- **Settings:** Add a tenant-level toggle between **manual tip entry** and **automatic difference detection** (or equivalent modes).
- **Workforce exports:** Extend timesheet / working-plan style exports with a **Tips** column so owners can see per-employee tip totals over shift/month/year where data exists.
- Respect **multi-tenant** boundaries and existing payment flows; add tests for critical calculation and reporting paths where practical.
