# Remove dashboard screenshot

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/441
- **441**

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
