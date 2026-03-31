# Tables default view

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/124

## Problem / goal

Improve the Tables area so navigation preserves context and works better on tablets:

- Remember the last Tables sub-view (e.g. canvas vs list). If the user was on `/tables/canvas`, returning from Orders should land on canvas again, not reset.
- Provide a clear top control to switch between Orders and Tables (copy should follow i18n, e.g. “Pedidos” / “Orders” per language).
- On double-click of a table, scope the UI so the user sees only that table’s order (not a generic mixed view).
- Add a control to hide/show the main sidebar navigation (useful for tablet “fullscreen” style use).
- Add a fullscreen toggle using an icon only (no text on the button); place it where it fits the existing layout.

## High-level instructions for coder

- Persist or restore the last Tables view mode across route changes (Orders ↔ Tables) using existing Angular routing/state patterns; avoid breaking deep links.
- Add the Orders/Tables switcher in the shell/header for this flow and wire translations.
- Define double-click behavior on table entities so order scope filters to that table; align with current order/table models and APIs.
- Implement sidebar visibility toggle and fullscreen toggle (e.g. Fullscreen API or layout-only fullscreen) with accessible icon buttons and mobile/tablet testing.
