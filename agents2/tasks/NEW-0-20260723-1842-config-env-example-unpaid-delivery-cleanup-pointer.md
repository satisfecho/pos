# Point config.env.example at unpaid delivery TTL cleanup

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Unpaid public Satisfecho Delivery TTL cleanup is live (seed module, server wrapper, amvara9 hourly cron, **`docs/0053`** / **`docs/0001`**). Operators scanning **`config.env.example`** for delivery/SaaS knobs find paywall and Stripe vars but **no** pointer to the cleanup command or cron script, so env-first setup misses the ops job.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T18:42Z: follow-on after delivery/TTL work; `demo_tables_check=ok`
- `rg` on **`config.env.example`**: no `unpaid`, `cleanup_unpaid`, or `cleanup-unpaid-public-delivery`
- Cleanup is CLI/`--ttl-hours` (default 2h in `back/app/cleanup_unpaid_public_delivery.py`), not a compose env flag — comment-only pointer is enough
- Sibling **`NEW-0-20260723-0752-index-unpaid-delivery-cleanup-ops-docs`** owns **`docs/README.md`** + **`docs/0004`** indexes only — do **not** merge; this task is **`config.env.example` only**

## High-level instructions for coder

- Near Delivery / SaaS / Stripe comments in **`config.env.example`**, add a short commented block that points to:
  - `python -m app.seeds.cleanup_unpaid_public_delivery` (and `--dry-run` / `--ttl-hours`)
  - `scripts/cleanup-unpaid-public-delivery-on-server.sh`
  - `docs/0053-satisfecho-delivery-order-channel.md` (and/or `docs/0001` unpaid cleanup section)
- Do not invent a new required env var unless one already exists unused; keep paywall defaults unchanged
- Pass/fail: `rg -n 'cleanup_unpaid|cleanup-unpaid' config.env.example` hits the new comments; no secrets; no product code
