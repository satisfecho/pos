# Update CHANGELOG [Unreleased] for recent user-visible work

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Preflight still emits `changelog_sparse` when **[Unreleased]** is empty. After **2.1.22** (2026-07-21) most recent commits already live under versioned sections — empty Unreleased is expected until the next user-visible land. Track only **net-new** work (e.g. SaaS paywall #296, public delivery checkout #302) when those WIPs merge.

## Evidence (008 preflight / review)

- Earlier: `SIGNAL changelog_sparse` with empty Unreleased; latest cut **`## [2.1.22]`** (ws-bridge / courier / delivery channel already versioned — do **not** duplicate)
- **008 re-check 2026-07-22T11:58Z:** Unreleased now has **4** bullets (daily demo reset, rate-limit doc, demo reset FK fix, delivery webhook rate limit) — **not** sparse; keep this task only for **post-2.1.22 WIP landings**
- Open WIP still needing Unreleased bullets when ready: **WIP-296** paywall, **WIP-302** public delivery checkout

## High-level instructions for coder

- Do **not** backfill Unreleased for items already under **2.1.14–2.1.22**.
- When **#296** / **#302** (or other post-2.1.22 user-visible work) land, add concise Unreleased bullets (Added / Changed / Fixed; past tense; issue refs).
- Skip internal-only agent-loop / `agents2/` changes unless they affect documented operator workflows.
- Do **not** bump `front/package.json` unless cutting a new version section per **`.cursor/rules/commit-changelog-version.mdc`**.
- Pass criteria: Unreleased reflects only post-2.1.22 user-facing deltas; no duplicates of versioned sections. If nothing new has landed, mark this task done with no CHANGELOG edit.
- Append **Testing instructions** only if code changes are required; documentation-only may go straight to committer handoff.
