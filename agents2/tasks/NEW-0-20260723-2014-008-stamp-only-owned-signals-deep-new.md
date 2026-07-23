# 008 prompt: stamp-only when SIGNAL themes owned and NEW is deep

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Preflight keeps waking **008** on the same owned **`SIGNAL docs_stale`** / **`changelog_sparse`** lines while **`NEW`≈100+**. The reviewer then invents more README/index/smoke micro-tasks, deepening the backlog. Preflight already has a queued SIGNAL for deep NEW (**`NEW-0-20260722-1433-preflight-signal-deep-new-backlog`**), but **`agents2/008-enhancement-reviewer.md`** does not tell the agent to **stop creating tasks** when themes are owned and the pile is deep.

## Evidence (008 preflight / review)

- Digest 2026-07-23T20:13Z: `weekly_due=no`, `NEW=111`, `G008_SIGNALS=15` all from docs/changelog heuristics; every SIGNAL stale-doc basename already has a root NEW; changelog empty Unreleased after same-day **2.1.30** cut (owned by 2120/1138/1614)
- Same-day 008 runs keep queuing 3 NEW each hour (README rows, smokes, indexes) while older NEWs sit unstarted
- Sibling **`NEW-0-20260722-1433-preflight-signal-deep-new-backlog`** owns preflight SIGNAL only — this task owns **agent prompt behaviour**

## High-level instructions for coder

- Update **`agents2/008-enhancement-reviewer.md`** (and a one-liner in **`docs/agent-loop.md`** if that section describes 008): when **all** of the following hold, append stamp with **`FEAT: 0 | NEW: 0`** and **create no new task files**:
  - `NEW` root count ≥ threshold (suggest **50**, or reuse the preflight deep-NEW threshold once landed)
  - Every `SIGNAL` theme in the digest is already covered by an open root task (or is a known false positive after a same-day changelog cut)
  - No failing demo SIGNAL (`demo_tables_check=fail`, `demo_daily_reset_not_scheduled`)
- Still allow up to 3 tasks when there is a **new unqueued** product/demo finding (explicit exception)
- Do not implement the preflight SIGNAL here; leave that to the sibling NEW
- Pass/fail: dry-read of 008 prompt shows the stamp-only rule; a future 008 run with NEW≥50 and only owned docs/changelog SIGNALs creates 0 tasks
