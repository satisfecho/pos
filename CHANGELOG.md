# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions are listed **newest first**. Entries use **past tense**, one line per item where possible, and emphasize **user-visible impact**. Issue numbers in parentheses point to GitHub when they add context.

**Versioning:** [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`): incompatible API or behavior → major; backward-compatible features → minor; fixes and small improvements → patch.

## [Unreleased]

### Added

- Google Review settings: i18n strings for public review description and instructions; settings screen uses proper labels for clarity (#176).
- Cursor agent loop: `agents2/pos-cursor-loop.sh` orchestrator (local reviewer timestamp file under `agents2/001-gh-reviewer/` is gitignored).

### Changed

- Orders / tables: staff **mark paid** and **finish order** no longer cleared `bill_requested_at`, so after **unmark paid** the floor plan still showed **payment pending** when a bill had been requested (#190).
- Tables floor plan: payment chip on the SVG aligned with the bottom of the table shape; pill and label scale on very small shapes (#188).
- Landing: removed the **For restaurant staff** block and **Create staff account** CTA; **For guests** card centered with a max width (#183). Hero inner container widened for large viewports (#181). Staff panel hint merged into main copy; removed redundant hint key (#182).
- Orders: while a **line-item** status menu is open, the order card uses the same elevation as the order-level menu so dropdowns are not covered by the next card (#179).
- Staff tables: joined groups appear as **one list row** and **one tile**; **Activate** / **Open menu** warn when another group member has a session or order; optional activity badges and floor-plan dot (#174).
- Public booking page: stronger frosted hero panel; **Website** link gets a normalized `https://` URL and hostname as link text (#173).
- Tables canvas: on load and when switching floors, the view **fit and centered** tables with padding; **Reset** uses the same logic; repeat refreshes no longer reset pan/zoom (#172).
- Agent tooling: `scripts/agent-ollama-log-triage.sh` defaults `OLLAMA_HOST` to `http://127.0.0.1:11434` (override if Ollama is not local).
- Local dev proxy (`zz_cursor-agents-do-not-use/proxy.py`): default upstream `http://127.0.0.1:11434`, listen port `12345`.
- Documentation: `AGENTS.md` now prefers shell commands over ad hoc TypeScript execution for tooling.
- Agent tooling: GitHub sweep reviewer log updated (`agents2/001-gh-reviewer/time-of-last-review.txt`).

### Fixed

- Tables / payments: `GET /tables/with-status` preserves **`payment_status: pending`** when kitchen orders are ready or completed and a bill was still relevant; improved detection of active order and `bill_requested_at` (#189).
- Tables / reservations: **POST /tables/{id}/close** marks **seated** reservations **finished** like the finish-reservation flow, so tables are not shown occupied only due to an old seated booking (#184).
- Tables: **DELETE /tables/{id}** no longer blocked after orders were soft-deleted; soft-delete clears `order.table_id` (migration + canvas queries ignore soft-deleted orders for “open order” checks) (#180).
- API: when PostgreSQL is unreachable, DB-backed endpoints return **503** with JSON **`detail`** instead of a generic **500**.
- English locale: restored full `front/public/i18n/en.json` after a fragment had broken the UI (#178).
- Frontend: `TenantSummary` in `api.service.ts` extended to match the backend (`take_away_table_token`, reservation fields), fixing template compile errors on book and reservation views.
- Reports: monthly attendance Excel — staff filter hint appears above the dropdown (#171). Attendance Excel with **`staff_ids`** no longer returned 500 (Excel styling no longer shadowed `sqlmodel.col`) (#168).

## [2.0.75] - 2026-04-14

### Changed

- Tables floor plan: **`GET /tables/with-status`** exposes **`payment_status`** (`none` | `pending` | `paid`) and keeps **`operational_status`** for **kitchen / service** only. Table fill and legend reflect service state; **payment** uses a **bottom chip** on each table SVG. **`bill_requested_at`** drives **`pending`**; a still-referenced **paid** order can show **`paid`**. Joined groups merge **`payment_status`** like **`operational_status`**. Frontend `CanvasTable.payment_status`, i18n **`TABLES.PAYMENT_*`** / **`TABLES.LEGEND_PAYMENT_*`**. Tests: **`back/tests/test_tables_with_status_operational.py`** (#187).
