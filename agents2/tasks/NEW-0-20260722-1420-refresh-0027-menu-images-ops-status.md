# Refresh 0027 menu-images troubleshooting status

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`docs/0027-amvara9-menu-images-troubleshooting.md` still describes the HAProxy/`StaticFiles` 404 fix as if it might be pending on amvara9, with no “routes shipped” banner. Explicit upload routes have been in `back/app/main.py` for months. Operators and agents may re-diagnose an already-fixed mount issue instead of missing-on-disk / orphan `image_filename` cases (see open catalog NEW).

## Evidence (008 preflight / review)

- `SIGNAL docs_stale` continuation — **>90d**; deferred earlier; only referenced (not owned) by **`NEW-0-20260604-1325-catalog-provider-images-404-missing-on-disk.md`**
- Doc “Cause and fix” section: explicit `GET /uploads/...` routes — still the right ops story, but needs a current-status cue
- Preflight demo/catalog hygiene still noisy; keep this as a **small doc** task (no product rewrite)

## High-level instructions for coder

- Add a short top banner: **ops guide — upload routes shipped**; if curl shows JSON `Image not found`, treat as missing file / DB orphan (link **`docs/`** catalog/provider notes and the open catalog-images NEW if still open), not as “redeploy for StaticFiles”.
- Skim verify commands (`docker compose … -f docker-compose.prod.yml`, curl `/api/uploads/...`) against current amvara9 docs (**0001** / **0004**); fix only broken path strings if any.
- Do **not** re-implement upload routes or expand into a full images redesign.
- Pass/fail: first screenful states routes are in tree; remaining 404s point to file/DB; no product code changes unless a one-line doc command path is wrong.
