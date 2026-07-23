# Index 0027 menu-images troubleshooting in docs/README

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`docs/0027-amvara9-menu-images-troubleshooting.md`** is the amvara9 ops guide for public menu / catalog `/api/uploads/…` 404s, but **`docs/README.md`** Deployment & operations never lists it. Operators scanning the index after image outages only see HAProxy/CSS/deploy docs and may re-open StaticFiles theories. Sibling **`NEW-0-20260722-1420-refresh-0027-…`** owns the status banner / verify commands — not the README index.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T18:16Z: `SIGNAL docs_stale×14` owned for listed basenames; **0027** is age >90d and **absent from docs/README** (`rg` no `0027` / `menu-images`)
- Related open: catalog missing-on-disk **`NEW-0-20260604-1325-…`** (product/data); this task is **index-only**
- `demo_tables_check=ok`; NEW backlog deep — one README row

## High-level instructions for coder

- In **`docs/README.md` Deployment & operations**, add one row for **`0027-amvara9-menu-images-troubleshooting.md`**: public menu/catalog image 404s on amvara9, explicit upload routes vs missing-on-disk
- Optional short cross-link from **0026** / **0004** blurbs (“see also 0027 for uploads 404”) — one phrase max
- Documentation index only; no product code; leave body refresh to **1420**
- Pass/fail: `rg -n '0027|menu-images-troubleshooting' docs/README.md` hits Deployment; link resolves
