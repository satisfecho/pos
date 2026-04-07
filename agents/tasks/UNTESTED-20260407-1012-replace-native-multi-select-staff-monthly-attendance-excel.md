# Replace native HTML multi-select for Staff (optional) on Monthly attendance (Excel) export

## GitHub Issues
- [github.com/satisfecho/pos/issues](https://github.com/satisfecho/pos/issues)
- `gh issue list --repo satisfecho/pos --state open --limit 40`
- Optional: `--json number,title,labels,updatedAt,url`
- **Issue:** https://github.com/satisfecho/pos/issues/169

## Problem / goal
The Monthly attendance Excel export screen uses a visible native `<select multiple>` listbox for optional staff filtering. It uses a lot of vertical space and feels inconsistent with a compact month picker plus download button.

Replace it with a **single-line, collapsible** control that opens a panel on click/focus. When closed, it must clearly show selection state (e.g. “All staff” / “Everyone” / “N selected” or chips with names). Behavior must match today: **empty selection** = everyone with attendance that month; **specific users** = filter to those only.

## High-level instructions for coder
- **Stack:** This repo’s frontend is **Angular** (not React/Vue); use existing shared UI patterns and components where possible; if the issue text mentions other frameworks, follow the Angular codebase instead.
- Implement a compact **dropdown-style multi-select** (or combobox pattern) with scrollable list, checkboxes or toggle rows; optional search if low effort and staff lists can grow.
- **Accessibility:** keyboard open/close, focus management, Space/Enter to toggle, proper `aria-*` and association with the “Staff (optional)” label.
- **API / form:** Preserve the same field names and values as the current multi-select so the export request and backend contract stay unchanged.
- **Visual:** Align with the surrounding form (month input, Download Excel): spacing, typography, border radius.
- **Copy:** Keep or shorten the helper hint; do not rely on “Ctrl/Cmd to select multiple” (native multi-select only).
- **Done:** No tall native listbox; compact control; exports still work filtered and unfiltered.

## Implementation notes (coder)
- **Reports** (`front/src/app/reports/reports.component.*`): Staff filter is a button + panel with checkboxes; search field when tenant has **more than 10** users. `attendanceExcelStaffFilterIds` still drives `GET /reports/attendance-excel` `staff_ids` (unchanged). New i18n: **`REPORTS.ATTENDANCE_EXCEL_STAFF_SUMMARY_*`**, **`REPORTS.ATTENDANCE_EXCEL_STAFF_SEARCH_PLACEHOLDER`**; hint keys updated (no Ctrl/⌘). Trigger: **`data-testid="attendance-excel-staff-trigger"`**.

---

## Testing instructions

### What to verify
- Monthly attendance (Excel) block shows a **single-line** staff control (no tall multi-select listbox).
- **All staff** summary when nothing is selected; **one name** when exactly one user is checked; **“N selected”** (translated) when multiple.
- **Download Excel** still works with **no** staff selection (all with attendance) and with **one or more** staff selected (filtered export).
- **Search** appears only when there are **more than 10** staff users; filtering the list does not change selection until checkboxes are toggled.
- **Keyboard:** **Enter** / **Space** on the trigger toggles the panel; **Escape** closes it; click outside closes.
- Helper text no longer mentions Ctrl/⌘ multi-select.

### How to test
- Stack: `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (HAProxy e.g. **4202**).
- **Smoke:** `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` (sanity).
- **Reports page:** Owner/admin with `report:read`, e.g.  
  `cd front && BASE_URL=http://127.0.0.1:4202 LOGIN_EMAIL=… LOGIN_PASSWORD=… npm run test:reports`  
  (from **`docs/testing.md`** / script **`front/scripts/test-reports.mjs`**).
- **Manual:** `/reports` → **Monthly attendance (Excel)** → open staff control (`[data-testid="attendance-excel-staff-trigger"]`), toggle checkboxes, **Download Excel**; optional DevTools **Network**: `GET /api/reports/attendance-excel?...` should include repeated `staff_ids` only when specific users are selected.

### Pass / fail criteria
- **Pass:** UI matches the above; `test:reports` passes; no Angular errors in `docker compose … logs --tail=80 front`.
- **Fail:** Native `<select multiple>` still used, export ignores selection, build errors, or regressions on `/reports`.
