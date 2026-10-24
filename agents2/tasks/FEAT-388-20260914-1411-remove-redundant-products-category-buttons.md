# Remove redundant Products / Product Categories buttons (#388)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/388
- **388**

## Status
- **Blocked - waiting for human** (design: only one Products ↔ Categories switcher exists; filter ribbon is not the same nav)
- **Waiting notice posted:** 2026-09-14T14:21:28Z

## Problem / goal
On the **Products** area, a **Product Categories** button (and effectively the **Products** button) duplicates the existing **tabs** that already switch Products vs Product Categories. Screenshots in the issue show both a tab strip and redundant action buttons - clutter and two ways to do the same nav.

## High-level instructions for coder
- Open `/products` (and Product Categories view) after login. Identify the redundant **Products** / **Product Categories** controls vs the tab strip (issue images).
- Remove or hide the redundant buttons so **tabs alone** switch views. Keep deep-links / routes that tabs already use.
- Do not remove category CRUD or product list features - only the duplicate nav chrome.
- If a Catalog & Inventory hub (#391) or sidebar already links here, leave those entry points; this task is in-page duplication only.
- i18n: drop unused keys only if nothing else references them.
- Smoke: `/products` → tabs switch Products ↔ Categories; no duplicate buttons; front build clean in `docker logs --since 10m pos-front`.

## Agent notes (010)
Live `/products` (2026-09-14): one main-tab row switches Products ↔ Product Categories. The ribbon (“All Categories”, category names) only filters the product list. Removing the main-tab row would remove the only in-page path to category CRUD unless another entry point is chosen. Waiting on issue comment for A/B/C.
