# Table join dialog — trigger rule

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/142

## Problem / goal
On the Tables layout, the “join / group tables” confirmation must appear only when the dragged table **actually overlaps** the other table in canvas space (bounding boxes or shape geometry intersect; intersection area greater than zero, or enforce a minimum overlap ratio if tiny touches should be ignored). Adjacent tables that are close but **not** overlapping must not open the join dialog. Do not rely on distance alone as the trigger.

Document the chosen overlap rule (e.g. AABB vs rotated rectangles) in code or a short note so behavior stays consistent with zoom and pan.

## High-level instructions for coder
- Locate the tables canvas drag/join flow and where the join confirmation is shown.
- Replace or tighten the trigger so it requires real geometric overlap in layout coordinates, not mere proximity.
- Align with how table shapes are drawn (rotation, hit testing) so the rule matches what users see.
- Add a brief, durable explanation of the overlap test for future maintainers.
- Verify with adjacent non-overlapping tables and clearly overlapping pairs.

## Implementation notes (coder)
- **`front/src/app/tables/tables-canvas.component.ts`:** Removed inflated AABB margin. Join target uses **`tableShapesOverlapForJoin`**: strict positive AABB intersection for rectangle/booth/bar; for two circle/oval tables, normalized ellipse separation \((dx/(rx_1+rx_2))^2 + (dy/(ry_1+ry_2))^2 < 1\); mixed rect+ellipse uses strict AABB between bounds. Tables are not rotated on the canvas; doc block in component describes the rule. **`docs/0051-table-groups-mvp.md`** updated to match.

## Testing instructions
1. **Build:** With Docker dev stack, `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` — no Angular/TS errors after change.
2. **Manual `/tables/canvas`:** Log in as a user with table layout permission; same floor, two **ungrouped** rectangular tables.
3. **Negative:** Place tables with a visible gap (e.g. 20–40 px in canvas space). Drag one table **close** to the other without overlapping surfaces; release — **no** join confirmation dialog.
4. **Positive:** Drag so the table bodies clearly overlap; keep overlap **≥ ~160 ms**; release — join confirmation **should** appear; cancel or confirm as appropriate.
5. **Optional:** Repeat with two **round** tables — dialog only when circles visually overlap, not when only nearby.
