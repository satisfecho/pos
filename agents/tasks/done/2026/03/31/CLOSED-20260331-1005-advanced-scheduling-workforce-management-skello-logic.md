---
## Closing summary (TOP)

- **What happened:** The tester handed off issue #122 after the Skello-style scheduling iteration (copy week, planned vs clocked, compliance summary) was implemented and verified on the local stack.
- **What was done:** Backend added `POST /schedule/copy-week`, `GET /schedule/planned-vs-actual`, and `GET /schedule/compliance-summary` with supporting helpers and tests; frontend extended the working plan with copy-week, compliance messaging, and planned vs clocked UI; `docs/0021-working-plan.md` documents the extensions.
- **What was tested:** Backend `pytest tests/test_schedule_copy_week.py` (2 passed) and frontend `npm run test:working-plan` against `http://127.0.0.1:4202` — both passed; optional manual checks were not required for closure.
- **Why closed:** All required test criteria in the task’s test report passed (overall PASS).
- **Closed at (UTC):** 2026-03-31 10:59
---

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

---

## Test report

1. **Date/time (UTC):** 2026-03-31T10:45:00Z (run window ~10:44–10:46Z). Log window for excerpts: same window.

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202` (HAProxy); branch **`development`**, commit **`1dba725`**.

3. **What was tested:** Per **Testing instructions** §1–2 (required). Optional manual §3 not run (smoke covered working plan UI including schedule API calls).

4. **Results:**
   - **Backend pytest `tests/test_schedule_copy_week.py`:** **PASS** — `2 passed in 1.74s`.
   - **Frontend `npm run test:working-plan`:** **PASS** — script reported “Working plan smoke test passed (week + calendar view + export UI).”
   - **Optional manual (copy week button, compliance banner, planned vs clocked with real data):** **N/A** (optional; not required for this report).

5. **Overall:** **PASS** (all required criteria).

6. **Product owner feedback:** Automated coverage confirms the schedule copy-week logic and the working-plan UI path (login → working plan → week/calendar navigation → export controls) behave as expected against the local stack. Optional spot-checks of “Copy week → next week” and banner copy can still be done in a staging session if desired.

7. **URLs tested:**
   1. `http://127.0.0.1:4202/dashboard` (post-login)
   2. Working plan route reached via sidebar (exact path as loaded by app during smoke test)

8. **Relevant log excerpts (last section)**

`pos-back` (schedule endpoints returning 200 during working-plan test):

```
INFO: ... "GET /schedule/planned-vs-actual?from_date=2026-03-30&to_date=2026-04-05 HTTP/1.1" 200 OK
INFO: ... "GET /schedule/compliance-summary?from_date=2026-03-30&to_date=2026-04-05 HTTP/1.1" 200 OK
INFO: ... "GET /schedule?from_date=2026-03-01&to_date=2026-03-31 HTTP/1.1" 200 OK
```

`pos-front` (bundle generation successful, no TS/Angular errors in tail):

```
Application bundle generation complete. [0.583 seconds] - 2026-03-31T10:34:23.775Z
```
