# Working Plan (Kitchen, Bar, Waiters) – Implementation Plan

This document describes a plan to implement a **working plan** (shift schedule / rota) for kitchen, bar, and waiters: who is scheduled to work on which days and time slots.

---

## 0. Build vs integrate: BetterShift evaluation

**[BetterShift](https://github.com/pantelx/bettershift)** is an open-source, self-hosted shift management app (Next.js 16, React 19, SQLite, Drizzle, Better Auth). We evaluated it for integration.

### Why we recommend building in-house

| Aspect | BetterShift | POS2 need |
|--------|-------------|-----------|
| **Data model** | Shifts belong to **calendars**; a shift is a time slot (title, start/end, color) on a calendar. There is **no `user_id` on a shift** – it’s “this calendar has these blocks” and sharing is at calendar level. | We need **assignments**: “user X works on date Y from 09:00–14:00”. I.e. shifts must reference our **User** (kitchen/bartender/waiter) and be scoped by **tenant**. |
| **Multi-tenancy** | No tenant/organization; model is global users + calendars + shares. | Everything in POS2 is **tenant-scoped** (restaurant); users and data are per-tenant. |
| **User / auth** | Own user table and **Better Auth** (OAuth, OIDC, etc.). | We use **JWT + tenant-scoped users** with roles (owner, admin, kitchen, bartender, waiter). Our users already exist in PostgreSQL. |
| **Stack** | Next.js, React, SQLite, Drizzle. Full standalone app. | Angular frontend, FastAPI backend, PostgreSQL. We need a **page inside our app**, not a second app. |
| **Integration** | Not a library; no “embed in existing app” story. Options: run as separate service (two logins, two UIs, sync users/shifts) or fork and port (replace DB, auth, add tenant_id everywhere). | Single app, single login, one DB; working plan is one feature area. |

### Conclusion

- **Light integration** (e.g. iframe + link): possible but gives two UIs, two auth systems, and no shared notion of “our waiters/kitchen/bar” or tenant. Not a good fit.
- **Deep integration** (fork, add tenant_id, add user_id to shifts, swap auth/DB): effectively a full port and long-term maintenance of their codebase.
- **Building our own** MVP (one `shift` table, CRUD API, one Angular page) is aligned with our stack, tenant and user model, and the scope in §1–2. We can deliver a minimal working plan quickly and extend later (reports, “on shift” filters, export).

**Recommendation: develop the working plan in-house** as described in this document. Use BetterShift only as UI/UX inspiration (e.g. week view, presets) if desired.

---

## 1. Goals

- **Define who works when** – Assign staff (by role: kitchen, bartender, waiter) to date-based slots (e.g. morning, evening, or custom time ranges).
- **Single source of truth** – One place for managers to maintain the weekly/daily rota; visible to staff and usable for reports and optional automation.
- **Reuse existing roles** – Build on `UserRole` (kitchen, bartender, waiter) and tenant-scoped `User`; no new “staff type” beyond role.
- **Keep scope bounded** – No payroll, no clock-in/out, no automatic assignment of orders to “on-shift” staff in the first version. Optional later: filter floor/table waiter lists by “on shift today”.

---

## 2. Scope

### In scope (MVP)

- **Data model**: Shifts (or “schedule entries”) per tenant: date, time range (start/end), user_id, optional label (e.g. “Morning”, “Evening”).
- **Backend**: CRUD API for schedule entries; list by date range; list users by role for pickers.
- **Frontend**: A **Working plan** (or **Schedule** / **Rota**) page where owner/admin can:
  - View a week (or chosen date range) in a simple grid: days × slots or days × list of assignments.
  - Add shift: pick user (filtered by role: kitchen, bartender, waiter), date, start/end time, optional label.
  - Edit/delete a shift.
- **Access**: Owner and admin only (permission: e.g. `SCHEDULE_READ`, `SCHEDULE_WRITE`).
- **i18n**: Translation keys for the new screen and labels (e.g. “Working plan”, “Kitchen”, “Bar”, “Waiters”, “Morning”, “Evening”).

### Out of scope (later)

- Automatic assignment of tables/floors to “on shift” waiters only.
- Clock-in/clock-out and actual hours tracking.
- Payroll or wage calculation.
- Notifications/reminders (“your shift tomorrow”).
- Public view of “who’s working today”.

---

## 3. Data model

### Option A: Single `Shift` (or `ScheduleEntry`) table

- **Shift** (tenant-scoped):
  - `id`, `tenant_id`
  - `user_id` (FK → User; user must belong to tenant and have role in kitchen | bartender | waiter)
  - `date` (date)
  - `start_time` (time)
  - `end_time` (time)
  - `label` (optional string, e.g. "Morning", "Evening")
  - `created_at`, `updated_at`
- Indexes: `(tenant_id, date)`, `(user_id, date)`.
- Role is derived from `User.role`; no need to store role on the shift (consistent with existing user management).

### Option B: Reuse “slots” from opening hours

- We could define named slots per tenant (e.g. “Morning”, “Evening”) from opening hours and then assign users to (date, slot_name). That adds a layer of configuration (slot definitions) and may be overkill for MVP. **Recommendation: Option A** with optional `label` for display only; time range is explicit.

### Validation

- `start_time` < `end_time`.
- User must be in same tenant and have role in `{kitchen, bartender, waiter}`.
- No duplicate (user_id, date, start_time) or overlapping ranges for same user on same day (optional business rule; can be relaxed in v1).

---

## 4. Backend (API)

### Permissions

- Add `SCHEDULE_READ` and `SCHEDULE_WRITE` to `Permission` enum.
- Grant both to `owner` and `admin` in `ROLE_PERMISSIONS` (see `back/app/permissions.py`).

### Endpoints

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| GET | `/schedule` or `/working-plan` | List shifts; query: `from_date`, `to_date` (inclusive), optional `user_id`, optional `role` (filter users by role) | SCHEDULE_READ |
| GET | `/schedule/{id}` | Get one shift | SCHEDULE_READ |
| POST | `/schedule` | Create shift (user_id, date, start_time, end_time, label?) | SCHEDULE_WRITE |
| PUT | `/schedule/{id}` | Update shift | SCHEDULE_WRITE |
| DELETE | `/schedule/{id}` | Delete shift | SCHEDULE_WRITE |

- **List users for picker**: Reuse existing `GET /users` (tenant-scoped); frontend filters by `role` in [kitchen, bartender, waiter]. If needed, add optional query `?role=waiter` to reduce payload.
- **Date params**: ISO date strings `YYYY-MM-DD`; backend parse and filter `Shift` by `date >= from_date` and `date <= to_date`.

### Request/response examples

- **Create**: `POST /schedule` body: `{ "user_id": 3, "date": "2025-03-20", "start_time": "09:00", "end_time": "14:00", "label": "Morning" }`.
- **List**: `GET /schedule?from_date=2025-03-17&to_date=2025-03-23` → array of shifts with `id`, `user_id`, `user_name` (or email), `role`, `date`, `start_time`, `end_time`, `label`.

---

## 5. Frontend

### Route and access

- **Route**: e.g. `/working-plan` or `/schedule` (configurable; “Working plan” in nav).
- **Guard**: `authGuard` + permission guard (SCHEDULE_READ minimum to see the page; SCHEDULE_WRITE to add/edit/delete).

### UI (MVP)

- **Toolbar**: Date range selector (e.g. week picker: “Week of 17 Mar 2025” with prev/next); optional “Today”.
- **Main area**: 
  - **Option 1 – Table**: Rows = days in range, columns = roles (Kitchen, Bar, Waiters) or “Morning”/“Evening”; cells show assigned staff names (and time if needed). Click cell to add/edit.
  - **Option 2 – List**: List of shifts grouped by day; each line: date, time range, label, user name, role. Buttons: Add shift, Edit, Delete.
- **Add/Edit shift modal**: Dropdown for User (filter by role: kitchen, bartender, waiter), date picker, start time, end time, optional label. Validate start < end.
- **Empty state**: “No shifts in this period. Add a shift to build your working plan.”

### Navigation

- Dashboard: add link “Working plan” (owner/admin only).
- Sidebar: same link under Settings or a “Planning” group if you introduce one.

### i18n

- New keys under e.g. `WORKING_PLAN.*`: title, description, add_shift, edit_shift, delete_shift, date_range, morning, evening, kitchen, bar, waiters, no_shifts, user_placeholder, etc. Reuse existing `ROLES.KITCHEN`, `ROLES.BARTENDER`, `ROLES.WAITER` where applicable. Add `NAV.WORKING_PLAN` or `NAV.SCHEDULE`.

---

## 6. Database migration

- Create table `shift` (or `schedule_entry`) with columns above.
- Foreign keys: `tenant_id` → `tenant.id`, `user_id` → `user.id`.
- Indexes: `(tenant_id, date)`, `(user_id, date)`.

---

## 7. Implementation phases

### Phase 1 – Backend

1. Migration: create `shift` table.
2. SQLModel: `Shift` model; Pydantic schemas: `ShiftCreate`, `ShiftUpdate`, `ShiftResponse` (include user name, role for list).
3. Permissions: add `SCHEDULE_READ`, `SCHEDULE_WRITE`; assign to owner and admin.
4. Endpoints: GET list (with date range), GET one, POST, PUT, DELETE. Ensure all filter by `tenant_id` and that selected user belongs to tenant and has role kitchen/bartender/waiter.

### Phase 2 – Frontend

5. Route and guard: `/working-plan`, show only for users with SCHEDULE_READ.
6. Working plan page: date range selector, list or table of shifts, “Add shift” button.
7. Add/Edit modal: user picker (filter by role), date, start/end time, label; call API.
8. Delete: confirm and call DELETE.
9. Dashboard and nav: link to Working plan for owner/admin.
10. i18n: all new keys in `en` (and optionally other locales).

### Phase 3 – Optional enhancements (later)

- Reports: filter “by waiter” / “by role” already exist; optional “only on-shift staff” filter using schedule.
- Tables/Floors: when assigning default waiter or table waiter, optionally restrict dropdown to users on shift today (requires “who is on shift today” API or client-side filter).
- Export: export week as PDF or CSV for printing rota.

---

## 8. Checklist (MVP)

- [ ] Migration: `shift` table with tenant_id, user_id, date, start_time, end_time, label.
- [ ] Models and schemas: Shift, ShiftCreate, ShiftUpdate, ShiftResponse.
- [ ] Permissions: SCHEDULE_READ, SCHEDULE_WRITE for owner and admin.
- [ ] API: GET /schedule (date range), GET /schedule/{id}, POST, PUT, DELETE.
- [ ] Frontend: /working-plan page with date range, list/table of shifts, add/edit/delete.
- [ ] Nav and dashboard: Working plan link (owner/admin).
- [ ] i18n: WORKING_PLAN.* and NAV.WORKING_PLAN.
- [ ] Smoke test: create shift, list by week, edit, delete (manual or Puppeteer).

---

## 9. References

- **Existing roles**: `back/app/models.py` – `UserRole` (kitchen, bartender, waiter).
- **Permissions**: `back/app/permissions.py` – add new permissions and role mapping.
- **Similar feature**: Reservations (date/time, tenant-scoped) – `docs/0010-table-reservation-implementation-plan.md`.
- **Opening hours**: Settings “split shifts” (morning/evening) are for **business hours**, not staff shifts; reuse labels only if desired (e.g. “Morning”/“Evening” in dropdown).
