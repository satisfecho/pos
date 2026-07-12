# Sample finding (reference — not an active task)

This file shows what agent **008** might queue after a preflight run. **Do not** treat this as a live task; copy the structure into **`agents2/tasks/FEAT-0-…md`** when scheduling work.

---

## Example: Schedule daily demo data reset on amvara9

**Preflight signal:** `demo_daily_reset_not_scheduled`

**Proposed task filename:** `FEAT-0-20260712-1811-schedule-daily-demo-data-reset.md`

```markdown
# Schedule daily demo data reset (tenant 1)

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Demo restaurant (tenant 1) accumulates orders and reservations on production. Sales demos and Informes look stale without periodic refresh. An idempotent reset already exists but runs only manually.

## Evidence (008 preflight / review)

- `scripts/reset-demo-data-on-server.sh` wraps `python -m app.seeds.reset_demo_data`
- `reset_demo_data.py` clears tenant 1 orders/reservations and re-seeds demo orders + reservations
- No documented cron on amvara9

## High-level instructions for coder

- Document production cron in `docs/` (e.g. amvara9 ops) using existing `scripts/reset-demo-data-on-server.sh`
- Prefer host cron or documented `crontab` entry (e.g. 04:00 UTC daily); avoid new dependencies
- Ensure script is safe to run while stack is up (idempotent)
- Tester: dry-run on dev with `docker compose … exec back python -m app.seeds.reset_demo_data`; verify `check_demo_tables` still passes
```

---

## Example: Changelog lag

**Preflight signal:** `changelog_sparse`

Queue **`NEW-0-…-changelog-unreleased-entries.md`** only if **[Unreleased]** is empty while multiple user-visible commits landed — ask committer/coder to add bullets, not a full doc rewrite.
