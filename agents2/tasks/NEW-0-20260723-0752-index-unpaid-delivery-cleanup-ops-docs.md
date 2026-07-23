# Index unpaid delivery cleanup in ops docs (README + 0004)

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Unpaid public Satisfecho Delivery TTL cleanup is live (CLI, `scripts/cleanup-unpaid-public-delivery-on-server.sh`, amvara9 hourly cron, **`docs/0001`** § Unpaid public…). **`docs/README.md`** Deployment row for **0001** and **`docs/0004-deployment.md`** still mention only the tenant-1 **demo data reset** cron, so operators scanning indexes miss the all-tenant cleanup job.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23: follow-on after **CLOSED-0-20260723-0734-install-unpaid-delivery-cleanup-cron-amvara9** (cron installed; Unreleased bullet exists)
- `docs/README.md` L27: “daily demo data reset cron for tenant 1” — no unpaid cleanup
- `docs/0004-deployment.md` § demo reset points only at 0001 daily demo reset; no unpaid cleanup link
- Feature body already correct in **0001** / **0053** — do **not** rewrite those sections; index/cross-link only
- Do not duplicate **WIP-304** or changelog_sparse owners

## High-level instructions for coder

- Update **`docs/README.md`** Deployment & operations blurb for **0001** to mention unpaid public delivery cleanup cron (all tenants) alongside demo reset
- In **`docs/0004-deployment.md`**, add a short bullet or sentence next to the demo-reset note linking to **`docs/0001-ci-cd-amvara9.md`** § Unpaid public Satisfecho Delivery cleanup (and/or the wrapper script)
- Optional: tweak **0053** Feature guides one-liner in `docs/README.md` to mention public `/delivery` + TTL cleanup if still “courier API (#297)” only
- Pass/fail: `rg -n 'unpaid|cleanup-unpaid' docs/README.md docs/0004-deployment.md` finds the new pointers; 0001 body unchanged unless a single anchor typo needs fixing
