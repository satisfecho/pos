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

## Implementation (feature coder)

- Released **`[2.0.54] - 2026-03-24`** from prior `[Unreleased]` entries; reset `[Unreleased]` to empty.
- Bumped **`front/package.json`** and **`front/package-lock.json`** to **2.0.54**.
- **No `development` → `master` merge** in this change: promotion follows `.cursor/rules/git-development-branch-workflow.mdc` (issue #70 asked generally; use batch/urgent criteria or maintainer confirmation for production).

## Testing instructions

- **What to verify:** Changelog and app version reflect **2.0.54**; no typos in `CHANGELOG.md` headers.
- **How to test:**
  1. Open `CHANGELOG.md` — top released section is **`## [2.0.54] - 2026-03-24`**; **`## [Unreleased]`** has no bullet lists yet.
  2. `grep '"version"' front/package.json` → **2.0.54**; same in **`front/package-lock.json`** root and **`packages.""`** entries.
  3. With stack up (HAProxy e.g. **4202**): `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` — pass (checks landing / version display).
  4. Optional (staff login): `npm run test:changelog --prefix front` — dashboard changelog modal still loads **GET /changelog** after release section change.
- **Pass–fail:** Steps 1–2 exact; step 3 exit code **0**; step 4 optional exit **0** or skip if no credentials.
