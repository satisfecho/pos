# Advanced scheduling and workforce management (Skello-style)

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/122

## Problem / goal

Evolve the **Working Plan** / scheduling area toward a Skello-like product: labor-focused scheduling with compliance checks, planned-vs-actual comparison against clocked time (including **My Shift** / QR flows where they exist), and exports suitable for payroll. See existing working-plan and work-session docs under `docs/` if present.

## High-level instructions for coder

- **Scheduling core:** Support single, split, and night shifts; each shift carries a **role** (e.g. waiter, chef, barista) and sits on a **high-performance grid** (employees on one axis, time/days on the other).
- **Recurring patterns:** Allow copy/paste of a week (or patterns) into following weeks.
- **Compliance engine:** Validate schedules against configurable rules—weekly/monthly hours vs contract, highlight yearly totals past a critical threshold (e.g. 1800h), enforce minimum rest between shifts, and surface overtime vs legal maxima with clear UI affordances.
- **Planned vs actual:** Compare **planned** hours from this module to **actual** hours from clock-in/out (QR / work sessions); show variances (late start, early end, etc.).
- **UI/UX:** Color-coded shift blocks (lunch, dinner, opening, closing, etc.); mobile-friendly employee schedule view; professional **exports** (monthly/yearly timesheets with hours, overtime, break deductions).
- Respect **tenant scoping**, roles, and audit needs; add tests or smoke where the repo pattern supports it.
