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
