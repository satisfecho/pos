# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Settings → Google Review (GitHub #176):** Added i18n keys for public Google review description and instructions. Updated settings UI to show these as labels instead of just descriptions for better clarity.
- **AGENTS.md:** Updated tool preference instruction (prefer shell commands over Execute_typescript).

### Changed

- **Staff tables list & tiles (GitHub #174):** Joined table groups show as **one list row** and **one tile card** per group (combined names and seat total; expand list rows for per-table actions). **Activate** / **Open menu** warn when another group member already has a session or open order; optional **activity** badges and a **floor-plan dot** for the same case. i18n: **`TABLES.GROUP_*`**. Files: **`front/src/app/tables/tables.component.ts`**, **`front/src/app/tables/tables-canvas.component.ts`**, **`front/public/i18n/*.json`**.

- **Public booking page (GitHub #173):** Hero **`hero-content-panel`** uses stronger **frosted glass** (blur, inset highlight, darker tint with header image), **horizontal padding** on the hero column, and **text shadow** on title/tagline over photos. **Website** link: **normalized `https://` href** when the setting omits a scheme, **hostname as link text**, external-link icon, tooltip (`title`), **`focus-visible`** ring. **`front/src/app/book/book.component.{ts,html,scss}`**.

- **Tables / floor plan (GitHub #172):** On first load and when switching floors (or after adding a floor / deleting the current floor), the canvas **fits and centers** all tables on that floor with padding; empty floors show the full canvas at 1×. The **reset** control uses the same fit logic. Repeated `loadData` refreshes (e.g. after join) no longer reset pan/zoom. **`front/src/app/tables/tables-canvas.component.ts`**.

- **Agents:** Recorded latest **`001-log-reviewer`** sweep in **`agents/001-log-reviewer/time-of-last-review.txt`**.

### Fixed

- **Frontend public tenant type:** `TenantSummary` in **`front/src/app/services/api.service.ts`** now includes **`take_away_table_token`** and reservation fields (**`reservation_prepayment_*`**, **`reservation_cancellation_policy`**, **`reservation_arrival_tolerance_minutes`**, **`reservation_dress_code`**) to match the backend, fixing Angular compile errors on book and reservation-view templates.

- **Reports → Monthly attendance Excel (GitHub #171):** Staff filter hint is shown **above** the staff dropdown (template order: label → hint → control); no i18n changes.

- **Reports / attendance Excel (GitHub #168):** `GET /reports/attendance-excel` with **`staff_ids`** no longer returns 500 — the Excel styling loop no longer shadows **`sqlmodel.col`**. Regression coverage: **`tests/test_attendance_excel.py`**.

