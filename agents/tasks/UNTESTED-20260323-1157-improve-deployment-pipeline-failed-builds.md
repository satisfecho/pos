# Improve deployment pipeline to prevent downtime on failed builds

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/49

## Problem / goal
Production deploys can take down running services if the server updates before a successful image build: failed builds leave the stack unavailable, with no rollback. The issue asks for build-first ordering, less destructive compose usage, branch-correct checkout, deployment concurrency, reliable smoke checks, and optional CI/rollback follow-ups. See **`scripts/deploy-amvara9.sh`** and **`docs/0001-ci-cd-amvara9.md`** (if present) when implementing.

## High-level instructions for coder
- Reorder **`scripts/deploy-amvara9.sh`** (and any related GitHub Actions deploy workflow) so **`docker compose build`** succeeds before stopping or replacing running containers; avoid **`docker compose down`** unless strictly necessary; prefer **`up -d --build`** or equivalent with explicit failure exit.
- Align server git checkout with the branch that triggered the deploy (**`$GITHUB_REF_NAME`** / pushed ref), not a hard-coded **`master`**.
- Add workflow **`concurrency`** for deploy jobs; replace fixed sleeps in smoke tests with retry loops against **`/health`** or documented base URL.
- Optionally validate **`git remote get-url origin`** against the expected repo before deploy; document acceptance criteria from the issue in **`CHANGELOG.md`** / deploy docs when behaviour changes.

---

## Testing instructions

### What to verify

- **`scripts/deploy-amvara9.sh`** passes **`bash -n`** (syntax).
- Builds still run **before** any stop of app containers; default path does **not** run **`docker compose down`** (only **`stop`** on front, haproxy, ws-bridge, back).
- Wrong **`git remote origin`** (not containing **`satisfecho/pos`**) exits **1** unless **`SKIP_ORIGIN_CHECK=1`**.
- Migration steps **fail the script** on non-zero exit (no **`|| true`**).
- After **`up -d`**, the script waits for **back** **`/health`** with retries (no single long fixed sleep for readiness).
- **`.github/workflows/deploy-amvara9.yml`** declares **`concurrency.group: deploy-amvara9`** (single queue for the host).
- **`docs/0001-ci-cd-amvara9.md`** and **`CHANGELOG.md` [Unreleased]** describe the new behaviour.

### How to test

- From repo root: **`bash -n scripts/deploy-amvara9.sh`**
- **(Server / staging only)** Run **`SKIP_ORIGIN_CHECK=1 bash scripts/deploy-amvara9.sh`** from a checkout whose **`origin`** is intentionally not satisfecho if you must validate forks; production amvara9 should use default origin check.
- **(Optional)** Inspect workflow YAML: **`.github/workflows/deploy-amvara9.yml`** — **`concurrency`**, **`git checkout ${{ github.ref_name }}`** in the SSH step.
- **CI:** Push to **`development`** does not trigger this workflow (only **`master`** / **`main`**); full verification is the next **`master`** deploy or a manual **`workflow_dispatch`** if added later.

### Pass/fail criteria

- **Pass:** `bash -n` succeeds; code review confirms build-before-stop, optional **`DEPLOY_FULL_DOWN`**, origin guard + **`SKIP_ORIGIN_CHECK`**, strict migrations, health retry loop, workflow concurrency, docs/changelog updated.
- **Fail:** Any of the above missing; deploy script exits 0 after failed migrate; or default deploy still runs **`docker compose down`** without **`DEPLOY_FULL_DOWN=1`**.
