# I can't see the button (export excel) in working plan

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/90

## Problem / goal
After changes around `front/src/app/working-plan/working-plan.component.ts` (reference commit `7bcbae7` in the issue), the reporter cannot see the **export to Excel** control or the **worker selection** dropdown on the working plan screen. They need those UI elements visible and usable so they can interact with the feature.

## High-level instructions for coder
- Reproduce on staff working plan with a role/tenant where the feature should apply; confirm whether controls are hidden by `*ngIf`/permissions, viewport/CSS, or routing.
- Trace template and component state for the export button and worker dropdown; align visibility with product intent (who should see them, which data must be loaded first).
- If the issue is permission or empty data, surface a clear empty/disabled state instead of silent omission.
- Verify after fix with the working plan flow and any related docs under `docs/` if reservations/staff scheduling are documented there.

## Implementation notes (coder)
- **Root cause:** `getUsersForSchedule()` called `GET /users`, which requires `user:read`. Roles with working-plan access (waiter, kitchen, bartender, receptionist) have `schedule:read` but not `user:read`, so the request returned 403, the client cleared the user list, and the template hid the export row entirely (`@if (scheduleUsers().length)`).
- **Fix:** New `GET /schedule/plan-users` (requires `schedule:read` only) returns tenant users whose role may appear on the plan (same set as Excel export). Frontend `getUsersForSchedule()` now uses this endpoint.
- **UX:** Export label, dropdown, and Excel button are always shown; when there are no schedulable users the controls are disabled and a short i18n hint explains how to fix it.

## Testing instructions
1. **Backend:** From repo root with dev compose up:  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python -m pytest tests/test_schedule_export.py -v`  
   Expect **5 passed**, including `test_plan_users_waiter_sees_schedulable_staff_without_user_read`.
2. **Frontend build:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=50 front` — no Angular/TS errors after load.
3. **Puppeteer:** With app on HAProxy (e.g. port 4202) and staff credentials:  
   `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:working-plan`  
   Expect export dropdown and Excel button present.
4. **Manual (waiter or kitchen):** Log in as a user **without** admin/owner (must have working plan module enabled). Open **Working plan** — worker dropdown should list staff; **Export Excel** should download when a worker is selected. Confirm `GET /users` still returns 403 for that user while `GET /schedule/plan-users` returns 200.
