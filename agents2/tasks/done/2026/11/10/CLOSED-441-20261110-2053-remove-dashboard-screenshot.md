---
## Closing summary (TOP)

- **What happened:** Staff dashboard screenshot with sensitive/demo operational data needed removal from shipping docs.
- **What was done:** Deleted `docs/screenshots/dashboard.png`, removed docs/README references, adjusted the screenshot collage to kitchen + menu, and stopped capture-screenshots from regenerating the file.
- **What was tested:** File absence, no `dashboard.png` refs in README/`docs/screenshots/README.md`, collage and capture-script checks, and landing-version smoke on satisfecho.de - all PASS.
- **Why closed:** All acceptance criteria passed; product-owner feedback cleared close.
- **Closed at (UTC):** 2026-11-10 20:59
---

# Remove dashboard screenshot

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/441
- **441**

## Status
- **WIP → UNTESTED:** Implementation complete; awaiting tester.

## Problem / goal
The staff **dashboard** screenshot in docs shows sensitive / demo operational data and should be removed from documentation. Issue points at `docs/screenshots/README.md` (Staff dashboard section and `dashboard.png`). The same asset is also used in the main `README.md` screenshot collage.

## High-level instructions for coder
- Remove `docs/screenshots/dashboard.png` from the repo (or stop shipping it) and drop all documentation references to it.
- Update `docs/screenshots/README.md`: remove the Staff dashboard section / table row for `dashboard.png`.
- Update the main `README.md` collage so it no longer embeds `docs/screenshots/dashboard.png`; keep a sensible collage with the remaining public screenshots (e.g. kitchen, menu) without leaving a broken image.
- If `front/scripts/capture-screenshots.mjs` still captures `/dashboard` → `dashboard.png` for docs, stop or skip that capture so regenerating screenshots does not reintroduce the file.
- Out of scope unless the issue is expanded: `front/public/manual-usuario/` and `docs/manual-usuario/` have a separate dashboard image path; do not change those unless clearly required by #441 follow-up.
- Do not invent a replacement dashboard screenshot with live data; removal is the goal.
- Smoke: confirm README and `docs/screenshots/README.md` have no broken `dashboard.png` links; landing still loads (`BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` from `front/` if the stack is up).

## What was done
- Deleted `docs/screenshots/dashboard.png`.
- Removed Staff dashboard section and file-reference row from `docs/screenshots/README.md`.
- README collage now shows kitchen + menu only (48% width each).
- `front/scripts/capture-screenshots.mjs` no longer captures `/dashboard` → `dashboard.png`.
- Left `front/public/manual-usuario/` and `docs/manual-usuario/` dashboard images unchanged (out of scope).

## Testing instructions
1. Confirm `docs/screenshots/dashboard.png` is absent (`test ! -f docs/screenshots/dashboard.png`).
2. Confirm no `dashboard.png` references in `README.md` or `docs/screenshots/README.md` (`rg dashboard\\.png README.md docs/screenshots/README.md` → no matches).
3. Open `README.md` Screenshots section: collage shows kitchen and menu only; no broken image.
4. Open `docs/screenshots/README.md`: no Staff dashboard section; file table has no `dashboard.png` row.
5. Optional: with stack up, `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` (or equivalent reachable BASE_URL) still passes.
6. Optional: skim `front/scripts/capture-screenshots.mjs` and confirm staff capture list starts at orders (no `/dashboard` → `dashboard.png`).

## Test report

- **Date/time (UTC):** 2026-11-10T20:58:19Z start; 2026-11-10T20:58:58Z end
- **Log window:** ~2026-11-10T20:44Z–20:58Z (`docker logs --since 15m`)
- **Environment:** Host stack via `docker compose` prod overlay (HAProxy 80/443; host `4202` not published). Branch `development` @ `46e40733e`. Docs/file checks on repo workspace. Optional landing: `BASE_URL=https://satisfecho.de` (local `https://127.0.0.1` Puppeteer blocked by cert CN; curl to local HTTPS returned 200).
- **What was tested:** Removal of staff `dashboard.png` and docs references; README collage; capture script skip; optional landing smoke.

### Results

1. `docs/screenshots/dashboard.png` absent - **PASS** - `test ! -f` OK; directory listing has kitchen/menu/orders/etc., no `dashboard.png`.
2. No `dashboard.png` in `README.md` or `docs/screenshots/README.md` - **PASS** - `rg dashboard\.png` on both files: no matches.
3. README Screenshots collage kitchen + menu only - **PASS** - two `<img>` tags at 48% width for `kitchen.png` and `menu.png`; both files exist on disk.
4. `docs/screenshots/README.md` no Staff dashboard / no `dashboard.png` row - **PASS** - sections start at Orders; file table lists orders through platform only.
5. Optional landing-version - **PASS** - `npm run test:landing-version` with `BASE_URL=https://satisfecho.de` and Linux Chrome: RESULT OK (version `2.1.188`, demo restaurant card). Local HTTPS curl `/` and `/api/health` also 200.
6. Optional capture script - **PASS** - comment `#441` omission; first staff capture is `/staff/orders` → `orders.png` (no `/dashboard` → `dashboard.png`).

### Overall: **PASS**

### Product owner feedback
Staff dashboard screenshot is gone from shipping docs and the capture pipeline will not put it back. README collage still looks coherent with kitchen and menu. Safe to close #441 from a docs/privacy standpoint.

### URLs tested
1. `https://127.0.0.1/` (curl 200)
2. `https://127.0.0.1/api/health` (curl 200, `{"status":"ok"}`)
3. `https://satisfecho.de/` (Puppeteer landing-version PASS)

### Relevant log excerpts (last section)
- Front (nginx stale chunk, unrelated to docs change): `open() "/usr/share/nginx/html/chunk-4DW6H2P6.js" failed (2: No such file or directory)` during prior client load.
- Back: migration INFO lines only in window; no traceback tied to this task.
- Landing test: `>>> RESULT: Landing page shows version and demo restaurant card.`
