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

## Implementation summary (feature coder)

**Already in place before this task:** Tenant staff attendance is modeled as **`WorkSession`** (UTC `started_at` / `ended_at`, IPs), distinct from the planned **Working plan** `Shift` rows. APIs: `GET/POST /users/me/work-session`, `POST .../start`, `POST .../end`, `GET /users/me/work-sessions`; owner/admin report `GET /reports/work-sessions`. UI: **`/my-shift`** (`MyShiftComponent`) with explicit **Start shift** / **End shift** and 30-day history; nav **`NAV.MY_SHIFT`**. Rules: double start → 400; end with no open session → 400. Tests: **`back/tests/test_work_session.py`**.

**This pass:** Surfaced the same flow on **login home** so staff see attendance immediately: **Dashboard** includes a **My shift** action card (roles that can access `/my-shift`) showing loading state, **clocked in** vs **not clocked in** copy, and link to `/my-shift`. i18n: **`DASHBOARD.MY_SHIFT_*`** in all `public/i18n/*.json`.

## Testing instructions

### What to verify

- Staff user (e.g. waiter, kitchen): after login, **Dashboard** shows **My shift** card with subtitle **Clock in…** or **You are clocked in…** matching `/users/me/work-session`.
- Card navigates to **`/my-shift`**; **Start shift** / **End shift** still work; double-start shows API error message.
- Owner/admin: **Reports** work-sessions table still lists staff rows when date range selected.

### How to test

1. `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back pytest /app/tests/test_work_session.py -q`
2. With stack up: `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` (covers login + `/my-shift` nav).
3. Manual: log in as staff → confirm dashboard card → open **My shift** → clock in/out → refresh dashboard; card text updates.

### Pass / fail

- **Pass:** pytest green; landing smoke green; dashboard card visible for staff roles and reflects open session; no Angular build errors in `docker compose … logs --tail=80 front`.
- **Fail:** 4xx/5xx on work-session endpoints without cause; card missing for roles in `ROUTE_ROLES['/my-shift']`; build errors.
