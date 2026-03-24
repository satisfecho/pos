# Bump Version

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/70

## Problem / goal

The reporter notes many unmerged commits on `development` and asks to bump the version and merge into `master`/`main`. Version and changelog live in this repo per `front/package.json` / `CHANGELOG.md` and team rules in `.cursor/rules/commit-changelog-version.mdc`. Promotion of `development` → `master` is governed by `.cursor/rules/git-development-branch-workflow.mdc` and `docs/agent-loop.md` (not every bump requires an immediate production merge unless criteria there are met).

## High-level instructions for coder

- Review `CHANGELOG.md` `[Unreleased]` and align with what would ship; cut a new `## [X.Y.Z] - YYYY-MM-DD` section when appropriate and bump `front/package.json` / `front/package-lock.json` per project convention.
- Confirm branch state: routine commits stay on `development`; merging to `master` only when the workflow allows (batch cadence, production-urgent, or explicit product request).
- If the issue author expects an immediate production release, capture that explicitly in the issue or verify with the maintainer before merging `master`.
- After changes, run the usual smoke checks from `AGENTS.md` / `docs/testing.md` for anything that touches the built app.
