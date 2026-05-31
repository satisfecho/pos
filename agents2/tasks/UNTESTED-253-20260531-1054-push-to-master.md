# Push to master

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/253
- **253**
- **Supersedes:** https://github.com/satisfecho/pos/issues/252 (closed 2026-05-29; archived as **`CLOSED-252-20260529-1430-push-to-master.md`**)

## Problem / goal

Promote tested work from **`development`** to **`master`** so production (e.g. **amvara9**) can run current code, then confirm **Deploy to amvara9** completed successfully on GitHub Actions.

The issue author asks to merge **`development` → `master`** when appropriate and, if deploying to amvara9, verify the deployment workflow succeeded.

Follow **`.cursor/rules/git-development-branch-workflow.mdc`** for merge timing (production promotion / explicit push-to-master request).

## Implementation (feature coder)

1. **Root cause of prior deploy failure:** amvara9 server had a dirty working tree (`front/nginx.conf` and marketing-site files) blocking `git checkout` during CI deploy (run **26630264861**). Marketing artifact fetch was already succeeding.
2. **Fix:** `.github/workflows/deploy-amvara9.yml` — use `git checkout -f` and `git clean -fd` after fetch so local server edits do not block reset.
3. **Promotion:** merged **`development` → `master`** (merge commit **`65f68e92`**) and pushed **`origin/master`**.
4. **Deploy:** push triggered **Deploy to amvara9** run **`26710660453`** — **green** (2m56s).

## Current state (after implementation)

| Check | Value |
|-------|-------|
| **`origin/development`** | **`676425f7`** |
| **`origin/master`** | **`65f68e92`** (merge of development + prior La Moca commit) |
| Latest **Deploy to amvara9** on **`master`** | **`26710660453`** — **success** (push, 2026-05-31) |
| Live smoke (coder) | `https://www.satisfecho.de/` 200, `/api/health` 200, `/gustazo/` not placeholder |

## Testing instructions

1. **Git:** `git fetch origin && git rev-parse origin/master origin/development` — **`master`** should be merge commit **`65f68e92`** containing development work; tips need not be identical SHA.
2. **GitHub Actions:** `gh run view 26710660453` — **Deploy to amvara9** **green** (marketing artifacts, SSH, build/restart, smoke test).
3. **Live:** `curl -sf https://www.satisfecho.de/api/health` returns OK.
4. **Optional:** `BASE_URL=https://www.satisfecho.de HEADLESS=1 npm run test:landing-version` from `front/`.

**Pass criteria:** **`development`** promoted to **`master`** and **Deploy to amvara9** **green** for that commit (or documented manual parity).
