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
