# Working plan: planned vs clocked — refresh via HTTP on staff dropdown change only (no polling)

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/131

## Problem / goal

Keep **planned vs clocked** in sync when the owner changes the **existing staff/user dropdown** on Working plan, without requiring a manual **Refresh**, and without hammering the API.

**Expected behaviour**

- Load planned-vs-clocked data with normal REST/HTTP (same style as the rest of Working plan). **Do not** use WebSocket for this block.
- On dropdown change, trigger **one** request for the newly selected user and the current date range (week/month as shown on the page).
- **No** `setInterval`, polling, or fixed-timer patterns (e.g. every second). Refresh only on meaningful events: staff selection change, and any existing page actions that already reload the plan (e.g. week/month navigation) if those should also refresh this block.

**Acceptance criteria**

- Changing the staff user in the Working plan dropdown updates planned vs clocked without clicking Refresh.
- No periodic/polling requests for this feature.
- At most one in-flight request per user change (cancel or ignore stale responses if needed).

Coordinate with related Working plan work (e.g. **#130**) so behaviour stays consistent and the UI does not duplicate controls.

## High-level instructions for coder

- Wire planned-vs-clocked data loading to the **same staff dropdown** used elsewhere on Working plan; on `(selectionChange)` (or equivalent), refetch planned-vs-clocked for the selected user and current `from_date` / `to_date`.
- Use HTTP only for this block; align with existing schedule/attendance APIs and auth.
- Avoid polling: no timers; debounce is unnecessary if the rule is strictly “one request per meaningful change.”
- If week/month navigation already reloads plan data, decide whether the planned-vs-clocked block follows that same reload or only updates on dropdown change—match product expectation in the issue.
- Add or adjust tests/smoke steps for Working plan if the repo has a script for this route.

## Implementation (feature coder)

- **Backend:** `GET /schedule/planned-vs-actual` accepts optional `user_id` (same tenant validation as export). Reuses `_schedule_planned_vs_actual_row_dicts(..., user_id)`.
- **Frontend:** `ApiService.getSchedulePlannedVsActual` passes optional `user_id`. Working plan calls `fetchPlannedVsActual()` after schedule load (week/month navigation, Refresh) and on `(ngModelChange)` of the staff filter select. A monotonic generation counter drops stale HTTP responses when requests overlap.

## Testing instructions

1. **Build:** With Docker dev stack, `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` — no Angular/TS errors after the change.
2. **Smoke:** From `front/`, `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` (or repo root with `--prefix front`).
3. **Manual (owner, schedule:read):** Open **Working plan**; open the planned-vs-clocked section if needed. Note network calls to `/api/schedule/planned-vs-actual` (or proxied path). Change the **staff** dropdown between “All staff” and a specific user — each change should issue **one** new GET (with `user_id` when a user is selected). No repeated timer/polling calls. Week/month navigation or **Refresh** should still reload shifts and planned-vs-clocked for the current range and dropdown selection.
4. **Optional:** `npm run test:working-plan --prefix front` with `LOGIN_EMAIL` / `LOGIN_PASSWORD` for a user that can access Working plan (validates page still loads).

## Test report

1. **Date/time (UTC) and log window**
   - **Tester run:** 2026-03-31T14:51:12Z – ~T15:00Z (smoke + network check).
   - **Front container (historical):** rebuild around **2026-03-31T14:41:07Z** showed transient TS errors during hot reload; **2026-03-31T14:41:09Z** `Application bundle generation complete` (no errors in final tail).
   - **Back container:** not required for this task beyond API responses observed via browser (HTTP 200 on `planned-vs-actual`).

2. **Environment**
   - Compose: `docker-compose.yml` + `docker-compose.dev.yml`.
   - **BASE_URL:** `http://127.0.0.1:4202`.
   - **Git:** branch `development`, commit `c0aae43` (short).

3. **What was tested** (from Testing instructions + acceptance criteria)
   - Angular build health via `front` Docker logs.
   - `npm run test:landing-version` (with login + sidebar nav including `/working-plan`).
   - `npm run test:working-plan` (Working plan week + calendar + export UI).
   - **Manual / network:** headless Puppeteer session counting responses to `GET …/schedule/planned-vs-actual` (non-export) while changing `[data-testid="working-plan-export-worker"]` between “all staff” and a specific user; **4s idle** watch for extra calls.
   - **Static check:** `working-plan.component.ts` has no `setInterval`; planned-vs-actual uses `plannedVsActualFetchGen` to ignore stale responses.

4. **Results**
   - **Build (no Angular/TS errors in current tail):** **PASS** — `docker compose … logs --tail=30 front` ends with successful bundle generation; earlier errors in the same log window were superseded by a green build.
   - **Smoke `test:landing-version`:** **PASS** — exit 0; “Landing version OK; demo login (tenant=1) OK; sidebar nav OK.”
   - **Optional `test:working-plan`:** **PASS** — exit 0; Working plan page, calendar grid, export controls present.
   - **Dropdown → HTTP / no polling / `user_id` when filtered:** **PASS** — observed three GETs: (1) all staff for week range, (2) same range with `user_id=1`, (3) back to all staff; **+0** additional `planned-vs-actual` GETs during **4s** idle after the last change.
   - **At most one in-flight semantics / stale drop:** **PASS** — code uses monotonic generation in `fetchPlannedVsActual()`; backend exposes optional `user_id` on `GET /schedule/planned-vs-actual` with tenant validation.

5. **Overall:** **PASS**

6. **Product owner feedback**
   - Staff filter and planned-vs-clocked stay aligned without Refresh: changing the dropdown triggers a single REST fetch with the correct scope (`user_id` only when a person is selected).
   - No background polling was observed in an idle window after interaction, which matches the “no hammering” goal.

7. **URLs tested** (numbered)
   1. `http://127.0.0.1:4202/`
   2. `http://127.0.0.1:4202/login?tenant=1`
   3. `http://127.0.0.1:4202/dashboard`
   4. Multiple sidebar routes from landing test (including `http://127.0.0.1:4202/working-plan`)
   5. `http://127.0.0.1:4202/working-plan` (direct + working-plan smoke)
   6. Network: `GET /api/schedule/planned-vs-actual?from_date=2026-03-30&to_date=2026-04-05` and same with `&user_id=1` (via HAProxy; paths as seen in DevTools/Puppeteer response URLs).

8. **Relevant log excerpts**
   - **Front (success tail):** `Application bundle generation complete. [0.381 seconds] - 2026-03-31T14:41:09.414Z`
   - **Landing smoke (stdout):** `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.` (exit 0)
   - **Working-plan smoke (stdout):** `>>> RESULT: Working plan smoke test passed (week + calendar view + export UI).`
   - **Network check (stdout):** `planned-vs-actual GETs:` three entries (200); `idle 4s extra= 0`.
