# Index platform operator Puppeteer smoke in testing.md + npm script

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`front/scripts/test-platform-operator.mjs` already exists (login → `/platform` metrics) and was used to verify the platform portal, but **`docs/testing.md`** and **`front/package.json`** do not list it. Agents and humans cannot discover the smoke the way they do for paywall, courier, or delivery scripts.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23: `rg` on `docs/testing.md` and `front/package.json` — no `platform-operator` / `test:platform` entries
- Script present: `front/scripts/test-platform-operator.mjs` (defaults `PLATFORM_OPERATOR_EMAIL` / `PLATFORM_OPERATOR_PASSWORD`; seed via `python -m app.seeds.ensure_platform_operator`)
- Sibling hygiene already queued for courier/delivery: **`NEW-0-20260722-1142-index-courier-delivery-smokes-in-testing-doc.md`** — do not merge; this task is platform-only
- Related enhancement (separate): **`FEAT-0-20260723-0639-platform-operator-delivery-public-link.md`** may extend the smoke later; indexing the current script should not wait on that FEAT

## High-level instructions for coder

- Add an npm script alias in **`front/package.json`** (e.g. `test:platform-operator` → `node scripts/test-platform-operator.mjs`), matching existing `test:*` style
- Index the script in **`docs/testing.md`** (table + short how-to): `BASE_URL`, `PLATFORM_OPERATOR_EMAIL` / `PLATFORM_OPERATOR_PASSWORD`, and seed command `docker compose … exec back python -m app.seeds.ensure_platform_operator`
- Point to **`docs/0015-platform-operator-portal.md`** (or **0055** if renumbered) for portal overview
- Do not invent a new smoke in this task unless the index reveals the script is broken — then fix minimally
- Pass/fail: `npm run test:platform-operator --prefix front` is documented; `docs/testing.md` lists it; readonly grep finds the alias
