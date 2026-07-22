# Update CHANGELOG [Unreleased] for recent user-visible work

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Preflight emits `changelog_sparse` when **[Unreleased]** is empty. Track only **net-new** user-visible work after the latest cut. Do **not** duplicate bullets already under versioned sections.

## Evidence (008 preflight / review)

- `SIGNAL changelog_sparse Unreleased may lag recent code (13 commits, 0 bullets)` — heuristic counts 14d code commits vs empty Unreleased; it does **not** check whether those commits already landed in a same-day version section
- **008 re-check 2026-07-22T21:11Z:** Latest cut is **`## [2.1.24] - 2026-07-22`** (public Satisfecho Delivery checkout #302, daily demo reset docs, restaurant groups guide, rate-limit ops, demo FK fix, delivery webhook rate limit). **[Unreleased]** is empty on purpose after that cut
- Earlier cuts same day: **2.1.23** (#296 paywall), **2.1.22** (ws-bridge), courier/delivery channel work through **2.1.17**
- Remaining open product WIP for Unreleased when it merges: **WIP-304** (TenantProduct ID resolve on public Satisfecho Delivery checkout). **#302** is CLOSED/shipped — do not re-list

## High-level instructions for coder

- Do **not** backfill Unreleased for items already under **2.1.14–2.1.24** (including #296 and #302).
- When **#304** (or other post-2.1.24 user-visible work) lands, add concise Unreleased bullets (Added / Changed / Fixed; past tense; issue refs).
- Skip internal-only agent-loop / `agents2/` changes unless they affect documented operator workflows.
- Do **not** bump `front/package.json` unless cutting a new version section per **`.cursor/rules/commit-changelog-version.mdc`**.
- Pass criteria: Unreleased reflects only post-2.1.24 user-facing deltas; no duplicates of versioned sections. If nothing new has landed beyond the current cut (only WIP-304 pending), mark this task done with no CHANGELOG edit.
- Append **Testing instructions** only if code changes are required; documentation-only may go straight to committer handoff.
