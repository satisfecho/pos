# Tables — floor plan UX (auto-save, join snap-back, name refresh)

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/145

## Problem / goal
Improve the Tables floor-plan experience in three areas: (1) **auto-save** — persist layout changes with debounce (e.g. 300–800 ms), dedupe in-flight saves, correct “Unsaved changes” handling, and safe behavior on route leave / optional `beforeunload`, using existing APIs and tenant scoping; document user-visible behavior in CHANGELOG if needed. (2) **After joining tables** — when a join completes, restore dragged table(s) to their canvas positions from before the join gesture; grouping remains logical for service; clarify that join is grouping, not permanent overlap on the saved floor plan. (3) **Table name in floor view** — changing the name in the sidebar must update the visible label (and in-canvas title) immediately; debounced save must not delay local UI updates (fix binding/change detection so the name reflects the current model without requiring focus elsewhere).

Acceptance: after join, tables snap back to pre-gesture positions while the group stays joined; editing a name shows it immediately on the floor/canvas and persists after debounce/reload; no extra “click elsewhere” to see the name.

## High-level instructions for coder
- Implement debounced auto-save for floor layout with superseding saves and coherent dirty/unsaved state; handle navigation leave safely.
- After successful join, reset canvas positions to pre-gesture layout while preserving logical table group for service.
- Ensure table rename updates UI immediately; separate debounced persistence from local display state.
- Reuse existing floor/table APIs; keep tenant scoping and authorization consistent with adjacent tables code.
- Update CHANGELOG if behavior is user-visible.

## Implementation notes (coder)
- **Layout auto-save:** Already present in `tables-canvas.component.ts` (~550 ms debounce, serialized saves, epoch coalescing, `canDeactivate` + `beforeunload`). No change beyond UX fixes below.
- **Join snap-back:** On table drag start, snapshot all table positions on the current floor. On successful **drag-to-join** confirmation (`POST /table-groups`), after `GET /tables/with-status` reload, re-apply snapshot positions for the joined pair and trigger layout dirty + debounced auto-save. Cancel join modal or failed join API clears snapshot state; reload failure clears pending restore.
- **Name refresh:** Side panel title uses `selectedTableName`; `ngModelChange` on the name field updates `tables` + `selectedTable` so canvas labels update immediately; `PUT` still on blur.

## Testing instructions
1. **Build:** From `front/`, `npx ng build --configuration=development` (or rely on Docker `front` logs with no TS errors).
2. **Smoke (optional):** With app on e.g. `http://127.0.0.1:4202`, `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front`.
3. **Manual — `/tables/canvas`:**
   - Drag one table over another until join dialog appears; confirm join. Tables should **separate** to their pre-drag positions; group styling / group line in panel should still show joined service.
   - Select a table: edit **Name** in the side panel — **panel header** and **canvas label** should update **while typing** (no need to blur first).
   - Blur name field: name should persist; reload page and confirm names.
4. **Regression:** Ctrl/Cmd multi-select + **Join** (no drag) still works; floor switch still flushes layout when dirty; **Unsaved changes** clears after auto-save pause.
