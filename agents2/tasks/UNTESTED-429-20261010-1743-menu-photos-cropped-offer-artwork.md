# Menu photos are cropped and cut off the offer artwork

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/429
- **429**

## Status
- **Implemented:** 2026-10-10T17:48:00Z (UTC)
- Grid / featured / detail images use `object-fit: contain`; hover image zoom removed; featured container letterbox background set.

## Problem / goal
On the ordering menu (`/menu/{uuid}`), product card photos use a fixed aspect-ratio frame with `object-fit: cover`, so offer-poster artwork is cropped: poster title sliced at the top and large poster price at the bottom. Card name/price under the photo (from product fields) are fine.

Same crop pattern appears on featured cards and in product detail. Goal: show the full poster without cutting off top/bottom text (`object-fit: contain` on the existing container background); remove hover zoom if it re-crops. Do not change uploaded files or product name/price rendering.

## High-level instructions for coder
- Inspect `front/src/app/menu/menu.component.scss`: `.product-image-container` / `.product-image` (`aspect-ratio: 16 / 10`, `object-fit: cover`), featured (`.featured-image`, `4 / 3` + `cover`), and product detail (`16 / 9` + `cover`). Align with issue #429 acceptance.
- Switch image fitting so the full poster fits inside the frame without cropping top/bottom text; keep container background as intended for letterboxing.
- Remove or adjust hover `transform: scale(…)` if zoom crops the image again.
- Out of scope: public-menu 72×72 thumbnails (`front/src/app/public-menu/`); product data, prices, or create/upload flows.
- Verify in browser on desktop (incl. 4-column grid) and mobile: full poster visible on grid, featured, and detail; card name/price unchanged.
- Confirm front build clean via `docker logs --since 10m pos-front` after SCSS changes.

## What changed
- `front/src/app/menu/menu.component.scss`: `.product-image`, `.featured-image`, `.detail-image` → `object-fit: contain`; removed hover `scale` on product/featured images; added `background: var(--color-bg)` on `.featured-image-container` for letterboxing.

## Testing instructions
1. App up (HAProxy, e.g. `http://127.0.0.1:14202` or `4202`). Use an **active** table token (`is_active=true`), e.g. Take Away, or activate a floor table from staff UI.
2. Open `/menu/{token}` on a wide desktop viewport (≥4 product columns). Confirm product card photos show the full poster (title at top and price band at bottom not cropped). Letterboxing on the container background is OK.
3. Hover a product card: image must not zoom/crop again (card lift/shadow may still move).
4. If featured products exist, confirm featured images also show the full poster (`contain`).
5. Open a product detail: detail hero image uses `contain` (full poster visible).
6. Repeat on a mobile viewport (~390px): same full-poster behaviour; name/price under cards unchanged.
7. Out of scope check: `/public-menu/…` 72×72 thumbs still use their existing crop (unchanged).
8. Front build: `docker logs --since 10m pos-front` — no TypeScript/Angular compile errors after the SCSS change.
9. Optional smoke: `BASE_URL=http://127.0.0.1:14202 LANDING_VERSION_ONLY=1` landing version test (host Chromium + container `node_modules` via `NODE_PATH` if needed).
