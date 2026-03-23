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
