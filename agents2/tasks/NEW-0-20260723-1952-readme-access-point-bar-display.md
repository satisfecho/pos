# Add Bar display Access Point to root README

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Root **`README.md` Features** already lists **Kitchen** and **Bar** displays, and the app serves **`/bar`**, but **Access Points** only has a Kitchen row. Operators and agents copying URLs for beverage-station demos miss `/bar` and open `/kitchen` by habit.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T19:52Z: SIGNAL stale-doc basenames already owned; not a bulk `docs/*.md` rewrite
- README Access Points (~L117–130): `Kitchen display` → `/kitchen`; no `/bar`
- Features Staff navigation (~L51): “**Kitchen** and **Bar** displays”
- Route: `app.routes.ts` → `path: 'bar'` (same kitchen-display component, `view: 'bar'`)
- Sibling **`NEW-0-20260723-0716-refresh-kitchen-display-doc-delivery`** owns **`docs/0015-kitchen-display.md`** body only — do **not** merge; this task is README Access Points only

## High-level instructions for coder

- In **`README.md` Access Points**, add one row for Bar display, e.g. `http://localhost:4202/bar` (next to Kitchen)
- Optional: one-word note that it is the beverage-station view of the kitchen display — no new feature doc
- Do not edit **`docs/0015`** here (sibling owns delivery/status refresh)
- Pass/fail: `rg '/bar' README.md` hits Access Points; no product code
