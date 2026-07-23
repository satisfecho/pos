# Index five aliased Puppeteer smokes missing from docs/testing.md

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`front/package.json` already exposes **`test:settings-logo`**, **`test:support-access`**, **`test:kitchen-timer`**, **`test:book-whatsapp`**, and **`test:my-shift-clock-qr`**, but **`docs/testing.md`** does not list them. Agents and humans following the testing index miss durable smokes for Settings logo upload, support-user flows, kitchen timer, book WhatsApp CTA, and my-shift clock QR.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23: `SIGNAL docs_stale×14` all owned; demo_tables_check=ok; NEW backlog=56 — this is **index-only**, not a bulk docs rewrite
- `rg` on `docs/testing.md`: no hits for `settings-logo`, `support-access`, `kitchen-timer`, `book-whatsapp`, or `my-shift-clock`
- Scripts + aliases already exist under `front/scripts/` / `front/package.json`
- Sibling NEWs own other gaps: **`NEW-0-20260722-1142-index-courier-delivery-smokes-in-testing-doc`** (courier/delivery), **`NEW-0-20260723-0639-index-platform-operator-smoke-testing-doc`** (platform) — do **not** merge; this task is the five aliased orphans only

## High-level instructions for coder

- Add short Test-scripts table rows (and brief how-to bullets if the file’s pattern requires them) in **`docs/testing.md`** for:
  - `npm run test:settings-logo --prefix front` → `test-settings-logo-upload.mjs` (`LOGIN_EMAIL` / `LOGIN_PASSWORD`)
  - `npm run test:support-access --prefix front` → `test-support-access.mjs` (admin/owner login)
  - `npm run test:kitchen-timer --prefix front` → `test-kitchen-timer.mjs`
  - `npm run test:book-whatsapp --prefix front` → `test-book-whatsapp-puppeteer.mjs` (public book; note `API_BASE` if needed)
  - `npm run test:my-shift-clock-qr --prefix front` → `test-my-shift-clock-qr.mjs` (waiter + optional `OWNER_EMAIL`)
- Documentation only — do not invent new Puppeteer flows; do not change `package.json` aliases
- Pass/fail: `rg` finds each `test:` name in `docs/testing.md`; a reader can copy-paste a working command from the header comments of each script
