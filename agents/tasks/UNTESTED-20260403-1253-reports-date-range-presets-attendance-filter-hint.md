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

## Implementation notes
- **Separate attendance-only date range:** Not implemented; sales and attendance share the header **From** / **To** and **Refresh** (same as before).
- **This week:** Monday–Sunday in the **local** calendar containing today.

## Testing instructions
1. Stack up (e.g. Docker dev on **4202**). Owner/admin with **`report:read`**.
2. **`npm run test:reports --prefix front`** with `BASE_URL=http://127.0.0.1:4202`, `LOGIN_EMAIL` / `LOGIN_PASSWORD` — expects **`[data-testid="reports-date-presets"]`** and ≥5 preset buttons; existing by-product layout checks unchanged.
3. Manual: open **Reports**; click each preset; confirm **From** / **To** match the preset (spot-check **Today** = same date; **Last 7 days** = 7-day inclusive window ending today); data reloads without an extra **Refresh** click.
4. Manual: confirm **Staff attendance (clock in/out)** hint mentions header dates and **Refresh** (translated per locale).
5. **`docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front`** — no Angular/TS errors after edits.
