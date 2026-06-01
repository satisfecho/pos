---
## Closing summary (TOP)

- **What happened:** Issue #256 requested shipping **release 2.1.0** with human-readable notes, promoting tested work from **`development`** to **`master`** and deploying to production.
- **What was done:** Consolidated **`CHANGELOG.md`** into **`## [2.1.0] - 2026-06-01`**, bumped **`front/package.json`** to **2.1.0**, merged **`development` → `master`** at **`b6b7ec7d`**, triggered a green **Deploy to amvara9** run, and published GitHub release **v2.1.0**.
- **What was tested:** Tester **PASS** on all release criteria — git promotion, changelog/version, deploy run **26741314933** success, GitHub release published, production `/api/health` OK, landing footer **2.1.0** + hash **`b6b7ec7d`**.
- **Why closed:** All acceptance criteria met; release live on **satisfecho.de**.
- **Closed at (UTC):** 2026-06-01 07:34
---

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

---

## Test report

**Date/time (UTC):** 2026-06-01T07:31:00Z – 2026-06-01T07:33:18Z  
**Log window:** Production verification only (no local Docker logs required for release smoke).

### Environment

- **Branch:** `development` (synced); verified `origin/master` and `origin/development`
- **BASE_URL:** `https://www.satisfecho.de`
- **Compose:** N/A — production/amvara9 post-deploy checks

### What was tested

Release **2.1.0** promotion, changelog/version, CI deploy, GitHub release, production health, and landing footer version/hash.

### Results

| Criterion | Result | Evidence |
|-----------|--------|----------|
| Git: `origin/master` at merge commit `b6b7ec7d` | **PASS** | `git rev-parse origin/master` → `b6b7ec7d0d2bde2c097ad5e0a5005bb1c7c50bd3`; log: *Merge development into master for release 2.1.0 (Refs #256)* |
| Git: `origin/development` at or after release commit | **PASS** | `git rev-parse origin/development` → `dc311556` (follow-up task commit after `52172f07`; allowed per instructions) |
| `CHANGELOG.md` has `## [2.1.0] - 2026-06-01` | **PASS** | Section present with Added/Changed/Fixed entries; `[Unreleased]` empty |
| `front/package.json` version **2.1.0** | **PASS** | `"version": "2.1.0"` |
| Deploy to amvara9 run **26741314933** green for `b6b7ec7d` | **PASS** | `gh run view 26741314933`: `conclusion: success`, `headSha: b6b7ec7d`, https://github.com/satisfecho/pos/actions/runs/26741314933 |
| GitHub release **v2.1.0** published with readable notes | **PASS** | https://github.com/satisfecho/pos/releases/tag/v2.1.0 — human-readable Added/Changed/Fixed (published 2026-06-01T07:32:26Z) |
| Production `/api/health` OK | **PASS** | `curl -sf https://www.satisfecho.de/api/health` → `{"status":"ok"}` |
| Landing footer version **2.1.0** + hash **`b6b7ec7d`** | **PASS** | `npm run test:landing-version` step 1: *Version element text: 2.1.0 b6b7ec7d…*; login step failed (401, no creds) — **out of scope** per testing instructions |

### Overall

**PASS** — All required release criteria verified. Deploy confirmed via GitHub Actions success (not fixed sleep). Production serves 2.1.0 at commit `b6b7ec7d`.

### Product owner feedback

Release **2.1.0** is live on **satisfecho.de** with matching footer version/hash and a published GitHub release with clear notes. The amvara9 deploy pipeline completed successfully for the promotion merge. Ready for closer/issue wrap-up.

### URLs tested

1. https://www.satisfecho.de/api/health
2. https://www.satisfecho.de/ (landing, version footer — HTTP 200)
3. https://github.com/satisfecho/pos/actions/runs/26741314933
4. https://github.com/satisfecho/pos/releases/tag/v2.1.0

### Relevant log excerpts

```
# git rev-parse
b6b7ec7d0d2bde2c097ad5e0a5005bb1c7c50bd3  (origin/master)
dc31155654af6d23bba8f965553b53dfb5558b63  (origin/development)

# curl health
{"status":"ok"}

# gh run view 26741314933
conclusion: success, headSha: b6b7ec7d, status: completed

# test:landing-version (step 1)
Version element text: 2.1.0 b6b7ec7dOpen source with ♥ from El Masnou (Barcelona) & Los Mochis (Mexico).
```
