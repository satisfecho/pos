# Fix the Open menu icon on the internal order view

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/416
- **416**

## Status
- **Implemented** (010 feature coder) — 2026-09-18
- Icon-only. Click, labels, and visibility rules are unchanged.

## Problem / goal
On the staff order view, the **Open menu** button icon looks broken. The stroke paths do not form a clear “open in a new view” mark. The button still calls `openMenuForOrder`. Keep that action. Draw a clean icon.

See `docs/0008-order-management-logic.md` for order-view behaviour. This task is icon-only.

## High-level instructions for coder
- Open the internal orders screen after login (active orders and the second order-card layout). Find the **Open menu** button (`ORDERS.OPEN_MENU`) next to delete and print.
- The icon is the SVG inside that button in `front/src/app/orders/orders.component.ts`. The same broken paths appear in both layouts. Fix both copies.
- Replace the paths with one clear external-link style icon (a box plus an arrow). Match the size and stroke of the nearby delete and print icons.
- Do not change click behaviour, labels, or when the button shows (`table_id` and `table_token` set).
- Check contrast of the icon on the button background (WCAG). Do not add new i18n keys.
- Smoke: open an order that has a table token; the Open menu icon looks complete; the button still opens the menu; `docker logs --since 10m pos-front` shows no Angular or TypeScript errors.

## What changed
- Both Open menu SVGs in `front/src/app/orders/orders.component.ts` now use one box plus an arrow (same paths as the booking external-link icon). Size stays 16×16, stroke width 2, `currentColor`.
- Contrast: the button uses `--color-text` (`#1C1917`) on `--color-surface` (`#FFFFFF`). That pair is about 16:1, above WCAG 3:1 for UI chrome. No colour change.
- `openMenuForOrder`, `ORDERS.OPEN_MENU`, and the `table_id` / `table_token` guard are unchanged.

## Testing instructions
1. Start the stack (`./run.sh` or the dev compose files). Open `http://127.0.0.1:4202`.
2. Log in as staff for a tenant that has an order with `table_id` and `table_token` (demo tenant 1).
3. Open `/staff/orders`. Check **Active** and **Not paid** cards. The **Open menu** button shows a box with an arrow that leaves the top-right corner. The old extra corner stroke is gone.
4. Click **Open menu**. A new tab opens `/menu/{token}?staff_access=…`. The click handler is the same.
5. Confirm the icon colour is readable on the white button (dark ink, same as the print icon).
6. Front compile: `docker logs --since 10m pos-front` has no `TS` or `NG` errors.
7. Optional flow smoke: `BASE_URL=http://127.0.0.1:4202 npm run test:staff-menu-link --prefix front` (needs `LOGIN_EMAIL` / `LOGIN_PASSWORD` or demo login env).
