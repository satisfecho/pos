---
## Closing summary (TOP)

- **What happened:** `/tables/canvas` did not show the floor-plan canvas because Angular matched the broader `tables` route before the `tables/canvas` route.
- **What was done:** The coder registered `tables/canvas` before `tables` in `app.routes.ts` so the canvas component loads for that URL.
- **What was tested:** `test-tables-canvas-view-options.mjs` (Puppeteer) passed with exit 0: canvas header and view options visible, no spurious redirect to `/dashboard`, `/tables` list and toggles still work.
- **Why closed:** Tester test report overall **PASS**; acceptance criteria satisfied.
- **Closed at (UTC):** 2026-03-24 22:04
---

# tables > canvas view is broken

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/71

## Problem / goal
Visiting `/tables/canvas` (e.g. `http://127.0.0.1:4202/tables/canvas`) redirects to the dashboard instead of showing the floor-plan canvas. Expected: canvas loads; investigate routing, guards, and any redirect rules.

See **`docs/testing.md`** — `test:tables-canvas-view-options` / `front/scripts/test-tables-canvas-view-options.mjs` for the intended Floor plan ↔ Tiles ↔ Table navigation around `/tables/canvas`.

## High-level instructions for coder
- Reproduce locally (Docker HAProxy port, logged-in staff with table access).
- Trace Angular route config and guards for `tables/canvas` vs dashboard default redirect.
- Fix the minimal cause (route order, guard, lazy load failure, or bad link) so `/tables/canvas` renders the canvas component without bouncing to dashboard.
- Run or extend the Puppeteer tables-canvas test if behaviour changes; confirm no regression on `/tables` list/tiles views.

## Implementation note (coder)

- **Cause:** In `app.routes.ts`, `path: 'tables'` was listed before `path: 'tables/canvas'`. The router’s default **prefix** matching treats `/tables/canvas` as matching the `tables` route first, so the tables list component was activated instead of `TablesCanvasComponent`.
- **Fix:** Register `tables/canvas` **before** `tables`.

## Testing instructions

**What to verify**

- After login as **owner** or **admin**, `GET` / direct navigation to `/tables/canvas` shows the floor-plan canvas (header `data-testid="tables-canvas-header"`), not an unexpected redirect to `/dashboard` and not the tiles/table list UI for that URL.
- `/tables` still loads the tables list; view toggles and links behave as before.

**How to test**

- With the stack up (e.g. HAProxy on `4202`), from repo root:
  - `BASE_URL=http://127.0.0.1:4202 LOGIN_EMAIL=… LOGIN_PASSWORD=… node front/scripts/test-tables-canvas-view-options.mjs`
  - Or `npm run test:tables-canvas-view-options --prefix front` with the same env (see `docs/testing.md`).
- Optional quick check: `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/` → `200` (app up).

**Pass / fail**

- **Pass:** Puppeteer script completes with exit code **0** and logs `Tables canvas view-options test passed`.
- **Fail:** Script errors, canvas header missing, or navigation ends on `/dashboard` for an owner/admin user when opening `/tables/canvas`.

---

## Test report

1. **Date/time (UTC) and log window:** 2026-03-24 ~22:00–22:01 UTC; `docker compose … logs --tail=40 front` sampled immediately after the run (~22:01 UTC).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `132ced7`; Puppeteer `HEADLESS=1`.

3. **What was tested:** Per “What to verify”: `/tables/canvas` shows floor-plan canvas (script asserts three view options + canvas flow); `/tables` list and view toggles exercised by `test-tables-canvas-view-options.mjs`.

4. **Results**
   - Direct `/tables/canvas` after owner login shows canvas + view options (Floor plan, Tiles, Table): **PASS** — script logged “Three view options visible” and “Floor plan (canvas) visible”.
   - No redirect to `/dashboard` during canvas flow: **PASS** — script completed without dashboard assertion failure; exit 0.
   - `/tables` list still reachable and toggles work: **PASS** — steps 4–7 (Tiles, Table, back to floor plan, table list) succeeded.

5. **Overall:** **PASS**

6. **Product owner feedback:** The floor-plan URL again matches the canvas experience users expect. View switching (floor plan ↔ tiles ↔ table) behaved consistently through the automated flow, which reduces risk of staff confusion when managing the dining layout.

7. **URLs tested**
   1. `http://127.0.0.1:4202/` (curl smoke)
   2. `http://127.0.0.1:4202/tables/canvas` (Puppeteer after login, tenant 1)
   3. In-app navigation among tables views per script (same origin)

8. **Relevant log excerpts**
   - Front (build health): `Application bundle generation complete. [0.519 seconds] - 2026-03-24T22:00:40.923Z` — no TS/Angular errors in tail.
   - Puppeteer stdout: `>>> RESULT: Tables canvas view-options test passed (Floor plan → Tiles → Table → Floor plan → Table).` — exit code 0.
