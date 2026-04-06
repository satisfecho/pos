# Monthly per-employee attendance Excel (legal-style timesheet)

## GitHub Issues
- [github.com/satisfecho/pos/issues](https://github.com/satisfecho/pos/issues)
- `gh issue list --repo satisfecho/pos --state open --limit 40`
- Optional: `--json number,title,labels,updatedAt,url`
- **Issue:** https://github.com/satisfecho/pos/issues/165

## Problem / goal
Implement a feature to generate monthly per-employee attendance reports in Excel format, adhering to legal-style timesheet requirements.

## High-level instructions for coder
- Research legal requirements for employee attendance/timesheet exports in the relevant jurisdiction (or follow specific patterns if provided in issue).
- Implement backend logic to aggregate attendance data per employee for a given month.
- Integrate an Excel generation library (e.g., `XlsxWriter` or `openpyxl`) to create the formatted spreadsheet.
- Create an API endpoint to trigger the export.
- Add a frontend component/button for staff/admin to download these reports.
- Ensure the export includes necessary columns (date, clock-in, clock-out, breaks, total hours, etc.).

## Implementation Plan

### 1. Backend (Python/FastAPI)
- **Models**:
    - Add `employee_number: str | None` to `User` model.
- **Routes**:
    - Use `back/app/attendance_routes.py` for the new endpoint `GET /attendance-excel`.
    - Endpoint params: `year: int`, `month: int`.
    - Logic:
        - Fetch all `WorkSession` for the tenant in the specified month.
        - Group by `User`.
        - For each user, iterate through their sessions in that month.
        - Calculate: `Clock-In`, `Clock-Out` (or "OPEN"), `Breaks (min)`, `Net Hours`.
        - Use `openpyxl` to generate the Excel file.
        - Ensure column headers are localized (using `report_export_i18n.py` if possible, or just standard names for now).
- **Excel Formatting**:
    - Bold header row.
    - Center-align numeric columns.
    - One row per session, but only show `User Name` on the first row of their sessions to make it readable.

### 2. Frontend (Angular)
- **Reports Page**:
    - Add a section for "Attendance Export".
    - Add a Year/Month picker.
    - Add a "Download Excel" button.
    - Ensure only users with `REPORT_READ` permission can see/use it.
- **I18n**:
    - Add translation keys for the new report section and Excel headers.

### 3. Testing
- **Backend**:
    - Verify the endpoint returns a valid `.xlsx` file.
    - Check that data matches `WorkSession` records in the DB.
- **Frontend**:
    - Verify the UI displays the picker and button correctly.
    - Verify the download works and the file is received.

## Testing instructions
1. Run the backend and ensure `openpyxl` is installed.
2. Use `curl` or a tool like Postman to call `GET /api/attendance-excel?year=2026&month=4` with an authenticated session.
3. Check if the downloaded file has the correct structure.
