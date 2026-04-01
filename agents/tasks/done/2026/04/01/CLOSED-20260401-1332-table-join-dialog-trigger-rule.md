---
## Closing summary (TOP)

- **What happened:** The tables canvas join/group confirmation was firing on proximity instead of true overlap with other table shapes.
- **What was done:** Coder tightened the trigger to geometric overlap (`tableShapesOverlapForJoin` in `tables-canvas.component.ts`) with a documented rule for rects vs ellipses, and aligned `docs/0051-table-groups-mvp.md`.
- **What was tested:** Docker dev front build/logs clean; Puppeteer negative (no overlap → no dialog) and positive (overlap + dwell → confirmation) **PASS**; optional round-table case skipped.
- **Why closed:** Tester test report overall **PASS**; acceptance criteria met.
- **Closed at (UTC):** 2026-04-01 13:47
---

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

---

## Test report

1. **Date/time (UTC):** 2026-04-01 ~13:45–13:47 (log window aligned with `docker compose … logs` and Puppeteer run).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **`BASE_URL`** `http://127.0.0.1:4202` (HAProxy); branch **`development`**, HEAD **`fdfd822`**.
3. **What was tested:** Items 1, 3–4 from **Testing instructions** (build/health of front, negative “no overlap → no dialog”, positive “overlap + ≥160 ms hold → join confirmation”). Item 2 (manual only) covered by scripted login + canvas. Item 5 (optional round tables) **not** run.
4. **Results:**
   - **Build / front logs:** **PASS** — `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` shows repeated “Application bundle generation complete” with no TS/Angular errors in the sampled window.
   - **Negative (no overlap):** **PASS** — Puppeteer dragged a table to a canvas position computed so its strict AABB did not overlap any other table; **`app-confirmation-modal`** did not appear after release.
   - **Positive (overlap + hold):** **PASS** — After the negative step, dragged the same table to overlap another table’s center, held ≥220 ms while overlapping, released; join confirmation modal (`app-confirmation-modal`) appeared; dismissed via secondary/cancel control.
   - **Optional round tables:** **SKIPPED** (not required for closure).
   - **Backend logs:** **PASS** — `GET /floors`, `GET /tables/with-status`, auth endpoints **200** in sampled `pos-back` logs; no errors in window.
5. **Overall:** **PASS** (failed criteria: none).
6. **Product owner feedback:** Join grouping should feel safer: tables that only sit near each other no longer trigger a join prompt, while intentional overlaps still surface the confirmation after a short dwell. The overlap rules are documented in the canvas component for maintainability. Round-table-only UX was not re-checked in this run; spot-check on a floor with circular tables if desired.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/login?tenant=1`
   2. `http://127.0.0.1:4202/tables/canvas`
8. **Relevant log excerpts (last section):**

```
pos-front | Application bundle generation complete. [0.289 seconds] - 2026-04-01T13:42:55.677Z
pos-front | Lazy chunk files    | chunk-4H4WV3BH.js   | tables-canvas-component  | 188.82 kB |
```

```
pos-back | INFO: ... "GET /floors HTTP/1.1" 200 OK
pos-back | INFO: ... "GET /tables/with-status HTTP/1.1" 200 OK
```

**Automation note:** One-off Puppeteer script `/tmp/tables-join-overlap-smoke.mjs` (not committed) implemented isolated-drop search so the negative case does not falsely overlap a third table on busy floors.
