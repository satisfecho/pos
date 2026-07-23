# Retarget or close stale changelog Unreleased NEW

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`NEW-0-20260712-1614-changelog-unreleased-recent-work.md`** still instructs coders as if the latest cut were **2.1.24** and **[Unreleased]** were empty pending only **WIP-304**. Reality: cuts through **2.1.27** (2026-07-23), and **[Unreleased]** already has **2** bullets (unpaid delivery cleanup cron ops + SaaS paywall production enablement). Leaving the July-12 NEW open risks duplicate Unreleased bullets and blocks backlog drain (NEW≈51).

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23: no `changelog_sparse` SIGNAL; `changelog_unreleased_bullets=2`; latest section **`## [2.1.27] - 2026-07-23`**
- Open NEW body still says “post-2.1.24” / “empty on purpose after that cut” (008 re-check 2026-07-22) — outdated
- Sibling **`NEW-0-20260722-2120-preflight-changelog-sparse-after-cut`** owns preflight false positives; this task is queue hygiene for the product-changelog NEW only
- Related archive pattern: **`NEW-0-20260723-1044-archive-superseded-demo-tables-repair-new`** (same class: root NEW left after work moved on)

## High-level instructions for coder

- Prefer **close**: rename **`NEW-0-20260712-1614-changelog-unreleased-recent-work.md`** → **`CLOSED-0-20260712-1614-changelog-unreleased-recent-work.md`**, prepend a short **Closing summary** (Unreleased + 2.1.25–2.1.27 already track post-2.1.24 work; further Unreleased for **WIP-304** is committer/coder duty when that fix lands), then **`./scripts/move-agent-task-to-done.sh agents2/tasks/CLOSED-0-20260712-1614-changelog-unreleased-recent-work.md`**
- If keeping it open instead: rewrite Evidence + instructions to **post-2.1.27 only**, forbid backfill of 2.1.25–2.1.27 / current Unreleased bullets, and scope remaining work to **WIP-304** (or mark done with no CHANGELOG edit if #304 still open and Unreleased already correct for shipped ops)
- Update any sibling that still says this NEW “owns post-2.1.24 Unreleased” (at least **`NEW-0-20260722-2120-preflight-changelog-sparse-after-cut.md`**) to point at CLOSED / committer
- Do **not** invent duplicate Unreleased bullets; do **not** bump version unless cutting a release
- Pass criteria: either the July-12 NEW is archived under `done/`, or its body matches current CHANGELOG tip; root NEW count does not stay inflated by a stale owner
