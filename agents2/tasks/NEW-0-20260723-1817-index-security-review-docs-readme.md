# Index SECURITY-REVIEW.md in docs/README

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`docs/SECURITY-REVIEW.md`** is the living structured security pass (uploads, auth, tenant isolation, public/payment surfaces). **`docs/README.md`** does not link it under Reference, Other, or Quick links, so agents and operators following the docs index miss the review notes that open SECURITY NEWs (waiting-list/groups, TenantProduct delivery) extend. Indexing closes a discoverability gap without rewriting the review.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T18:16Z: `SIGNAL docs_stale` / `changelog_sparse` already owned; `demo_tables_check=ok`; NEW backlog≈85
- `rg` on **`docs/README.md`**: no hits for `SECURITY-REVIEW`
- File on disk: **`docs/SECURITY-REVIEW.md`** (recently touched; open NEWs **1744** waitlist/groups and **1734** TenantProduct append notes here)
- Do **not** merge with those SECURITY content NEWs — this task is **index-only**

## High-level instructions for coder

- In **`docs/README.md` Reference & notes** (or Other), add one row for **`SECURITY-REVIEW.md`**: structured security pass (not a pentest); repeat after major releases
- Optional Quick links one-liner (“Security review notes”) if that table stays short
- Documentation index only; no product code; do not expand SECURITY-REVIEW body here
- Pass/fail: `rg -n 'SECURITY-REVIEW' docs/README.md` hits the new row; link resolves
