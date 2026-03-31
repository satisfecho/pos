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
