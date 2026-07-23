# Index 0051 table-groups MVP in docs/README

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`docs/0051-table-groups-mvp.md`** documents floor-plan join/unjoin (combined seats, reservation pool) — distinct from restaurant multi-location groups (**0054**). It is on disk and referenced from closed join-UX work, but **`docs/README.md`** never lists it under Feature guides. Agents scanning the index can confuse **0054** restaurant groups with table groups, or miss the MVP doc entirely. Sibling **`NEW-0-20260722-1412-mark-0051-table-groups-shipped`** owns a shipped banner only — not a README row.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T18:24Z: `SIGNAL docs_stale×14` + `changelog_sparse` already owned; `demo_tables_check=ok`; NEW backlog≈88
- `rg` on **`docs/README.md`**: Feature guides has **0054** restaurant groups; no hits for `0051` / `table-groups`
- File on disk: **`docs/0051-table-groups-mvp.md`**
- Do **not** merge with **0054** Quick links / Feature guides NEWs (different feature)

## High-level instructions for coder

- In **`docs/README.md` Feature guides**, add one row for **`0051-table-groups-mvp.md`**: floor-plan table join/unjoin, combined seats, reservation pool (MVP; distinguish from **0054** restaurant groups)
- Index only; no product code; leave body/status banner to **1412** if still open
- Pass/fail: `rg -n '0051|table-groups-mvp' docs/README.md` under Feature guides; link resolves; blurb does not conflate with 0054
