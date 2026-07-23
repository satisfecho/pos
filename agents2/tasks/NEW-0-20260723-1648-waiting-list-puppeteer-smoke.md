# Add Puppeteer smoke for waiting list (public + staff)

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Tenant waiting list shipped (public `/waitlist/:tenantId`, staff Reservations → Waitlist tab, platform public link), but **`front/scripts/`** has **no** dedicated Puppeteer smoke and **`docs/testing.md`** does not index one. Regressions on join/list/status would only be caught by manual QA or pytest, unlike delivery/paywall/platform smokes.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23: `SIGNAL docs_stale×14` owned; `demo_tables_check=ok`; Unreleased filled; improvement theme from docs-vs-code scan (shipped feature without front smoke)
- `rg` on `front/scripts/*.mjs` / `front/package.json` / `docs/testing.md`: no waiting-list / waitlist smoke
- Routes/UI exist: `waitlist-public` (`/waitlist/:tenantId`); staff `reservations` viewTab `'waitlist'`; API `GET/POST /waiting-list`, public `POST /public/tenants/{id}/waiting-list`
- Out of scope / do not duplicate: doc-only waitlist branding (**`NEW-0-20260722-1359-align-0028-…`**), SQL table name (**`NEW-0-20260722-1226-postgres-adhoc-sql-waiting-list-table`**), archived user-guide CLOSED task — this task is **smoke + testing.md index only**

## High-level instructions for coder

- Add **`front/scripts/test-waiting-list.mjs`** (or similar) following existing Puppeteer helpers (`puppeteer-headless.mjs`, env `BASE_URL` / `LOGIN_*` / optional `TENANT_ID`)
- Cover at least: (1) public page loads for tenant 1 and accepts a guest join (or clear empty-state + form visible); (2) staff login → Reservations → Waitlist tab lists or refreshes without console/network hard fail
- Prefer idempotent data (unique phone/name suffix) or clean up; do not depend on production-only secrets
- Add `test:waiting-list` (or matching name) to **`front/package.json`** and a short row in **`docs/testing.md`**
- Pass/fail: `npm run test:waiting-list --prefix front` exits 0 against local HAProxy; script is discoverable from `docs/testing.md`
