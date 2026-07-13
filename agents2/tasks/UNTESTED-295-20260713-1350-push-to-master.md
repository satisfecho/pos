# Push to master

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/295
- **295**

## Problem / goal

Promote tested work from **`development`** to **`master`** so production (amvara9 / https://www.satisfecho.de) runs current code, then confirm **Deploy to amvara9** completes successfully on GitHub Actions.

This is an explicit production-promotion request. Follow **`.cursor/rules/git-development-branch-workflow.mdc`**.

**Context (2026-07-13):** After sync, **`origin/development`** @ **`95877072`** is **197 commits** ahead of **`origin/master`** @ **`0923c654`** (production still at **v2.1.14** from #293). Notable product work since the last promotion includes **#294** (GHA deploy SSH port **60022** for amvara9 — fix on **`2dd5cb6a`**), waiting-list user-guide docs (**`6a73171c`**), and related agent/changelog commits. **WIP-294** documents the deploy-blocker handoff; merging to **`master`** should allow green **Deploy to amvara9** runs (prior run **29200152615** failed on port 22).

## High-level instructions for coder

- Read **`docs/0001-ci-cd-amvara9.md`** and **`.cursor/rules/git-development-branch-workflow.mdc`**: promote via **`development` → `master`** merge (or fast-forward) + **`git push origin master`**, which triggers **`.github/workflows/deploy-amvara9.yml`**.
- Sync **`development`** with remote before promoting; confirm local smoke — `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/` → **200**; `docker logs --since 10m pos-front` — expect **`Application bundle generation complete`** with no standing TS/build errors.
- Review **`CHANGELOG.md`** `[Unreleased]` and bump **`front/package.json`** version if user-facing changes ship beyond **2.1.14** (e.g. deploy fix is ops/CI; docs-only changes may not need a bump — use judgment per **`.cursor/rules/commit-changelog-version.mdc`**).
- Merge/promote only production-ready changes; confirm **#294** SSH port fix is included so GHA deploy uses **`-p 60022`** (not port 22).
- Watch **Deploy to amvara9** for the pushed **`master`** commit; document run URL and conclusion. If GHA still fails, fall back per **`docs/0001-ci-cd-amvara9.md`**: `ssh amvara9 'cd /development/pos && git fetch origin && git checkout -f master && git reset --hard origin/master && bash scripts/deploy-amvara9.sh'`.
- Post-deploy smoke: landing **app-version** meta, **`/api/health`** 200, spot-check marketing sites (e.g. **`https://www.satisfecho.de/bosskebabypizzeria/`** no longer placeholder if marketing rsync ran), and any routes touched by recent work.
- This is **deploy/ops**, not feature coding — fix blocking defects on **`development`** only if deploy reveals them, then re-test and re-promote.
- Append **Testing instructions** when promotion and production verification are complete (include workflow run URL and smoke results).

## Implementation notes

- Synced **`development`**; local landing smoke **200**.
- Bumped **2.1.14 → 2.1.15** in **`CHANGELOG.md`**, **`front/package.json`**, **`front/package-lock.json`** (deploy SSH fix + waiting-list docs + release note).
- Committed on **`development`**: **`6b32a14a`** (`Release 2.1.15: GHA deploy SSH port fix, waiting-list docs (#295)`).
- Merged **`development` → `master`**; pushed **`master`** @ **`59bd1dec`** (`Merge development: release 2.1.15 to production (#295)`).
- **Deploy to amvara9** run **29255611539** — **success** (2m19s); all steps green including SSH checkout on port **60022**, marketing rsync, build/restart, and workflow smoke test.

## Testing instructions

1. **Git promotion**
   - `git fetch origin && git rev-parse --short origin/master origin/development`
   - Expect **`origin/master`** @ **`59bd1dec`** (or descendant) includes **`2dd5cb6a`** (SSH port fix) and **`6b32a14a`** / release **2.1.15** changelog.

2. **GitHub Actions — Deploy to amvara9**
   - Run: https://github.com/satisfecho/pos/actions/runs/29255611539
   - Conclusion: **success**
   - Verify steps: **Set up SSH**, **Checkout latest code on amvara9**, **Sync marketing sites**, **Build and restart stack**, **Smoke test** — all ✓.

3. **Production smoke (manual)**
   - `curl -s -o /dev/null -w "%{http_code}" https://www.satisfecho.de/` → **200**
   - `curl -s -o /dev/null -w "%{http_code}" https://www.satisfecho.de/api/health` → **200**
   - `curl -s https://www.satisfecho.de/ | grep app-version` → **`content="2.1.15"`**
   - `curl -s -o /dev/null -w "%{http_code}" https://www.satisfecho.de/bosskebabypizzeria/` → **200** (marketing SPA, not placeholder)

4. **Local dev (optional)**
   - `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/` → **200**
