# Add Puppeteer smoke for staff guest-feedback page

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Staff **Guest feedback** at **`/guest-feedback`** (Reservations module) is a live ops surface, but the only automated front coverage is **`test:feedback-public-i18n`** for public **`/feedback/:tenantId`**. Regressions on the staff list (empty state, load error, missing table) would not fail CI-style smokes.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T19:43Z: `SIGNAL docs_stale×14` + `changelog_sparse` already owned; `demo_tables_check=ok`; Unreleased=1 post-2.1.29; NEW backlog≈103 — small smoke only
- `front/src/app/app.routes.ts`: `guest-feedback` behind `authGuard` + reservations module
- `rg` on `front/scripts/*.mjs` / `front/package.json`: public i18n smoke only; no staff `/guest-feedback` script
- Sibling **`NEW-0-20260723-1943-readme-access-point-public-feedback`** owns README/0011 pointers — do **not** merge

## High-level instructions for coder

- Add **`front/scripts/test-guest-feedback-staff.mjs`** (or similar) using existing Puppeteer helpers (`puppeteer-headless.mjs`, `BASE_URL`, `LOGIN_*` for a user with reservations access)
- Happy path: login → open `/guest-feedback` → assert page shell (heading / `data-testid` if present / no raw i18n key dump) and that the request does not 500; empty list is OK
- Add `test:guest-feedback-staff` (or similar) to **`front/package.json`** and a short row in **`docs/testing.md`**
- Do **not** reinvent public `/feedback` coverage; do not expand product behaviour
- Pass/fail: `npm run test:guest-feedback-staff --prefix front` exits 0 against local HAProxy; alias listed in `docs/testing.md`
