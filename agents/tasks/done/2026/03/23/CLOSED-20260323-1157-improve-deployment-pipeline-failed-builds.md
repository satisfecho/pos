---
## Closing summary (TOP)

- **What happened:** GitHub #49 reported that production deploys could leave the stack down when image builds failed after containers were torn down, and asked for safer ordering, branch-correct checkout, deploy concurrency, and reliable smoke checks.
- **What was done:** `scripts/deploy-amvara9.sh` was reordered to build images before stopping app containers, default teardown uses `stop` (not `down` unless `DEPLOY_FULL_DOWN=1`), an origin URL guard with `SKIP_ORIGIN_CHECK` was added, migrations run without swallowing failures, and post-`up` readiness polls `/health`; `.github/workflows/deploy-amvara9.yml` gained `concurrency.group: deploy-amvara9` and checkout by ref; `docs/0001-ci-cd-amvara9.md` and `CHANGELOG.md` were updated.
- **What was tested:** Tester **PASS** — `bash -n`, static review of deploy script, workflow, docs, and changelog (no full server deploy in this pass).
- **Why closed:** Tester reported **PASS** against all documented pass/fail criteria.
- **Closed at (UTC):** 2026-03-23 14:45
---

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

---

## Test report

1. **Date/time (UTC):** 2026-03-23 13:51 UTC — **Log window:** static verification only (no full deploy); no container log window required.

2. **Environment:** Repo root `/Users/raro42/projects/pos2`; compose files referenced in task not started for this pass. **`BASE_URL`:** N/A (no browser). **Branch:** `development` @ `1ce3576`.

3. **What was tested:** All items under “What to verify” via `bash -n`, file review of `scripts/deploy-amvara9.sh`, `.github/workflows/deploy-amvara9.yml`, `docs/0001-ci-cd-amvara9.md`, `CHANGELOG.md` `[Unreleased]`.

4. **Results:**
   - **`bash -n scripts/deploy-amvara9.sh`:** **PASS** — exit 0, output `bash -n: OK`.
   - **Build before stop; default no `down`:** **PASS** — `build back` / `build --no-cache front` at L71–L80; `stop front haproxy ws-bridge back` when `DEPLOY_FULL_DOWN` unset (L90–L91); `docker compose down` only when `DEPLOY_FULL_DOWN=1` (L87–L89).
   - **Origin guard + `SKIP_ORIGIN_CHECK`:** **PASS** — L52–L68: URL must match `*satisfecho/pos*` or exit 1; bypass when `SKIP_ORIGIN_CHECK=1`.
   - **Migrations strict (no `|| true`):** **PASS** — L108–110: `run --rm back python -m app.migrate` and `--sync-idempotent` without `|| true` (`set -e` applies).
   - **Post-`up` `/health` retries:** **PASS** — L119–L141: loop up to 30 attempts, 2s sleep, urllib to `http://127.0.0.1:8020/health`, exit 1 if never healthy.
   - **Workflow `concurrency.group: deploy-amvara9`:** **PASS** — `.github/workflows/deploy-amvara9.yml` L17–L18 `group: deploy-amvara9`, `cancel-in-progress: false`.
   - **Docs + changelog:** **PASS** — `docs/0001-ci-cd-amvara9.md` L44–L56 (workflow + script behaviour #49); `CHANGELOG.md` `[Unreleased]` L11 GitHub #49 bullet.

5. **Overall:** **PASS**

6. **Product owner feedback:** Deploy safety goals from #49 are reflected in the script and workflow: images build while the old stack still runs, default teardown stops only app-tier containers, migrations are strict, and health is polled instead of a single long sleep. Production should still be watched on the next real `master` deploy to confirm SSH + smoke steps end-to-end.

7. **URLs tested:** **N/A — no browser**

8. **Relevant log excerpts:** **N/A — no containers** (evidence: host command `bash -n scripts/deploy-amvara9.sh` exited 0).
