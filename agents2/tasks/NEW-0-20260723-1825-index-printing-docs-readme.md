# Index PRINTING.md in docs/README

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`docs/PRINTING.md`** holds the kitchen/LAN print-agent design notes (and is cross-linked from kitchen display), but **`docs/README.md`** never lists it. Operators and agents searching the docs index miss the only print reference. Sibling **`NEW-0-20260722-1213-printing-doc-design-status`** owns a top-of-file status banner only — it does not add a README row.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T18:24Z: `SIGNAL docs_stale×14` + `changelog_sparse` already owned; `demo_tables_check=ok`; Unreleased=1 post-2.1.28; NEW backlog≈88
- `stale_doc path=docs/PRINTING.md` still in digest; basename refresh already queued (1213)
- `rg` on **`docs/README.md`**: no hits for `PRINTING`
- File on disk: **`docs/PRINTING.md`**

## High-level instructions for coder

- In **`docs/README.md` Reference & notes** (or Other), add one row for **`PRINTING.md`**: restaurant LAN / kitchen ticket printing design notes; **not implemented** in current POS (browser/invoice print is supported today)
- Index only; do not rewrite PRINTING body (leave banner to **1213** if still open); no product code
- Pass/fail: `rg -n 'PRINTING' docs/README.md` hits; link resolves
