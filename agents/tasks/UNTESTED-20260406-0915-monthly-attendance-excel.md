# Monthly per-employee attendance Excel (legal-style timesheet)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/165

## Status
Implementation complete (backend + Reports UI). Renamed to **UNTESTED-** for tester.

## What was done
- **Backend (already in repo):** `GET /reports/attendance-excel` in `back/app/attendance_routes.py` (mounted under `/api` via HAProxy). Monthly XLSX via **openpyxl**; columns include employee number, name, date, clock in/out, breaks (min), net hours, notes; `User.employee_number` optional.
- **Frontend:** Reports page (`front/src/app/reports/reports.component.*`) — section **Monthly attendance (Excel)** for users with **`report:read`**: `type="month"` picker, **Download Excel** calls `ApiService.getReportsAttendanceExcel`. Errors: **404** → no rows for month; other errors parsed from JSON blob when possible. **`data-testid="reports-attendance-excel"`** for Puppeteer.
- **API:** `getReportsAttendanceExcel(year, month)` in `front/src/app/services/api.service.ts`.
- **i18n:** `REPORTS.ATTENDANCE_EXCEL_*` in all `front/public/i18n/*.json`.
- **Smoke:** `front/scripts/test-reports.mjs` asserts the attendance Excel block is present.
- **CHANGELOG:** `[Unreleased]` entry for the Reports UI.

## Testing instructions

### What to verify
- Reports page shows **Monthly attendance (Excel)** when the user has **`report:read`**.
- Choosing a month and **Download Excel** returns `attendance_YYYY_MM.xlsx` or shows a clear error if there is no data for that month.
- Puppeteer reports smoke test still passes.

### How to test
- Stack: `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (HAProxy e.g. **4202**).
- **Puppeteer:** from repo root, with an owner/admin account:
  `BASE_URL=http://127.0.0.1:4202 LOGIN_EMAIL=… LOGIN_PASSWORD=… npm run test:reports --prefix front`
- **Manual:** Log in → **Reports** → set month → **Download Excel**; open file in Excel/LibreOffice.
- **API (optional):** with session cookie or Bearer token:
  `curl -f -o /tmp/a.xlsx -H "Cookie: …" "http://127.0.0.1:4202/api/reports/attendance-excel?year=2026&month=4"`  
  (or hit backend `8020` directly in dev.)

### Pass/fail criteria
- **Pass:** Test script exits 0; download yields a valid `.xlsx` when work sessions exist for the month, or UI shows **no data** message when none.
- **Fail:** Missing section for `report:read` user, broken build, or download/API error without message for common cases.
