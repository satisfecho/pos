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

---

## Test report

**Date/time (UTC):** 2026-03-23 ~15:10–15:20 (verification run). **Log window:** same (~45m slice for `docker compose logs back`).

**Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **BASE_URL** `http://127.0.0.1:4202`; branch **development** @ `16e8a4d`.

**What was tested:** All items from **Testing instructions** above; waiter browser checks used short-lived JWT cookies minted in-container for tenant 1 users (owner id 1, waiter id 2) to avoid storing passwords in the task file — same API auth the app uses.

**Results:**

1. **Owner — floor plan dropdown + inherited hint:** **PASS** (dropdown: `select.panel-select` present with options after selecting a canvas table). **PASS (data-dependent N/A on sample)** for inherited hint — first table selected did not show `.waiter-inherited-panel` (no floor-default-only state in that click path).
2. **Waiter — floor plan read-only:** **FAIL** — navigating to `/tables/canvas` as role **waiter** ends at **`/dashboard`** (`adminGuard` on route allows only `owner`/`admin`; see `front/src/app/app.routes.ts`). The canvas read-only panel cannot be exercised by waiters until the route allows `tableAccessGuard` (or equivalent).
3. **Waiter — Table view / Tiles:** **PASS** — `select.waiter-select-inline` count **0**; **13** tbody rows and **13** `.waiter-readonly-inline` cells on Table view.
4. **Multi-floor:** **PASS** (owner) — **2** floor tabs; second floor selected, table selected, **Assigned waiter** dropdown still present (`hasAssignSelect` true). Waiter floor-plan slice **not applicable** (blocked by guard).
5. **Refresh /tables as waiter:** **PASS** — fresh navigation to `/tables` + Table view after new cookie session; same readonly counts as (3).
6. **Automated `test:tables-waiter-assignment`:** **SKIP** — `WAITER_LOGIN_EMAIL` / `WAITER_LOGIN_PASSWORD` not set in repo `.env` (script exits 0 with skip message per task).
7. **Regression `test:landing-version`:** **PASS** — exit code 0, `>>> RESULT: Landing version OK...` (run ~15:12 UTC).

**Overall:** **FAIL** — failed criterion **2**; root cause: **waiter cannot access `/tables/canvas`** due to **`adminGuard`**, so the floor-plan fix is unreachable for the role under test.

**Product owner feedback:** Table list view for waiters shows read-only assignment labels and no inline assignment dropdowns, and owners still get a working waiter dropdown on the canvas. Waiters are still redirected away from the floor plan entirely, so any canvas-only assignment UX remains irrelevant for them until routing matches staff table access.

**URLs tested:**

1. `http://127.0.0.1:4202/tables/canvas` (owner — stays on canvas)
2. `http://127.0.0.1:4202/tables/canvas` (waiter — redirects to dashboard)
3. `http://127.0.0.1:4202/tables` (waiter — Table view)
4. `http://127.0.0.1:4202/` and staff routes via `test:landing-version` (demo login)

**Relevant log excerpts:**

- **Browser / Puppeteer (structured):** Owner canvas: `hasAssignSelect: true`, `selectOptions: 2`. Waiter canvas: final URL `http://127.0.0.1:4202/dashboard`. Waiter tables: `selectCount: 0`, `rowCount: 13`, `readonlyCount: 13`. Owner second floor: `hasAssignSelect: true`.
- **pos-back (sample):** `GET /users/me HTTP/1.1" 200 OK`, `GET /floors HTTP/1.1" 200 OK`, `GET /tables/with-status` / `GET /tables HTTP/1.1" 200 OK` during the session (no 4xx on these paths in the sampled window).
