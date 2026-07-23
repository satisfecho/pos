# Preflight: do not SIGNAL changelog_sparse right after a version cut

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`scripts/enhancement-reviewer-preflight.sh` emits `SIGNAL changelog_sparse` whenever **[Unreleased]** has fewer than 2 bullets and there were >5 `back/` / `front/src/` commits in 14 days. After a same-day (or recent) `## [X.Y.Z]` cut, Unreleased is **correctly empty**, but the SIGNAL still fires and keeps waking **008**. That false positive also nudges agents to re-open changelog hygiene while **`NEW-0-20260712-1614-changelog-unreleased-recent-work`** already owns post-cut Unreleased tracking.

## Evidence (008 preflight / review)

- Digest 2026-07-22T21:19Z: `SIGNAL changelog_sparse Unreleased may lag recent code (13 commits, 0 bullets)` while latest section is **`## [2.1.24] - 2026-07-22`** (same UTC day as the sweep)
- Heuristic only counts Unreleased `- ` bullets vs 14d code commits; it does not look at the newest versioned section date or whether CHANGELOG was just cut
- Open owner for real lag after new work: **`NEW-0-20260712-1614-changelog-unreleased-recent-work.md`** (scoped to post-2.1.24 / WIP-304)

## High-level instructions for coder

- In `scripts/enhancement-reviewer-preflight.sh`, suppress **`SIGNAL changelog_sparse`** (and its `G008_DOC_DRIFT` increment) when **any** of:
  - Newest `## [N.N.N] - YYYY-MM-DD` is within the last **2 calendar days** (UTC), or
  - `CHANGELOG.md` git last-touch is within **48h** and Unreleased has 0 bullets (fresh cut)
- Keep emitting informational lines (`changelog_unreleased_bullets=0`, last touch) for humans
- Optionally still SIGNAL if Unreleased is empty **and** the newest version section is older than 2 days **and** there were code commits after that section’s date
- Do not invent Unreleased bullets in this task; product changelog edits stay on the existing NEW
- Pass criteria: readonly preflight after a same-day cut with empty Unreleased does **not** emit `changelog_sparse`; a deliberately stale empty Unreleased with older version date still can
