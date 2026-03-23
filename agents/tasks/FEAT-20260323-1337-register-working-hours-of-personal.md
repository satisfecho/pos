# Register working hours of personal

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/57

## Problem / goal
When staff (“personal”) logs in, the product should record working hours for reporting and payroll. On the logged-in staff’s personal page, provide explicit **start-shift** and **end-shift** actions so shifts are confirmed rather than inferred.

## High-level instructions for coder
- Discover existing staff profile / “personal” area and any schedule or attendance concepts in `docs/` and the codebase; extend or add models and APIs only if nothing fits.
- Design minimal UX: clear buttons, prevent double start/end without rules (e.g. must end before new start, or admin override).
- Persist shift intervals per user/tenant with timestamps suitable for reports; consider timezone and tenant locale.
- Add or extend tests (API and/or e2e) for the happy path and basic edge cases.
