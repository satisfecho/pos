# Catalog provider product images return 404 (DB refs, files missing on disk)

## Source
- **Docker logs (pos-haproxy):** 2026-06-04 ~12:53 UTC — repeated **`GET /api/uploads/providers/b18b7fba-74d9-4956-9561-6dca2ea8feaa/products/{uuid}.jpg`** → **404** while staff used catalog.
- **Verified in container:** `ProviderProduct` rows exist with `image_filename` set (e.g. ids **69**, **74**, **92**), but matching files are **not** present under `back/uploads/providers/b18b7fba-74d9-4956-9561-6dca2ea8feaa/products/` (directory has other `.jpg` files only).

## Problem / goal

Staff **Catalog** shows broken images for some provider products because the API serves upload paths that 404 — database references filenames that were never stored (or were lost) locally. This is a standing data/integrity issue, not a one-off compile error.

## High-level instructions for coder

- Reproduce: log in, open **`/catalog`**, note cards with missing images; correlate with haproxy/back **`404`** on `/api/uploads/providers/.../products/*.jpg`.
- Compare DB `ProviderProduct.image_filename` vs files on disk under `uploads/providers/{provider.token}/products/`; quantify orphan refs.
- Prefer the **smallest** fix: e.g. repair seed/import to restore missing files, clear orphan `image_filename` when file absent, or API/UI fallback placeholder (see **`docs/0027-amvara9-menu-images-troubleshooting.md`**, **`docs/0014-provider-portal.md`**).
- Avoid large schema changes unless necessary; preserve tenant scoping and existing upload routes.
- After fix: `docker logs --since 10m pos-front` — no new Angular errors; smoke catalog with `front/scripts/test-catalog.mjs` if credentials available.
- Append **Testing instructions** when implementation is complete.
