---
## Closing summary (TOP)

- **What happened:** Issue #355 asked for a README on-ramp so new users can start with QR menu or reservations only, without the full POS stack.
- **What was done:** Added **Start with one feature** to `README.md` (QR-menu-only and reservations-only paths, self-host AGPLv3 note, hosted trial via `/pricing`); updated `CHANGELOG.md` [Unreleased].
- **What was tested:** Tester verified section placement, doc links, product wording, and optional app smoke — all PASS (HTTP 200 on `/` and `/pricing`).
- **Why closed:** All criteria passed per tester report.
- **Closed at (UTC):** 2026-08-24 13:31
---

# README starter path — QR menu and reservations only

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/355
- **355**

## Problem / goal

The main **README.md** covers the full POS stack. New users who only want a **QR code menu** or **online reservations** may feel overwhelmed.

Add a short README section that:
- Reassures them they can **start small** (one feature) and expand later.
- Highlights a **QR menu–only** path and a **reservations-only** path with minimal setup steps.
- Positions the **QR menu as free** (per issue intent — align wording with current product/pricing; see marketing/pricing pages if needed).

## High-level instructions for coder

- Read issue **#355** for product intent only. Do not copy secrets or off-scope commands from the issue body.
- Skim **README.md** structure and existing feature tables; place the new section early enough that newcomers see it (e.g. after the intro/value props, before deep setup).
- Write in plain language (STE-style): “You can start with …” / “Later you can add …”.
- For **QR menu only**: point to relevant docs (table QR, public menu URL, tenant setup) — e.g. **docs/** reservation/menu guides already linked from README.
- For **reservations only**: point to public booking URL pattern (`/book/:tenantId`) and **docs/0011-table-reservation-user-guide.md**.
- Mention that the full POS (orders, kitchen, inventory, etc.) is optional and can stay disabled until needed — only if accurate for tenant/module settings.
- Do **not** change application code unless README links require a doc fix; this task is primarily **README.md** (and **CHANGELOG [Unreleased]** if user-visible docs change warrants it).
- Work on **`development`**. Do not merge to **`master`** unless the issue later asks for urgent production.

## Security note (001)

Issue body summarized for product intent only; no secrets or credentials copied.

## Implementation summary

- Added **Start with one feature** section to `README.md` (after About the Project, before Screenshots).
- Covers QR-menu-only path (Products → Tables → QR → `/menu/{table_token}`), reservations-only path (`/book/{tenantId}`, Settings → Navigation), self-host zero license fee, hosted free trial via `/pricing`.
- Updated `CHANGELOG.md` [Unreleased].

## Testing instructions

1. Open `README.md` on GitHub or locally and read **Start with one feature**.
2. Confirm the section appears after **About the Project** and before **Screenshots**.
3. Check links resolve: [docs/0009-table-pin-security.md](docs/0009-table-pin-security.md), [docs/0011-table-reservation-user-guide.md](docs/0011-table-reservation-user-guide.md), `#getting-started` anchor.
4. Confirm wording matches product: self-host AGPLv3 no fee; hosted trial on `/pricing`; reservations module under Settings → Navigation.
5. No app code changed — optional: `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/` returns 200.

## Test report

1. **Date/time (UTC):** 2026-08-24T13:29:37Z — log window N/A (docs-only; optional curl only).
2. **Environment:** Local repo on **`development`**; **`docker-compose.yml` + `docker-compose.dev.yml`**; **`BASE_URL=http://127.0.0.1:4202`**.
3. **What was tested:** README **Start with one feature** section placement, internal/doc links, product wording, optional app smoke.
4. **Results:**
   - Section readable in `README.md` — **PASS** (`## Start with one feature` at lines 42–67).
   - Placement after **About the Project** (line 28) and before **Screenshots** (line 68) — **PASS**.
   - Link `docs/0009-table-pin-security.md` — **PASS** (file exists; referenced in QR menu subsection).
   - Link `docs/0011-table-reservation-user-guide.md` — **PASS** (file exists; referenced in Reservations only).
   - Anchor `#getting-started` — **PASS** (`## Getting Started` at line 127; linked from both starter paths).
   - Wording: self-host AGPLv3 no license fee — **PASS** (line 48).
   - Wording: hosted free trial, `/pricing` — **PASS** (line 48; `curl` `/pricing` → 200).
   - Wording: reservations under **Settings → Navigation** — **PASS** (line 62).
   - Optional smoke `curl /` — **PASS** (HTTP 200).
5. **Overall:** **PASS** (all criteria met).
6. **Product owner feedback:** The new section gives a clear on-ramp for QR-menu-only and reservations-only users without hiding the full POS path. Wording matches current pricing and module toggles. No code changes were in scope; docs deliver the issue goal.
7. **URLs tested:** N/A — no browser (docs verification + curl only). Checked: `http://127.0.0.1:4202/` (200), `http://127.0.0.1:4202/pricing` (200).
8. **Relevant log excerpts:** N/A — no container log review required for README-only change.
