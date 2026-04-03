# Reports: date-range presets + attendance filter hint

## GitHub Issues
- [github.com/satisfecho/pos/issues](https://github.com/satisfecho/pos/issues)
- `gh issue list --repo satisfecho/pos --state open --limit 40`
- Optional: `--json number,title,labels,updatedAt,url`
- **Issue:** https://github.com/satisfecho/pos/issues/161

## Problem / goal
Improve the Reports screen with quick date-range presets (Today, Last 7 days, This week, This month, Previous month) that set `fromDate` / `toDate` as local calendar dates (`YYYY-MM-DD`) and trigger the same data reload as **Refresh** (sales report + work-sessions list). Add a short hint above the staff attendance section explaining that the historical attendance table follows the header date range and **Refresh**. Optionally allow a separate from/to (and load) for attendance only so sales and attendance ranges can diverge; if done, wire `getReportWorkSessions` to that range and document it in the hint. Add `REPORTS.*` i18n keys across `front/public/i18n/*.json`. See **docs/** for reports/i18n conventions if present.

## High-level instructions for coder
- Locate the Reports component and existing date inputs, refresh flow, and `getReportWorkSessions` / sales report loading.
- Implement preset controls (buttons or select) that set both dates in local calendar terms and invoke the same reload path as **Refresh**.
- Add the attendance-section hint (and optional second date range + wiring) per issue; keep UX consistent with existing Reports styling.
- Add translation keys for all new user-visible strings in every locale file under `front/public/i18n/`.
- Smoke-test Reports after changes (e.g. relevant Puppeteer or manual: presets, refresh, attendance table).
