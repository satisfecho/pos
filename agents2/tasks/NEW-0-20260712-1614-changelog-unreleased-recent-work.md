# Update CHANGELOG [Unreleased] for recent user-visible work

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**[Unreleased]** in `CHANGELOG.md` has only one bullet while **16** `back/` / `front/src/` commits landed in the last 14 days. Operators and release promotion rely on Unreleased to capture work before the next version cut; sparse entries risk shipping without release notes.

## Evidence (008 preflight / review)

- `SIGNAL changelog_sparse Unreleased may lag recent code (16 commits, 1 bullets)`
- Current **[Unreleased]** only documents #290 (Customers sidebar move).
- In-flight user-visible work not yet in **[Unreleased]** includes **platform operator portal** (`UNTESTED-292`, `docs/0015-platform-operator-portal.md`) — add when that task closes, not before.
- Recent features already cut to **2.1.11–2.1.13** (waiting list, signup wizard, order comments, restaurant groups) — do **not** duplicate those into Unreleased.

## High-level instructions for coder

- Review `git log` on `development` since **`## [2.1.13]`** for user-visible changes missing from **[Unreleased]** (Added / Changed / Fixed per Keep a Changelog; past tense; issue refs when helpful).
- Add bullets for **#292** platform operator dashboard when implementation is verified — login at `/platform/login`, tenant/login metrics, seed `ensure_platform_operator`.
- Skip internal-only agent-loop / `agents2/` changes unless they affect documented operator workflows.
- Do **not** bump `front/package.json` unless cutting a new version section per **`.cursor/rules/commit-changelog-version.mdc`**.
- Pass criteria: each new user-facing feature/fix since 2.1.13 has a distinct Unreleased bullet; no duplicate bullets for items already under **2.1.11–2.1.13**.
- Append **Testing instructions** only if code changes are required; documentation-only may go straight to committer handoff.
