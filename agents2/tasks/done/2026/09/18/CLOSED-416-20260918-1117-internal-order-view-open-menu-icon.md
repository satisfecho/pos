---
## Closing summary (TOP)

- **What happened:** The Open menu icon on the staff order view did not form a clear mark.
- **What was done:** Both Open menu SVGs in `orders.component.ts` now use a box plus an arrow. Click, labels, and visibility rules stayed the same.
- **What was tested:** Tester result is PASS. Active and Not Paid Yet cards show the new icon, the click opens the menu, contrast is about 17.5:1, and `test:staff-menu-link` passed.
- **Why closed:** All criteria passed.
- **Closed at (UTC):** 2026-09-18 11:32
---

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

## Test report

1. **Date/time (UTC):** start 2026-09-18T11:26:59Z, end 2026-09-18T11:30:00Z. Log window: `docker logs --since 20m pos-front` at end time.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`. `BASE_URL=http://127.0.0.1:4202`. Branch `development` at `a9a167244`. HAProxy host port 4202.
3. **What was tested:** Open menu icon on Active and Not Paid Yet cards; click opens `/menu/{token}?staff_access=`; icon contrast on the white button; front compile logs; `npm run test:staff-menu-link`.
4. **Results:**
   - **PASS** — Active tab: 16 Open menu buttons. Each SVG is 16×16, stroke 2, three shapes only (box path, arrow polyline `15 3 21 3 21 9`, line `10,14` to `21,3`). No extra corner stroke.
   - **PASS** — Not Paid Yet tab: 1 Open menu button. Same SVG as Active.
   - **PASS** — Click opens a new tab at `/menu/{token}?staff_access=…`. The `staff_access` query is present. Token value omitted.
   - **PASS** — Computed style: ink `rgb(28, 25, 23)` on `rgb(255, 255, 255)`. Contrast about 17.5:1. Same pair as the print button (`--color-text` on `--color-surface`). Above WCAG 3:1 for UI chrome.
   - **PASS** — `docker logs --since 20m pos-front` has no `error TS`, `NG8002`, or `Application bundle generation failed`. Existing `NG8107` warnings are in `menu.component.html`, not this icon.
   - **PASS** — `BASE_URL=http://127.0.0.1:4202 HEADLESS=1 npm run test:staff-menu-link --prefix front` printed `PASS: No PIN modal shown; staff link correctly skips PIN.`
5. **Overall:** **PASS**
6. **Product owner feedback:** The Open menu mark is a full box with an arrow out of the top-right corner. Staff can still open the table menu from Active and Not Paid Yet cards. The icon stays dark on the white button, same as the print icon.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/login?tenant=1`
   2. `http://127.0.0.1:4202/dashboard`
   3. `http://127.0.0.1:4202/staff/orders`
   4. `http://127.0.0.1:4202/menu/{token}?staff_access=…` (token redacted)
8. **Relevant log excerpts:**

```text
> front@2.1.175 test:staff-menu-link
> node scripts/test-staff-menu-link-puppeteer.mjs
   Menu tab URL has staff_access: true
PASS: No PIN modal shown; staff link correctly skips PIN.
```

Front log scan for `error TS`, `NG8002`, and `Application bundle generation failed` in the last 20 minutes: no matches.
