# Order header actions: stable alignment in badge (Orders)

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/59

## Problem / goal
On **Orders**, header action buttons inside the badge jump between `flex-start`, centered, and other positions (layout inconsistency). Actions should have a single, predictable alignment regardless of badge content length or viewport. See issue screenshot.

## High-level instructions for coder
- Inspect orders list/detail header template and styles (badge container, flex/grid, wrapping).
- Remove sources of non-deterministic alignment (e.g. mixed `justify-content`, conditional classes, min-height gaps); prefer one layout rule that holds across typical order states.
- Verify in browser at a few order states and widths; run relevant Puppeteer test if present (`docs/testing.md`).

## Implementation
- **`front/src/app/orders/orders.component.ts` (styles):** `.order-header` no longer uses `align-items: center` (that vertically centered the action row against a variable-height left column, so alignment looked different per card). It now uses `align-items: flex-start` plus `gap` so actions stay top-aligned with the first line of meta. `.order-header-actions` uses `flex-wrap: wrap` and `justify-content: flex-end` so wrapped controls stay consistently right-aligned in the card.

## Testing instructions
1. Stack up (e.g. Docker dev on HAProxy port **4202**): ensure front build is green (`docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=40 front`).
2. Manual: log in as staff with Orders access, open **`/staff/orders`**. On **Active orders** and **Not paid yet**, compare cards with short vs long header text (customer name, urgent badge, many action buttons). Header actions should stay **top-aligned** with the header block and **right-aligned** when they wrap; no vertical “floating” in the middle of tall headers.
3. Automated (optional): from repo root with app up, `BASE_URL=http://127.0.0.1:4202` (or your port) and credentials in env, run `node front/scripts/review-order-edit-puppeteer.mjs` per `docs/testing.md` §7b; or `BASE_URL=… npm run test:landing-version --prefix front` as a quick smoke.
