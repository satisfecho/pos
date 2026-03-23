# Waiter cannot see table assignments on staff Tables view

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/65

## Problem / goal

Owner assigns a table to a waiter (e.g. waiter-01), but when that waiter logs in they see **no assignment** on the Tables screen. Expectation: assigned tables are visible (and clearly indicated) for the logged-in waiter role, consistent with how owner/manager sees assignments.

Prior work was verified in archive `agents/tasks/done/2026/03/23/CLOSED-20260323-1357-waiter-table-assignment-not-visible.md`; GitHub **#65** remains **open** — re-queue for feature coder to confirm behaviour end-to-end, edge cases (multi-floor, refresh, permissions), and close the issue when product agrees.

## High-level instructions for coder

- Reproduce as owner: assign tables to a waiter user; log in as that waiter; open **Tables** and confirm whether assignment data loads from API and renders (list + canvas if applicable).
- Trace API contracts for table assignment / waiter scope (`/api/tables`, related user or role fields); ensure waiter role receives assigned-server or equivalent fields and the UI binds them.
- Align with staff permissions docs in `docs/` and `AGENTS.md` if present; add or adjust tests (API or e2e) so waiter visibility does not regress.
- If behaviour is correct in dev, capture steps for the reporter and consider closing **#65** after confirmation; otherwise fix backend filtering, frontend display, or both.

## Implementation notes (coder, 2026-03-23)

- **Gap:** Tiles and Table list already used `canManageTableAssignments()` / read-only labels; **Floor plan** (`tables-canvas.component.ts`) still showed an assignment `<select>` fed by `getWaiters()` → empty for waiters (no `user:read`).
- **Fix:** Same pattern as `tables.component.ts`: `PermissionService` + `canManageTableAssignments()`; load waiters only after auth when `table:write`; properties panel uses read-only block from `assigned_waiter_*` / `effective_waiter_*`; owners keep dropdown + inherited floor-default hint.

---

## Testing instructions

1. **Owner/admin — floor plan:** Log in → **Tables** → **Floor plan** → select a table. Confirm **Assigned waiter** dropdown still works; inherited floor default hint still shows when table has no direct assignee but floor has default.
2. **Waiter — floor plan:** Log in as a waiter → **Floor plan** → tap/click a table. **Assigned waiter** must show **read-only text** (name, “Section default: …”, or Unassigned), **not** an empty `<select>`.
3. **Waiter — Table view / Tiles:** Still no `select.waiter-select-inline`; names match API (regression on prior fix).
4. **Multi-floor:** Switch floors on floor plan and list; assignments still correct per table.
5. **Refresh:** Hard-refresh `/tables` as waiter; assignments still visible.
6. **Automated (optional):** With stack up and waiter credentials in env:
   `BASE_URL=http://127.0.0.1:4202 WAITER_LOGIN_EMAIL=… WAITER_LOGIN_PASSWORD=… npm run test:tables-waiter-assignment --prefix front`  
   (exits 0 with skip message if `WAITER_*` unset).
7. **Regression:** `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` passes.

**Product / GitHub:** If all pass, comment on **#65** and close when product agrees.
