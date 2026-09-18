# Fix the Open menu icon on the internal order view

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/416
- **416**

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
