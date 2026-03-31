# Working plan: reuse staff dropdown for collapsible “Planned vs clocked” + totals; optional Excel export

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/130

## Problem / goal

On the Working plan screen, improve how owners see **planned** (scheduled shifts) vs **clocked** (attendance / net time by UTC day from clock-in), tied to the **existing staff/user dropdown**—no duplicate employee selector unless an explicit “All staff” aggregate mode is required. Keep the page light: wrap the planned-vs-clocked block in a **collapsible/disclosure** (default **collapsed**, e.g. “Show planned vs clocked”; optional persistence of open state). Show **totals** (planned hours, clocked hours, variance—positive when clocked exceeds planned) for quick scanning. Optionally add **Export to Excel** aligned with other reports (columns match visible data or a documented superset). Permissions unchanged; **i18n** for new UI strings. Align date boundaries and timezone display with existing attendance APIs and tenant expectations.

## High-level instructions for coder

- Reuse the Working plan **existing user/staff dropdown** as the single source of selection for planned-vs-clocked metrics for the current page context (date range / week as the screen already defines).
- Implement a **collapsible section** (default collapsed) for the planned-vs-clocked UI; expand/collapse must work reliably.
- Surface **summary totals** for the selected period/worker (and include them in export if Excel is implemented).
- If adding Excel export, follow patterns used elsewhere in the app for exports and column naming.
- Add/update translations for any new user-visible strings.
- Confirm behaviour with existing backend contracts for working plan and attendance; do not weaken authorization.

## Implementation summary (coder)

- **Staff dropdown** (`working-plan-staff-scope`): first option **All staff** (default); single control filters the planned-vs-clocked table and gates **Export Excel** (shifts) to a selected person only.
- **Planned vs clocked**: collapsible block (button **Show/Hide planned vs clocked**), default collapsed; open state in `localStorage` key `workingPlanPvaOpen`.
- **Table**: footer **Totals** for planned, clocked, variance over visible rows; empty state when a single staff is selected but has no rows in range.
- **Backend**: `GET /schedule/planned-vs-actual/export` — Excel with date, staff, planned, clocked, variance + totals row; optional `user_id`; `SCHEDULE_READ` + tenant checks; shared data builder `_schedule_planned_vs_actual_row_dicts`.
- **i18n**: all `front/public/i18n/*.json`; backend column labels in `back/app/schedule_export_i18n.py` (`planned_vs_export_labels`).

## Testing instructions

1. **Stack**: `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (or `./run.sh`); app on HAProxy port (e.g. `http://127.0.0.1:4202`).
2. **Smoke**: `BASE_URL=http://127.0.0.1:4202 npm run test:working-plan --prefix front` (needs staff login with schedule access).
3. **Manual — staff scope**: Open **Working plan**. Confirm dropdown label **Staff**, options **All staff** + named users. With **All staff**, shift **Export Excel** is disabled; planned-vs-clocked section appears when there is any planned/clocked data in the visible range (or when a specific staff is selected).
4. **Manual — disclosure**: Section starts **collapsed**; expand shows hint, **Export comparison (Excel)** (disabled if no data rows), and table with **Totals** row. Collapse/expand; reload page and confirm open state persists if you had left it open.
5. **Manual — filter**: Select one staff member; table shows only that user’s rows; totals match sum of visible rows; empty message if none.
6. **Manual — exports**: With a staff member selected, **Export Excel** downloads shift month file as before. With at least one comparison row, **Export comparison (Excel)** downloads `planned-vs-clocked-<from>-to-<to>.xlsx` with headers + totals; try with **All staff** and with one user filtered.
7. **Backend**: Optional `curl` with Bearer token: `GET /schedule/planned-vs-actual/export?from_date=...&to_date=...` and with `&user_id=<id>`; expect 400 for wrong tenant user id.
8. **i18n**: Switch UI language; verify new strings (staff hint, show/hide, export comparison, empty filtered).

---

## Test report

1. **Date/time (UTC):** 2026-03-31 ~14:35–14:50 (log window aligned with Puppeteer runs and pytest below).
2. **Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch **development**, commit **020334e** (short).
3. **What was tested:** Items 1–2 (stack + smoke), extended Puppeteer checks for staff scope / PVA visibility, backend `pytest` subset matching `schedule` / `planned`; manual browser checklist items 3–6 partially automated; item 7 (curl) not run; item 8 (full i18n sweep) not run.
4. **Results:**
   - **Stack / app up:** **PASS** — `curl` to `/` and `/api/health` returned 200; compose services up.
   - **Smoke `npm run test:working-plan`:** **PASS** — Working plan loads, week + calendar + export controls present (exit 0).
   - **Staff scope (instruction 3):** **PARTIAL PASS** — Label **Staff**, first option **All staff**, 3 options total; **Export Excel** disabled with **All staff**, enabled after selecting a specific user (proves `exportUserId` updates in the template).
   - **Planned vs clocked section when a specific staff is selected (instruction 3):** **FAIL** — After selecting a named user (with no planned/clocked rows in range on this tenant), `[data-testid="working-plan-pva"]` never appeared in the DOM. **Cause:** `showPvaSection` is an Angular `computed()` that reads plain field `this.exportUserId`; signal `computed` does not track non-signal fields, so the section does not re-render when only the dropdown changes. Requirement “section appears … when a specific staff is selected” is not met.
   - **Disclosure / persistence / totals / PVA export (instructions 4–6):** **NOT VERIFIED** — Blocked because PVA block was absent in the staff-selected scenario above; could not exercise toggle, `localStorage`, totals row, or **Export comparison (Excel)** in the UI.
   - **Backend pytest (`-k "schedule or planned"`):** **FAIL** — `tests/test_schedule_export.py::test_export_empty_month_header_only` (expected `max_row == 1`, got 3) and `test_export_xlsx_contains_shift` (expected `max_row == 2`, got 4), consistent with added totals/extra rows in XLSX without updating tests.
   - **Optional curl export + wrong-tenant `user_id` (instruction 7):** **NOT RUN** (no Bearer flow in this pass).
   - **i18n (instruction 8):** **NOT RUN**.
5. **Overall:** **FAIL** — Failed criteria: PVA visibility after staff selection; schedule export unit tests out of sync with workbook shape.
6. **Product owner feedback:** The staff dropdown and shift **Export Excel** gating behave as described, and the automated working-plan smoke test still passes. The planned-vs-clocked block does not show up when you pick a single staff member unless some other signal-driven refresh happens, which breaks the stated UX. Backend export layout changes also need test updates so CI reflects the new rows.
7. **URLs tested:** (1) `http://127.0.0.1:4202/login?tenant=1` (2) `http://127.0.0.1:4202/working-plan` (Puppeteer).
8. **Relevant log excerpts:**
   - Front (compose): `Application bundle generation complete` — no TS/build errors in tail.
   - Pytest: `AssertionError: 3 != 1` (`test_export_empty_month_header_only`), `AssertionError: 4 != 2` (`test_export_xlsx_contains_shift`).
