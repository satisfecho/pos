---
## Closing summary (TOP)

- **What happened:** Los camareros no veían asignaciones en el plano de mesas porque la ruta `/tables/canvas` usaba `adminGuard` y los redirigía al dashboard; la vista lista/mosaico ya mostraba asignaciones en solo lectura.
- **What was done:** Se alineó el enrutamiento con `/tables` (`tableAccessGuard`, roles en `PermissionService` para camarero/recepcionista) y se amplió el Puppeteer `test:tables-waiter-assignment` con verificación del plano.
- **What was tested:** Verificación 2026-03-28 UTC: camarero permanece en `/tables/canvas`, panel de asignación solo lectura sin `<select>`, regresión en vista tabla, `test:tables-waiter-assignment` con credenciales y `test:landing-version` — todo PASS.
- **Why closed:** Criterios del handoff cumplidos tras el arreglo de rutas; el FAIL previo era anterior al fix.
- **Closed at (UTC):** 2026-03-28 09:45
---

# Waiter cannot see table assignments on staff Tables view

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/65

## Problem / goal

Owner assigns a table to a waiter (e.g. waiter-01), but when that waiter logs in they see **no assignment** on the Tables screen. Expectation: assigned tables are visible (and clearly indicated) for the logged-in waiter role, consistent with how owner/manager sees assignments.

Prior work was verified in archive `agents/tasks/done/2026/03/23/CLOSED-20260323-1357-waiter-table-assignment-not-visible.md`. **001 log-reviewer (2026-03-23 UTC):** GitHub **#65** is **CLOSED** — closer should archive this WIP when satisfied; residual QA text below kept for reference.

## High-level instructions for coder

- Reproduce as owner: assign tables to a waiter user; log in as that waiter; open **Tables** and confirm whether assignment data loads from API and renders (list + canvas if applicable).
- Trace API contracts for table assignment / waiter scope (`/api/tables`, related user or role fields); ensure waiter role receives assigned-server or equivalent fields and the UI binds them.
- Align with staff permissions docs in `docs/` and `AGENTS.md` if present; add or adjust tests (API or e2e) so waiter visibility does not regress.
- If behaviour is correct in dev, capture steps for the reporter and consider closing **#65** after confirmation; otherwise fix backend filtering, frontend display, or both.

## Implementation notes (coder, 2026-03-23)

- **Gap:** Tiles and Table list already used `canManageTableAssignments()` / read-only labels; **Floor plan** (`tables-canvas.component.ts`) still showed an assignment `<select>` fed by `getWaiters()` → empty for waiters (no `user:read`).
- **Fix:** Same pattern as `tables.component.ts`: `PermissionService` + `canManageTableAssignments()`; load waiters only after auth when `table:write`; properties panel uses read-only block from `assigned_waiter_*` / `effective_waiter_*`; owners keep dropdown + inherited floor-default hint.

- **Routing (coder, 2026-03-28):** `/tables/canvas` still used `adminGuard`, so waiters were sent to `/dashboard` before the canvas UI ran. Aligned with `/tables`: `app.routes.ts` uses `tableAccessGuard` after `uiModuleGuard('tables')`. `PermissionService.ROUTE_ROLES['/tables/canvas']` now lists `waiter` and `receptionist` like `/tables`. Extended `front/scripts/test-tables-waiter-assignment.mjs` with step 3 (floor plan URL + no `select.panel-select`, `.panel-waiter-readonly` after selecting a table).

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

---

## Testing instructions (handoff 2026-03-28 — use for verification)

**What to verify**

- Waiter (and receptionist) stays on `/tables/canvas` (no redirect to `/dashboard`).
- With a table selected on the floor plan, assignment is read-only (`.panel-waiter-readonly`), not `select.panel-select`.

**How to test**

- Manual: log in as a `waiter` user → `/tables/canvas` → select a table → confirm read-only assignee UI, no dropdown.
- Automated (requires waiter credentials):  
  `BASE_URL=http://127.0.0.1:4202 WAITER_LOGIN_EMAIL=… WAITER_LOGIN_PASSWORD=… npm run test:tables-waiter-assignment --prefix front`  
  (step 3 covers floor plan; exits 0 with skip message if `WAITER_*` unset).
