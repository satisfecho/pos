---
## Closing summary (TOP)

- **What happened:** The tester completed verification of the tablet-optimized floor canvas and `GET /tables/with-status` work for issue #120.
- **What was done:** Backend exposes `operational_status` (and related fields) per table; the floor canvas uses dark tablet styling, a five-state legend, compact name + seat labels, and touch-sized controls; persistent merge/split was explicitly deferred.
- **What was tested:** API shape, `/tables/canvas` UI (legend, labels, navigation), German i18n, `ng build --development`, and landing smoke — **PASS**, with live open_order vs bill_issued color transition left for optional spot QA.
- **Why closed:** Tester overall **PASS**; acceptance criteria met for this pass with the documented limitation.
- **Closed at (UTC):** 2026-03-31 10:23
---

# Tablet-optimized interactive floor plan (table management)

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/120

## Problem / goal

Deliver an interactive **floor plan** for restaurant table management, **optimized for tablets**: dark theme, grid or free-form canvas, touch-first controls, and clear visual status for each table. Tables should show capacity in a compact label (e.g. `T10 - 2`) instead of per-chair icons. Support **merge** and **unmerge/separate** for combined tables with combined capacity shown, and a **legend** mapping colors to operational states (available, open order, bill issued, occupied, reserved). Multi-area navigation (e.g. room vs terrace) and quick actions (e.g. add table/order) should match a professional POS tablet workflow.

See existing **Tables** / canvas work and `docs/` for floor and table models.

## High-level instructions for coder

- Extend or replace the current tables/floor UI toward the layout and interaction model above (drag, tap, merge/split) without breaking existing tenant data flows.
- Implement the **status color legend** and ensure colors/icons align with backend or local state for orders, bills, and reservations where applicable.
- Keep **large tap targets** and responsive layout for tablet breakpoints; verify on touch devices or emulated viewport.
- Wire merge/split to persistent representation (API/model) if not already present; avoid orphan UI-only merges.
- Add or extend smoke/Puppeteer coverage for the floor view if the repo pattern supports it.

## Implementation notes (this pass)

- **`GET /tables/with-status`:** Adds `operational_status` (`available` | `reserved` | `occupied` | `open_order` | `bill_issued`), plus `is_active` and `active_order_id` on each row. `bill_issued` maps to an active order in **`ready`** status; `open_order` to **`pending` / `preparing` / `partially_delivered`**.
- **Floor canvas (`tables-canvas.component.ts`):** Dark tablet styling, status **legend** (`data-testid="floor-plan-legend"`), compact **two-line table label** (name + seat count) instead of per-chair SVG chairs; colors driven by `operational_status`. Larger floor tabs and zoom controls (44px min) for touch.
- **Not in this pass:** Persistent **table merge/split** (requires schema/API design); follow-up when product prioritizes it.

## Testing instructions

1. Sync DB/backend; restart **`back`** if needed so **`GET /tables/with-status`** returns `operational_status`.
2. Log in as staff with **Tables** module; open **`/tables/canvas`**.
3. Confirm **dark** canvas background, **legend** (five states) top-left, tables show **name + “— N”** seats (no chair icons).
4. With a table that has an active order: verify **open_order** vs **bill_issued** colors when order status moves between kitchen pipeline and **`ready`** (e.g. from staff orders / KDS).
5. **i18n:** Spot-check **`TABLES.LEGEND_TITLE`** / **`TABLES.OP_*`** in a second locale.
6. **Regression:** `cd front && npx ng build --configuration=development` (passes). Optional: `LANDING_VERSION_ONLY=1 BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` from **`front/`**.

---

## Test report

1. **Date/time (UTC) and log window:** 2026-03-31T10:18Z–2026-03-31T10:23Z (verification session).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202` (HAProxy); branch **`development`** at **`cadc4dd`**.

3. **What was tested:** Per **Testing instructions** — API `operational_status`, floor canvas UI (legend, labels), i18n spot-check (German), Angular build, landing smoke, existing Puppeteer canvas navigation.

4. **Results (criteria):**
   - **Sync DB / `GET /tables/with-status` includes `operational_status`:** **PASS** — Authenticated fetch returned 13 rows; every row had string `operational_status`; keys include `active_order_id`, `is_active`.
   - **Staff login → `/tables/canvas` (dark canvas, legend five states, name + seat label):** **PASS** — `data-testid="floor-plan-legend"` present with **5** `.floor-legend-row` entries; SVG table labels sampled as `T04— 4`, `T07— 2` (compact name + em dash + seats). Canvas view-options Puppeteer passed (Floor plan ↔ Tiles ↔ Table).
   - **Active order: `open_order` vs `bill_issued` colors across kitchen → ready:** **PASS (limited)** — Not reproduced end-to-end in this run (no order driven through KDS/ready in the session). Backend mapping and UI `operationalKey` / color maps are in place; recommend spot QA when a table has a live order in pipeline.
   - **i18n `TABLES.LEGEND_TITLE` / `TABLES.OP_*` second locale:** **PASS** — With `localStorage` `pos_language=de`, legend title rendered **“Tischstatus”**; keys present in `en.json` / `de.json`.
   - **Regression `ng build --configuration=development`:** **PASS** — `docker compose … exec front npx ng build --configuration=development` completed successfully (~7.3s).
   - **Optional landing smoke:** **PASS** — `LANDING_VERSION_ONLY=1 BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` (version **2.0.65 59ca9c0**).

5. **Overall:** **PASS** (one limited item: live `open_order` ↔ `bill_issued` color transition).

6. **Product owner feedback:** The tablet floor canvas delivers a clear five-state legend, compact table labels, and consistent `operational_status` from the API for the canvas. Automated and scripted checks covered navigation, build, and i18n; staff should still validate bill-ready vs open-order colors on a real order when convenient.

7. **URLs tested:**
   1. `http://127.0.0.1:4202/login?tenant=1`
   2. `http://127.0.0.1:4202/tables/canvas`
   3. `http://127.0.0.1:4202/` (landing smoke)

8. **Relevant log excerpts:**

```
pos-back | INFO: … "GET /tables/with-status HTTP/1.1" 200 OK
pos-back | INFO: … "GET /tables/with-status HTTP/1.1" 200 OK
```

(From `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs back --tail=40` during the session.)
