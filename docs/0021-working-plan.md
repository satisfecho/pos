# Working plan (shift schedule) - Implementation plan and status

This document describes the **working plan** feature: shift schedule for kitchen, bar, waiters, and other staff. It covers what was planned, what was implemented, and how it works.

---

## 1. Goals and scope

### Problem

Restaurants need to plan who works when. Staff (kitchen, bar, waiters, reception) should see and edit the rota; owners need a single place to manage shifts and to be notified when someone else updates the plan.

### Goals

1. **Shift CRUD** - Create, read, update, delete shifts (user, date, start time, end time, optional label).
2. **Opening-hours alignment** - By default, shift times are limited to the tenant’s opening hours (from Settings).
3. **Personnel requirements** - In Settings → Opening hours, define how many staff per role (bar, waiter, kitchen, receptionist) are needed per day.
4. **Access** - Any user with schedule permission (owner, admin, kitchen, bartender, waiter, receptionist) can view and edit the working plan.
5. **Owner notification** - When a non-owner updates the plan, the owner sees a “*” next to “Working plan” in the sidebar until they open the page.
6. **Flexible times** - Option to use **any hour** (e.g. cleaning before/after opening) and to choose **30 min** or **1 h** time steps.

### Scope (implemented)

- Backend: `Shift` model, CRUD API (`/schedule`), notification flag for owner (`/schedule/notification`), tenant fields `working_plan_updated_at` / `working_plan_owner_seen_at`.
- Frontend: `/working-plan` page (week view, list of shifts, add/edit/delete modal), time step (30 min / 1 h), “Use any hour” checkbox, opening-hours-aligned or full-day time options.
- Settings: Opening hours per day include optional “personnel per shift” (bar, waiter, kitchen, receptionist).
- Guards: `scheduleGuard` allows owner, admin, kitchen, bartender, waiter, receptionist.
- i18n: en, de (and fallback keys).

### Out of scope (optional extensions)

- Recurring shifts or templates - each shift is created/edited individually.
- Conflict checks (overlapping shifts for same user) - not enforced.
- Filter orders or reports “by on-shift staff” - would use schedule data as reference.

### Skello-style extensions (partial, issue #122)

- **Copy week:** `POST /schedule/copy-week` copies all shifts from one Mon-Sun week to another (both week starts must be Mondays). Optional skip when the worker already has any shift on the target day (same behaviour as bulk month).
- **Planned vs actual:** `GET /schedule/planned-vs-actual?from_date=&to_date=` compares planned minutes from shifts to net clocked minutes from closed work sessions (UTC calendar day by `started_at`; planned uses `shift_date`).
- **Compliance (heuristic):** `GET /schedule/compliance-summary` with optional `max_weekly_minutes`, `min_rest_minutes`, `yearly_warn_minutes` returns warnings for weekly planned load, short gaps between consecutive shifts, and yearly planned totals (full calendar years overlapping the query range). Not legal advice.
- **UI:** Working plan page shows “Copy week → next week” (week view), a compliance banner when warnings exist, and a “Planned vs clocked” table when there is data.

---

## 2. What was implemented (summary)

| Layer       | Change |
|------------|--------|
| **Backend** | `Shift` model (tenant_id, user_id, shift_date, start_time, end_time, label). `GET/POST /schedule`, `GET/PUT/DELETE /schedule/{id}`. `GET /schedule/notification` (owner: has updates since last view). Tenant: `working_plan_updated_at`, `working_plan_owner_seen_at`. |
| **Frontend** | `/working-plan`: week navigation, shift list by date, Add shift button. Modal: user, date, time step (30 min / 1 h), “Use any hour”, start/end time, label. Time options: opening-hours range or full day (00:00-23:30 or 00:00-23:00). Edit/delete with confirmation. Sidebar: “Working plan” with “*” when owner has unseen updates. |
| **Settings** | Opening hours: per day, “Personnel per shift” (bar, waiter, kitchen, receptionist). Stored in same `opening_hours` JSON. |
| **Guards / RBAC** | `scheduleGuard`; `ROLE_PERMISSIONS` and `ROUTE_ROLES` for schedule:read/schedule:write and `/working-plan`. |
| **Tests** | Puppeteer smoke test: login (with tenant), navigate to Working plan, assert page and Add shift (see `docs/testing.md`). |

---

## 3. Behaviour details

### Time step (30 min vs 1 h)

- **30 minutes** (default): Start/end dropdowns show slots every 30 minutes (e.g. 09:00, 09:30, 10:00).
- **1 hour**: Slots every hour (09:00, 10:00, 11:00, …). Useful for longer or coarser shifts.

### Use any hour (e.g. cleaning)

- **Off** (default): Time options are derived from the selected day’s opening hours (from tenant settings). Shifts stay within opening times.
- **On**: Time options cover the full day (00:00-23:30 for 30 min step, 00:00-23:00 for 1 h). Allows shifts outside opening hours (e.g. cleaning 05:00-08:00 or 22:00-23:00).
- When **editing** a shift whose times fall outside the day’s opening hours, “Use any hour” is auto-enabled so the existing times remain selectable.

### Owner notification

- On create/update/delete of a shift (by any user), backend sets `tenant.working_plan_updated_at`.
- When the **owner** calls `GET /schedule` (e.g. by opening the working plan page), backend sets `tenant.working_plan_owner_seen_at` to “now”.
- `GET /schedule/notification` returns `has_updates: true` when `working_plan_updated_at` is after `working_plan_owner_seen_at`.
- Sidebar (for owner) calls this endpoint and shows “*” next to “Working plan” when `has_updates` is true.

---

## 4. References

- **Testing:** `docs/testing.md` § 2b - Working plan (Puppeteer; env: `BASE_URL`, `LOGIN_EMAIL`, `LOGIN_PASSWORD`, `TENANT_ID`, `HEADLESS`).
- **API:** `back/app/main.py` - schedule endpoints; `back/app/models.py` - `Shift`, `Tenant` (notification fields).
- **Frontend:** `front/src/app/working-plan/working-plan.component.ts`, `front/src/app/settings/settings.component.ts` (opening hours + personnel), `front/src/app/shared/sidebar.component.ts` (notification “*”).
- **Migrations:** `back/migrations/` - tenant columns for working plan notification; `back/app/seeds/ensure_tenant_owner.py` - ensure a user has owner role for a tenant.