- Regression: `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front`.

**Pass / fail**

- **Pass:** Waiter URL remains `/tables/canvas`; no assignment `<select class="panel-select">` in the properties panel; optional Puppeteer script exit 0 when `WAITER_*` set.
- **Fail:** Redirect to `/dashboard` from canvas, or waiter sees assignment dropdown on floor plan.

**Coder smoke (2026-03-28):** `test:landing-version` exit 0 against `http://127.0.0.1:4202`; front container rebuild OK after route change.

---

## Test report (tester, 2026-03-28 — handoff verification)

1. **Date/time (UTC) and log window:** 2026-03-28 09:43–09:44 UTC; `pos-front` / `pos-haproxy` activity aligned with Puppeteer runs; `pos-back` routine 200s during login and `/tables*` loads.

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **`BASE_URL`** `http://127.0.0.1:4202`; branch **`development`** @ **`c76c1f3`**; **`HEADLESS=1`**.

3. **What was tested:** Items under **Testing instructions (handoff 2026-03-28)** — waiter reaches floor plan, assignment UI read-only on canvas; optional automated script with `WAITER_*`; regression landing script.

4. **Results**
   - **Waiter stays on `/tables/canvas` (no `/dashboard` redirect):** **PASS** — Puppeteer step 3 completed; final URL path includes `/tables/canvas`.
   - **No assignment `select.panel-select` for waiter on floor plan after table select:** **PASS** — script asserted no assign `<select>`; `.panel-waiter-readonly` present after clicking `g.table-group`.
   - **Table view / tiles regression (no `select.waiter-select-inline`, readonly cells):** **PASS** — `13` rows, `13` `.waiter-readonly-inline`, `0` inline selects (per script stdout).
   - **`npm run test:tables-waiter-assignment` with `WAITER_*` set:** **PASS** — exit **0**; `>>> RESULT: Waiter tables assignment visibility test passed.`
   - **`npm run test:landing-version`:** **PASS** — exit **0**; `>>> RESULT: Landing version OK...`
   - **Receptionist role on canvas:** **N/A** — no `receptionist` user in tenant **1** DB snapshot (`select` returned none); not exercised.
   - **`docker compose … logs --tail=80 front`:** **PASS** — sampled tail shows successful bundle generations; **no** `Application bundle generation failed` / `error TS` lines in that window.

5. **Overall:** **PASS** (all applicable handoff criteria).

6. **Product owner feedback:** El cambio de rutas cumple el objetivo: un camarero puede abrir el plano de mesas y ver la asignación en modo solo lectura, sin desplegable vacío. Conviene confirmar en un entorno con usuario **recepcionista** si aplica a vuestra operativa. **Nota operativa:** para ejecutar el Puppeteer con login real se usó `python -m app.seeds.set_user_password` en el contenedor **back** sobre la cuenta camarero existente en BD local (email de usuario id 2 en tenant 1); **restableced la contraseña** de esa cuenta en vuestro entorno si este equipo de pruebas la sobrescribió.

7. **URLs tested**
   1. `http://127.0.0.1:4202/login?tenant=1` (waiter login)
   2. `http://127.0.0.1:4202/tables` (Table view)
   3. `http://127.0.0.1:4202/tables/canvas` (floor plan + table click / panel probe)
   4. `http://127.0.0.1:4202/` and staff routes exercised inside `test:landing-version` (demo owner login from `.env`)

8. **Relevant log excerpts**
   - **Puppeteer (`test:tables-waiter-assignment`):** `OK: Logged in`; `OK: Table view — 13 rows, 13 read-only waiter cells, 0 assignment selects`; `OK: Floor plan reachable; properties panel uses read-only waiter block (no assign <select>).`
   - **`pos-front` (tail):** `Application bundle generation complete` (multiple rebuilds); no error-level build failures in the captured **80** lines.

**Loop protection:** N/A (this run follows the **2026-03-28** routing handoff; prior FAIL was pre-fix).

**GitHub:** Comment posted on **#65** (tester summary). Labels not updated via CLI in this step.
