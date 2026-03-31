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

## Implementation summary (this iteration)

- **Backend:** `POST /schedule/copy-week` (Mon–Sun week → another week; optional skip if worker already has a shift that day). `GET /schedule/planned-vs-actual` (planned minutes vs net clocked minutes per user per UTC day). `GET /schedule/compliance-summary` (heuristic warnings: weekly planned cap, min rest between consecutive shifts, yearly planned threshold). Helper `work_session_net_duration_minutes` in `work_session_serialization.py`. Model `ShiftWeekCopy`.
- **Frontend:** Week view button “Copy week → next week”; compliance banner when API returns warnings; “Planned vs clocked” table when any row has planned or actual minutes. API client methods added.
- **Tests:** `back/tests/test_schedule_copy_week.py`.
- **Docs:** `docs/0021-working-plan.md` — Skello-style extensions section.

**Not in this iteration (future):** explicit `role` column on shifts (still derived from user role); night/split shift segments in DB; full employee×time grid; payroll-grade timezone rules (planned date vs UTC clock day documented in API/UI hint).

## Testing instructions

1. **Backend:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest tests/test_schedule_copy_week.py -q`
2. **Frontend:** With app on `http://127.0.0.1:4202`, `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:working-plan`
3. **Manual (optional):** Log in as staff with schedule permission → Working plan → Week view → confirm “Copy week → next week” and, if shifts/clock data exist, compliance banner and Planned vs clocked table.
