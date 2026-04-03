# Fix attendance table column overlap on Reports

## GitHub Issues
- [github.com/satisfecho/pos/issues](https://github.com/satisfecho/pos/issues)
- `gh issue list --repo satisfecho/pos --state open --limit 40`
- Optional: `--json number,title,labels,updatedAt,url`
- **Issue:** https://github.com/satisfecho/pos/issues/160

## Problem / goal
On the Reports screen, work-session attendance tables overlap columns (e.g. Adjust/Corregir actions vs IP-related columns) because shared table styles force a fixed four-column layout. The fix should scope aggressive layout rules to revenue tables only and give attendance tables their own layout so columns stay readable on typical viewports.

## High-level instructions for coder
- In `reports.component.scss`, narrow the fixed **4-column** `.report-section .data-table` rules so they apply only to revenue tables (for example exclude tables that use a dedicated class such as `:not(.work-sessions-attendance-table)`).
- Add `.work-sessions-attendance-table` with `table-layout: auto`, `width: max(100%, 52rem)`, and `white-space: nowrap` on body/header cells as needed so text does not collapse into overlaps.
- Add `.work-sessions-actions` for the Actions column (header and cells): minimal width (`width: 1%` or equivalent), right alignment, extra left padding so action labels do not collide with adjacent columns.
- In `reports.component.html`, apply these classes to **both** work-session tables (live “who is on shift” and history) that show attendance/work-session data.
- Remove a duplicate **“Who is on shift now”** block if it is still present in the template after the styling pass.
- Verify in the browser at common widths (and Reports date range that shows rows) that attendance tables no longer overlap; keep revenue report tables visually unchanged unless the issue requires otherwise.
