# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Agents (agents2):** `pos-cursor-loop.sh` orchestrator (Cursor agent loop; reviewer state file **`time-of-last-review.txt`** under `agents2/001-gh-reviewer/` is **gitignored**, local only). Root `run-agents.sh` runs the goose-based agent pipeline (`agents/001` … `agents/040-committer`).
- **Task file (GitHub #177):** `agents2/tasks/WIP-177-20260408-1339.md` (Google review link / i18n work in progress).

- **Settings → Google Review (GitHub #176):** Added i18n keys for public Google review description and instructions. Updated settings UI to show these as labels instead of just descriptions for better clarity.
- **AGENTS.md:** Updated tool preference instruction (prefer shell commands over Execute_typescript).

### Changed

- **Agent 001 local LLM triage:** `scripts/agent-ollama-log-triage.sh` defaults **`OLLAMA_HOST`** to **`http://127.0.0.1:11434`** so Ollama fallback targets the local daemon (consistent with `agents2/pos-cursor-loop.sh` availability checks). Override **`OLLAMA_HOST`** if the daemon is not on localhost.

- **Landing (GitHub #183):** Removed the **For restaurant staff** panel and **Create staff account** CTA; the **For guests** card is centered with a max width. Dropped unused `LANDING.SECTION_TEAM*`, `LANDING.TEAM_REGISTER` keys from all shipped locales. **`front/src/app/landing/landing.component.ts`**, **`front/public/i18n/*.json`**.

- **Landing hero (GitHub #181):** Inner hero wrapper (`.landing-hero__inner`) **`max-width`** increased from **42rem** to **50rem** so headline and intro stay readable on very wide viewports. **`front/src/app/landing/landing.component.ts`**.

- **Landing (GitHub #182):** Staff panel: removed the extra hint paragraph under the register CTA; merged new/returning guidance into `LANDING.SECTION_TEAM_LEDE` and dropped `LANDING.SECTION_TEAM_HINT` from all locales. **`front/src/app/landing/landing.component.ts`**, **`front/public/i18n/*.json`**.

- **Orders (GitHub #179):** While a **line-item** status menu is open, the order card now gets the same `status-dropdown-open` elevation as the order-level status menu, so dropdowns are not covered by the next card in the grid. **`front/src/app/orders/orders.component.ts`**.

- **Local dev proxy (`zz_cursor-agents-do-not-use/proxy.py`):** Default upstream **`http://127.0.0.1:11434`** (Ollama) and listen **port `12345`** (was 8080 / 8081).

- **Staff tables list & tiles (GitHub #174):** Joined table groups show as **one list row** and **one tile card** per group (combined names and seat total; expand list rows for per-table actions). **Activate** / **Open menu** warn when another group member already has a session or open order; optional **activity** badges and a **floor-plan dot** for the same case. i18n: **`TABLES.GROUP_*`**. Files: **`front/src/app/tables/tables.component.ts`**, **`front/src/app/tables/tables-canvas.component.ts`**, **`front/public/i18n/*.json`**.

- **Public booking page (GitHub #173):** Hero **`hero-content-panel`** uses stronger **frosted glass** (blur, inset highlight, darker tint with header image), **horizontal padding** on the hero column, and **text shadow** on title/tagline over photos. **Website** link: **normalized `https://` href** when the setting omits a scheme, **hostname as link text**, external-link icon, tooltip (`title`), **`focus-visible`** ring. **`front/src/app/book/book.component.{ts,html,scss}`**.

- **Tables / floor plan (GitHub #172):** On first load and when switching floors (or after adding a floor / deleting the current floor), the canvas **fits and centers** all tables on that floor with padding; empty floors show the full canvas at 1×. The **reset** control uses the same fit logic. Repeated `loadData` refreshes (e.g. after join) no longer reset pan/zoom. **`front/src/app/tables/tables-canvas.component.ts`**.

- **Agents:** Recorded latest **`001-log-reviewer`** sweep in **`agents/001-log-reviewer/time-of-last-review.txt`**.

### Removed

- **`agents2/tasks/UNTESTED-177-20260408-1339.md`** (superseded by the WIP task file for #177).

### Fixed

- **Tables (GitHub #180):** Deleting a table no longer fails after orders were soft-deleted in the UI. **`DELETE /tables/{id}`** only treats **active** orders as blocking; soft-delete clears **`order.table_id`** (migration makes the column nullable and backfills existing soft-deleted rows). Canvas / join-table queries ignore soft-deleted orders when detecting open orders.

- **API:** When PostgreSQL is unreachable or closes the connection, endpoints that use the DB (e.g. **`GET /public/tenants`**) now return **503** with a JSON **`detail`** instead of a generic **500**, so operators and clients can tell **service unavailable** from application bugs.

- **English locale (GitHub #178):** Restored full **`front/public/i18n/en.json`**. A prior chore commit had replaced it with a tiny fragment, so English showed **raw translation keys** (`NAV.*`, `AUTH.*`, etc.) while other locales worked.

- **Frontend public tenant type:** `TenantSummary` in **`front/src/app/services/api.service.ts`** now includes **`take_away_table_token`** and reservation fields (**`reservation_prepayment_*`**, **`reservation_cancellation_policy`**, **`reservation_arrival_tolerance_minutes`**, **`reservation_dress_code`**) to match the backend, fixing Angular compile errors on book and reservation-view templates.

- **Reports → Monthly attendance Excel (GitHub #171):** Staff filter hint is shown **above** the staff dropdown (template order: label → hint → control); no i18n changes.

- **Reports / attendance Excel (GitHub #168):** `GET /reports/attendance-excel` with **`staff_ids`** no longer returns 500 — the Excel styling loop no longer shadows **`sqlmodel.col`**. Regression coverage: **`tests/test_attendance_excel.py`**.

