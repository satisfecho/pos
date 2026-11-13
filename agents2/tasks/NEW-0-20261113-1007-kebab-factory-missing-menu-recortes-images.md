# Kebab Factory menu images 404 (menu-recortes)

## GitHub Issues
- None (log-detected). Use issue **0** until a tracking issue is opened if needed.

## Problem / goal
Production nginx (`pos-front`) returns 404 for many kebab-factory menu images under `/kebab-factory/es/assets/menu-recortes/...` while serving `https://satisfecho.de/kebab-factory/es/`. Real browser traffic (2026-11-13) hit dozens of missing PNGs (platos, combos-ofertas, combos). On disk, `front/sites/kebab-factory/es/assets/` has only a few files (favicon/logo/hero); the `menu-recortes/` tree referenced by the HTML is absent.

This is a standing broken-asset incident for the marketing microsite, not scanner noise.

## High-level instructions for coder
- Inspect `front/sites/kebab-factory/es/index.html` (and related HTML) for `menu-recortes` image paths.
- Restore missing assets into `front/sites/kebab-factory/es/assets/menu-recortes/` (correct filenames), **or** update HTML/CSS to stop referencing missing files / use existing assets.
- Prefer fixing the site in-repo so deploy/prod nginx serves 200 for menu images.
- If assets live only in an external marketing source, document the sync path and land the files in this tree before closing.
- Verify: request sample paths under `/kebab-factory/es/assets/menu-recortes/` return 200 (local HAProxy or prod); check `docker logs pos-front` for no new open() failures on those paths.
