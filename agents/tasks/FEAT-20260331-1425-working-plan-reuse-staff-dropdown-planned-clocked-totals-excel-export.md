# Working plan: reuse staff dropdown for collapsible “Planned vs clocked” + totals; optional Excel export

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/130

## Problem / goal

On the Working plan screen, improve how owners see **planned** (scheduled shifts) vs **clocked** (attendance / net time by UTC day from clock-in), tied to the **existing staff/user dropdown**—no duplicate employee selector unless an explicit “All staff” aggregate mode is required. Keep the page light: wrap the planned-vs-clocked block in a **collapsible/disclosure** (default **collapsed**, e.g. “Show planned vs clocked”; optional persistence of open state). Show **totals** (planned hours, clocked hours, variance—positive when clocked exceeds planned) for quick scanning. Optionally add **Export to Excel** aligned with other reports (columns match visible data or a documented superset). Permissions unchanged; **i18n** for new UI strings. Align date boundaries and timezone display with existing attendance APIs and tenant expectations.

## High-level instructions for coder

- Reuse the Working plan **existing user/staff dropdown** as the single source of selection for planned-vs-clocked metrics for the current page context (date range / week as the screen already defines).
- Implement a **collapsible section** (default collapsed) for the planned-vs-clocked UI; expand/collapse must work reliably.
- Surface **summary totals** for the selected period/worker (and include them in export if Excel is implemented).
- If adding Excel export, follow patterns used elsewhere in the app for exports and column naming.
- Add/update translations for any new user-visible strings.
- Confirm behaviour with existing backend contracts for working plan and attendance; do not weaken authorization.
