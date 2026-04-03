# Tables canvas: grouping drag as visual-only gesture with snap-back

## GitHub Issues
- [github.com/satisfecho/pos/issues](https://github.com/satisfecho/pos/issues)
- `gh issue list --repo satisfecho/pos --state open --limit 40`
- Optional: `--json number,title,labels,updatedAt,url`
- **Issue:** https://github.com/satisfecho/pos/issues/154

## Problem / goal
Refactor the tables canvas so **grouping drag** is a **pure visual gesture**: while dragging for a join, do **not** persist `x_position` / `y_position` or mark the layout dirty. Use a **temporary offset** (e.g. SVG translate or CSS transform on the dragged table only) that follows the pointer. On **any** pointer end (successful join, failed join, cancelled modal, no valid target), **reset** that offset so the table **snaps back** to stored coordinates. **Overlap / join detection** must use **effective** positions (stored x,y plus current drag offset) so join behavior stays consistent with today. Keep **real repositioning** as a **separate** interaction if the product still needs moving tables (dedicated layout mode, long-press, or other control). **Autosave** must run only for **actual** layout changes, not for the grouping gesture.

## High-level instructions for coder
- Locate tables canvas / floor plan drag and join logic (likely `tables-canvas` and related services); map where drag currently updates persisted positions or dirty state.
- Introduce a **transient drag offset** layer for the **grouping** interaction only; ensure stored coordinates are unchanged until an explicit “move table” path runs.
- On pointer up / cancel / modal dismiss, **always** clear the transient offset (snap-back).
- Update hit-testing / proximity / join target logic to use **effective** positions (base + offset).
- Separate **layout edit** vs **grouping gesture** if both exist; gate autosave so grouping never triggers it.
- Manually test: drag toward join target, cancel, invalid target — table returns to original spot; successful join still works; moving tables (if applicable) still persists and autosaves.
- See `docs/` for any floor-plan / tables UX notes if present (e.g. prior table-group or canvas work).

## Implementation notes (coder)

- **`front/src/app/tables/tables-canvas.component.ts`:** Join gesture uses `groupingDragOffset` signal + `tableGroupTransform()`; `tables()` x/y unchanged until **layout move** (`activeDragIsLayoutMove`: **Alt+mousedown** or **`layoutArrangeMode`** toggle). Join hit-testing uses `applyGroupingOffsetToTable`. **Join confirm** closes the modal without `onConfirmationCancel()` so restore maps are not cleared early; failed pre-join flush clears gesture snapshots.
- **i18n:** `TABLES.JOIN_HINT` plus `ARRANGE_LAYOUT_OFF` / `ON` / `TITLE` in all `front/public/i18n/*.json`.

## Testing instructions

1. **Stack:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (or `./run.sh`); open `http://127.0.0.1:4202/tables/canvas` (staff login).
2. **Join gesture (default drag):** Drag an ungrouped table over another until proximity highlight; release without holding — table should **snap back**; **Unsaved changes** should **not** appear from that gesture alone.
3. **Join confirm / cancel:** Overlap ~1s+, release → confirm dialog → **Cancel** → tables stay at **original** stored positions; repeat and **Confirm** → group forms and prior **snap-after-join** still applies (no stuck overlap from the gesture).
4. **Layout move — desktop:** Turn off arrange toggle if on; **Alt+drag** a table → **Unsaved changes** / autosave should behave as before (debounced save).
5. **Layout move — touch / tablet:** Enable **Move tables** (`data-testid="tables-canvas-arrange-layout-btn"`), drag → positions persist and autosave; toggle off → drag is join-only again.
6. **Regression:** Ctrl/Cmd+click multi-select join; palette **add table**; floor switch with unsaved layout still prompts/flush as before.
7. **Build:** `docker compose … logs --tail=80 front` — no Angular/TS errors after edits.
