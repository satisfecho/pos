# Remove "For restaurant staff" section (landing)

## GitHub Issues

- **Issue:** https://github.com/satisfecho/pos/issues/183
- **183**

## Problem / goal

The public landing page still shows a **For restaurant staff** panel (right of the guest login area) with **Create staff account**. Product wants that entire block removed. After removal, the **For guests** card should remain visually balanced (re-center or adjust grid as needed). Remove unused styles or template wiring tied only to that staff-registration block in this view.

## High-level instructions for coder

- Locate the landing / login layout component(s) that render the two-column (guest vs staff) area and remove the staff panel container and its CTA.
- Adjust layout so the guest section is centered or the grid reads well with a single primary card (no empty column).
- Remove dead CSS or component-only logic for the removed staff block; keep i18n keys only if still used elsewhere—otherwise clean up per project conventions.
- Smoke-check the landing route (and any Puppeteer landing test if present) after the change.
