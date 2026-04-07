# Spanish monthly time record (registro horario) Excel export — spec

## GitHub Issues
- [github.com/satisfecho/pos/issues](https://github.com/satisfecho/pos/issues)
- `gh issue list --repo satisfecho/pos --state open --limit 40`
- Optional: `--json number,title,labels,updatedAt,url`
- **Issue:** https://github.com/satisfecho/pos/issues/170

## Problem / goal
Deliver a **Spanish-style monthly “registro horario”** export as **`.xlsx`** that follows the **official paper-style layout** as closely as product data allows. This is **additive**: keep the existing “one row per work session” attendance export unless product explicitly replaces it; prefer a **new export type** or file so there is no silent regression.

Per employee and calendar month, the workbook should include:

- **Header:** company name, CIF/NIF, workplace/center, CCC (or equivalent), and other legal header fields — populated from tenant/company settings where they exist; otherwise leave cells blank but preserve rows/labels. **Employee:** employee number (from user profile when configured) and full name. **Period:** month/year of the export.
- **Daily grid (one row per calendar day 1…28/29/30/31):** weekday/date column suitable for Spanish locale; **planned** shift blocks (morning/afternoon entry-exit or equivalent) when schedule data exists, else empty; **actual** clocked blocks from **closed work sessions** (and breaks) aggregated per calendar day, with display rules documented in code comments if non-obvious; **signature column on every day row** (cells empty for ink on paper — never omit the column).
- **Footer:** monthly total hours per defined business rule; optional rows for employee/company signature placeholders (empty cells).
- **Optional static legal/footer text** in Spanish (e.g. reference to RD-ley 8/2019) if product wants parity with paper forms.

**Data / Excel quality:** extend tenant/user schema if CIF, CCC, etc. are required but missing; respect tenant timezone when aggregating sessions; empty days still get a row (product decision: blank vs “—” but be consistent); column widths so headers are not truncated; hours as decimals with locale-appropriate separators or consistent `hh:mm`.

**Acceptance:** download is `.xlsx` with **signature column on every daily row** (always empty); clarify one sheet per employee per month vs one workbook per employee to match UI (multi-staff may need multiple sheets). **Out of scope:** capturing real digital signatures — only empty cells.

## High-level instructions for coder
- Locate existing **attendance / monthly / Excel** export paths (reports API and UI) and add a **distinct** export entry point or file type for this template; keep the legacy session-based export unless explicitly superseded.
- Map **tenant** and **user** fields to header block; add or migrate DB fields only where needed for legal header data (CIF, CCC, etc.), with migrations and tenant scoping consistent with the rest of the app.
- Implement **per-day aggregation** of work sessions (and breaks) in tenant timezone; integrate **planned** shifts from working plan when available; document non-obvious split rules (e.g. morning vs afternoon columns) in code comments.
- Build the **Excel** with stable column layout, signature column on **each** day row, footer totals, and optional legal text block; set column widths and number/date formats appropriately for Spanish locale expectations.
- Add or extend tests (backend and/or smoke) so the new export generates valid `.xlsx` and does not break existing export routes.
- See `docs/` for reports, attendance, and tenant settings patterns if present; align with i18n and security rules (no secrets in exports).

## Testing instructions

1. **Migrate:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.migrate` (expect **`20260407120000_tenant_ccc`** applied).
2. **Backend:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest tests/test_registro_horario_excel.py tests/test_attendance_excel.py -q`
3. **Manual:** Log in as a user with **`report:read`**, open **Reports**, pick a month with attendance (or select staff), click **Download registro horario (ES)** — file `registro_horario_YYYY_MM.xlsx` should open with one sheet per employee, **Firma del empleado** column on each day row, header/totals/footer. Optionally set **Settings → Business → CCC** and confirm it appears in the export header.
4. **Frontend build:** After `front/` edits, `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` — no Angular/TS errors.
