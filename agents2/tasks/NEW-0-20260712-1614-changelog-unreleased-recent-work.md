# Update CHANGELOG [Unreleased] for recent user-visible work

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Preflight emits `changelog_sparse` when **[Unreleased]** is empty. Track only **net-new** user-visible work after the latest cut. **#296** (SaaS paywall / Stripe webhook / paywall smoke) already lives under **`## [2.1.23]`** — do **not** duplicate. Remaining open product WIP for Unreleased when it merges: **WIP-302** public Satisfecho Delivery checkout.

## Evidence (008 preflight / review)

- Earlier: `SIGNAL changelog_sparse` with empty Unreleased; **2.1.22** / courier / delivery channel already versioned
- **008 re-check 2026-07-22T11:58Z:** Unreleased had demo-reset / rate-limit bullets — **not** sparse
- **008 re-check 2026-07-22T13:48Z:** **`## [2.1.23]`** cut includes paywall + Stripe webhook + paywall smoke; Unreleased still has 5 bullets (demo reset cron, restaurant groups doc, rate-limit ops, demo FK fix, delivery webhook rate limit) — no `changelog_sparse` SIGNAL
- Open WIP still needing Unreleased (or next version section) when ready: **WIP-302** only

## High-level instructions for coder

- Do **not** backfill Unreleased for items already under **2.1.14–2.1.23** (including #296).
- When **#302** (or other post-2.1.23 user-visible work) lands, add concise Unreleased bullets (Added / Changed / Fixed; past tense; issue refs).
- Skip internal-only agent-loop / `agents2/` changes unless they affect documented operator workflows.
- Do **not** bump `front/package.json` unless cutting a new version section per **`.cursor/rules/commit-changelog-version.mdc`**.
- Pass criteria: Unreleased reflects only post-2.1.23 user-facing deltas; no duplicates of versioned sections. If nothing new has landed beyond current Unreleased, mark this task done with no CHANGELOG edit.
- Append **Testing instructions** only if code changes are required; documentation-only may go straight to committer handoff.
