# Order header actions: stable alignment in badge (Orders)

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/59

## Problem / goal
On **Orders**, header action buttons inside the badge jump between `flex-start`, centered, and other positions (layout inconsistency). Actions should have a single, predictable alignment regardless of badge content length or viewport. See issue screenshot.

## High-level instructions for coder
- Inspect orders list/detail header template and styles (badge container, flex/grid, wrapping).
- Remove sources of non-deterministic alignment (e.g. mixed `justify-content`, conditional classes, min-height gaps); prefer one layout rule that holds across typical order states.
- Verify in browser at a few order states and widths; run relevant Puppeteer test if present (`docs/testing.md`).
