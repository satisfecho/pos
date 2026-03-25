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
