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
