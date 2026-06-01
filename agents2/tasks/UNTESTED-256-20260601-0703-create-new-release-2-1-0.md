# Create new release 2.1.0

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/256
- **256**

## Problem / goal

Ship **release 2.1.0** with clear, human-readable release notes covering all new features and fixes since the last published GitHub release (**v2.0.5**, 2026-03-18). Promote tested work from **`development`** to **`master`**, deploy to production (**amvara9** / **satisfecho.de**), and publish the release on https://github.com/satisfecho/pos/releases.

Follow **`.cursor/rules/git-development-branch-workflow.mdc`** and **`.cursor/rules/commit-changelog-version.mdc`**. This is an explicit production release request — **`development` → `master`** merge is allowed.

## Implementation (feature coder)

1. **Changelog:** Consolidated **`[Unreleased]`** into **`## [2.1.0] - 2026-06-01`** in **`CHANGELOG.md`** (Added: public menu QR #254, public menu API #250; Changed: clickable QR #255, production promotion #253; Fixed: deploy workflow #253, sidebar scroll #215). Cleared **`[Unreleased]`**.
2. **Version bump:** **`front/package.json`** and **`front/package-lock.json`** set to **2.1.0**.
3. **Commit on `development`:** **`52172f07`** — *Release 2.1.0: changelog, version bump, public menu QR features.*
4. **Promotion:** Merged **`development` → `master`**, pushed **`origin/master`** at merge commit **`b6b7ec7d`**.
5. **Deploy:** Push triggered **Deploy to amvara9** run **`26741314933`** — **green** (~2m6s).
6. **GitHub release:** Published **`v2.1.0`** at https://github.com/satisfecho/pos/releases/tag/v2.1.0 (human-readable notes from **`[2.1.0]`** section).
7. **Smoke (coder):** `https://www.satisfecho.de/api/health` → `{"status":"ok"}`; landing footer shows **2.1.0** and git hash **`b6b7ec7d`**.

## Current state (after implementation)

| Check | Value |
|-------|-------|
| **`origin/development`** | **`52172f07`** |
| **`origin/master`** | **`b6b7ec7d`** (merge of development for release 2.1.0) |
| Latest **Deploy to amvara9** on **`master`** | **`26741314933`** — **success** (push, 2026-06-01) |
| GitHub release | **v2.1.0** — https://github.com/satisfecho/pos/releases/tag/v2.1.0 |
| Live smoke (coder) | `/api/health` OK; landing version **2.1.0** + hash **`b6b7ec7d`** |

## Testing instructions

1. **Git:** `git fetch origin && git rev-parse origin/master origin/development` — **`master`** should be merge commit **`b6b7ec7d`** containing release **2.1.0** work; **`development`** at **`52172f07`** (or later if follow-up commits land).
2. **Changelog / version:** **`CHANGELOG.md`** has **`## [2.1.0] - 2026-06-01`**; **`front/package.json`** version is **2.1.0**.
3. **GitHub Actions:** `gh run view 26741314933` — **Deploy to amvara9** **green** (marketing artifacts, SSH, build/restart, smoke test).
4. **GitHub release:** https://github.com/satisfecho/pos/releases/tag/v2.1.0 exists with readable Added/Changed/Fixed notes (not a raw agent dump).
5. **Live:** `curl -sf https://www.satisfecho.de/api/health` returns OK.
6. **Optional:** `BASE_URL=https://www.satisfecho.de HEADLESS=1 npm run test:landing-version` from **`front/`** — footer should show **2.1.0** and git hash **`b6b7ec7d`** (login step optional/out of scope).

**Pass criteria:** **`CHANGELOG.md`** has **2.1.0** section; **`master`** contains promotion; **Deploy to amvara9** **green** for **`b6b7ec7d`**; GitHub **v2.1.0** release published; production health OK; landing version/hash match deployed commit.
