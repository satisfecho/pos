# Index agent-cursor-rules.md in docs/README

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`docs/agent-cursor-rules.md`** is the categorized index of **`.cursor/rules/*.mdc`** (and is linked from **`AGENTS.md`**), but **`docs/README.md`** only lists **`agent-loop.md`** under Reference. Agents opening the docs index for “where are the cursor rules?” miss the catalog. Sibling **`NEW-0-20260722-1412-fix-agent-cursor-rules-task-paths`** owns a Related-path fix inside the catalog — not a README row.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T18:24Z: `SIGNAL docs_stale×14` + `changelog_sparse` already owned; `demo_tables_check=ok`; NEW backlog≈88
- `rg` on **`docs/README.md`**: `agent-loop` present; no hits for `agent-cursor-rules`
- File on disk: **`docs/agent-cursor-rules.md`**
- Related open: agent-loop / AGENTS.md path NEWs — do not reopen those files here

## High-level instructions for coder

- In **`docs/README.md` Reference & notes**, add one row for **`agent-cursor-rules.md`**: categorized index of Cursor/agent stack rules (Angular, FastAPI, Docker, security, i18n); pair near **`agent-loop.md`**
- Index only; no product code; do not rewrite the catalog body (leave path fix to **1412** if still open)
- Pass/fail: `rg -n 'agent-cursor-rules' docs/README.md` hits Reference; link resolves
