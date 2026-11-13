# Kebab Factory menu images 404 (menu-recortes)

## GitHub Issues
- None (log-detected). Use issue **0** until a tracking issue is opened if needed.
- Related marketing repo: `satisfecho/092_kebabfactory` (commit `06030fd` on `main`; Build run `43408155673`).

## Problem / goal
Production nginx (`pos-front`) returns 404 for many kebab-factory menu images under `/kebab-factory/es/assets/menu-recortes/...` while serving `https://satisfecho.de/kebab-factory/es/`. Real browser traffic (2026-11-13) hit dozens of missing PNGs (platos, combos-ofertas, combos). On disk, `front/sites/kebab-factory/es/assets/` has only a few files (favicon/logo/hero); the `menu-recortes/` tree referenced by the HTML is absent.

This is a standing broken-asset incident for the marketing microsite, not scanner noise.

## High-level instructions for coder
- Inspect `front/sites/kebab-factory/es/index.html` (and related HTML) for `menu-recortes` image paths.
- Restore missing assets into `front/sites/kebab-factory/es/assets/menu-recortes/` (correct filenames), **or** update HTML/CSS to stop referencing missing files / use existing assets.
- Prefer fixing the site in-repo so deploy/prod nginx serves 200 for menu images.
- If assets live only in an external marketing source, document the sync path and land the files in this tree before closing.
- Verify: request sample paths under `/kebab-factory/es/assets/menu-recortes/` return 200 (local HAProxy or prod); check `docker logs pos-front` for no new open() failures on those paths.

## Status
- **UNTESTED** - implementation complete; waiting for tester.
- **Implemented** 2026-11-13 (UTC).

## Implementation notes
- `assets/menu-recortes/` never existed in `satisfecho/092_kebabfactory` or in artifact `kebab-factory-satisfecho-deploy` (~231 KB; only favicon/logo/hero). Restoring binary PNGs was not possible.
- Removed hardcoded `imageUrl` / `IMG = 'assets/menu-recortes'` from `MENU_FALLBACK` in `app.js`. Carta still renders text/prices; dish photos appear only when POS public menu supplies `image_url` (via existing `resolveImageUrl` / overlay).
- Synced fixed bundle into POS: `front/sites/kebab-factory/es/` from Build artifact run `43408155673`.
- **Sync path (for future photos):** add PNGs under marketing repo `assets/menu-recortes/{01-platos,02-combos-ofertas,03-combos}/`, re-add `imageUrl` in `app.js`, push `main` → Actions uploads `kebab-factory-satisfecho-deploy` → POS `scripts/sync-all-marketing-sites.sh` / Deploy to amvara9 rsyncs into `front/sites/kebab-factory/es/`.
- Marketing source fix: `092_kebabfactory` @ `06030fd` (pushed). Production HTML/JS updates after next **Deploy to amvara9** (or manual marketing sync + front rebuild on server).

## Testing instructions

### What to verify
1. Served `app.js` for Kebab Factory no longer references `menu-recortes`.
2. Real static assets under `/kebab-factory/es/assets/` still return **200**.
3. Loading the carta does not generate new nginx `open() ... menu-recortes ...` failures (only probe requests would 404).
4. Site page `/kebab-factory/es/` still returns **200** and menu sections render without broken `<img>` tags for missing local PNGs.

### How to test
Local (front container nginx; after `front/sites` is present):

```bash
# app.js must not mention menu-recortes
docker exec pos-front wget -q -O - http://127.0.0.1/kebab-factory/es/app.js | grep -c menu-recortes
# expect: 0

# real assets still OK
docker exec pos-front wget -q -S -O /dev/null http://127.0.0.1/kebab-factory/es/assets/favicon.png
docker exec pos-front wget -q -S -O /dev/null http://127.0.0.1/kebab-factory/es/assets/logo-pizza.png
docker exec pos-front wget -q -S -O /dev/null http://127.0.0.1/kebab-factory/es/assets/hero-durum.jpg
# expect: HTTP/1.1 200 OK each

# page
docker exec pos-front wget -q -S -O /dev/null http://127.0.0.1/kebab-factory/es/
# expect: 200

# optional: after a quiet window, no NEW open() menu-recortes errors beyond intentional probes
docker logs --since 2m pos-front 2>&1 | grep -c 'menu-recortes' || true
```

Production (after deploy / marketing sync):

```bash
curl -sfL https://satisfecho.de/kebab-factory/es/app.js | grep -c menu-recortes
# expect: 0
curl -sI https://satisfecho.de/kebab-factory/es/assets/favicon.png | head -1
# expect: HTTP/2 200 (or 200)
```

No dedicated Puppeteer script; static marketing site. Optional browser: open `https://satisfecho.de/kebab-factory/es/` (or local equivalent), confirm carta lists dishes without console 404 spam for `menu-recortes`.

### Pass/fail criteria
- **PASS:** `grep -c menu-recortes` on served `app.js` is **0**; favicon/logo/hero **200**; `/kebab-factory/es/` **200**; no new client-driven `menu-recortes` open() errors in `pos-front` logs when loading the page.
- **FAIL:** `app.js` still contains `menu-recortes`, or page/assets broken, or loading the carta still requests `/assets/menu-recortes/...`.
