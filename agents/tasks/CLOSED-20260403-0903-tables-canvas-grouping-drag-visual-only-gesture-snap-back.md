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

---

## Test report

1. **Date/time (UTC):** 2026-04-03 ~09:12–09:25 (log window aligned with this run).
2. **Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (HAProxy `BASE_URL=http://127.0.0.1:4202`); branch **development**, commit **3e1a61c**. Staff login via repo `.env` (`LOGIN_EMAIL` / `LOGIN_PASSWORD` with `ADMIN_EMAIL` / `DEMO_*` fallback, same precedence as `front/scripts/test-tables-canvas-view-options.mjs`). Headless Chrome (`puppeteer-core` from `front/node_modules`, `NODE_PATH` set when running ad-hoc script under `/tmp`).
3. **What was tested:** Task **Testing instructions** §1–7 (join gesture vs unsaved, join modal cancel, Alt+layout drag + save, short join-gesture drag, arrange-mode layout drag, regression via existing canvas script, Angular build via front container logs). **Join Confirm** (API group create) was **not** executed to avoid mutating demo groups beyond cancel-only flow. **Ctrl/Cmd+click multi-select join** and **floor switch with unsaved layout** were **not** re-run in this session (no dedicated script).
4. **Results (criteria):**
   - **§1 Stack / canvas reachable:** **PASS** — `curl` to `/` and `/api/health` returned 200; Puppeteer navigated to `/tables/canvas` after login.
   - **§2 Join gesture, snap-back, no unsaved:** **PASS** — After a short default drag (no overlap hold), `.unsaved-indicator` stayed absent (`/tmp/verify-tables-canvas-grouping.mjs`).
   - **§3 Join dialog Cancel:** **PASS** — Overlap hold + release opened confirmation modal; **Cancel** cleared modal; no unsaved after cancel. Pair chosen as first + farthest **T-prefixed** ungrouped labels in SVG (avoids grouped “Mesa” tables that cannot start join drag).
   - **§3 Join Confirm / group create:** **N/A (not run)** — Intentionally skipped to avoid creating a real table group on tenant 1 demo data.
   - **§4 Layout move desktop (Alt+drag):** **PASS** — Unsaved appeared after Alt+drag; Save control enabled and cleared unsaved after click (flush).
   - **§5 Layout move (Move tables toggle):** **PASS** — With `data-testid="tables-canvas-arrange-layout-btn"` active, drag showed unsaved (simulated pointer; not real touch).
   - **§6 Regression (partial):** **PASS (partial)** — `node front/scripts/test-tables-canvas-view-options.mjs` passed (Floor plan ↔ Tiles ↔ Table, **Add table** palette, view options remain visible). **Ctrl/Cmd+click** join and **floor switch + unsaved** not exercised this run.
   - **§7 Build / front logs:** **PASS** — `docker compose … logs --tail=80 front` shows `Application bundle generation complete` for `tables-canvas-component` chunk; no TS/NG errors in tail.
   - **Backend pytest (full suite):** **Out of scope note** — `docker compose … exec back pytest -q`: **7 failed, 158 passed**; failures in `test_guest_feedback`, `test_reservation_book_zones_public`, `test_reservation_floor_seating_zone` (unrelated to tables canvas). No assertion this task fixes them.
5. **Overall:** **PASS** (with **§3 Confirm** and **§6** partial scope as above).
6. **Product owner feedback:** Grouping drag no longer dirties the layout in quick-drag checks, while Alt-drag and **Move tables** still drive autosave as expected. Join cancel behaves cleanly after overlap. Recommend a quick human pass on **Confirm** join and **Ctrl+click** / **floor switch** if those paths are business-critical this week.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/login?tenant=1`
   2. `http://127.0.0.1:4202/tables/canvas`
   3. `http://127.0.0.1:4202/tables` (Tiles / Table list via view-options script)
8. **Relevant log excerpts (last section):**

```
pos-front | Application bundle generation complete. [0.893 seconds] - 2026-04-03T09:07:04.233Z
pos-front | Lazy chunk files    | Names                   |  Raw size
pos-front | chunk-ZWAOCQ6R.js   | tables-canvas-component | 203.22 kB
```

*(Ad-hoc verification script used for join/unsaved/arrange assertions: `/tmp/verify-tables-canvas-grouping.mjs` — not committed; uses default Puppeteer viewport; wide fixed viewports broke Alt+layout detection in headless.)*
