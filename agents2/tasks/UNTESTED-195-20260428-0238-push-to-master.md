# Push to Master

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/195
- **195**

## Problem / goal
Promote tested work from **`development`** to **`master`** so production (e.g. **amvara9**) can run current code. After deploy, confirm the **GitHub Actions** deployment workflow completed successfully (per issue text).

Follow repo branching rules: routine promotion timing vs urgent production fixes — see **`.cursor/rules/git-development-branch-workflow.mdc`**.

## High-level instructions for coder
- Confirm **`development`** is synced with **`origin/development`** and reflects the intended release scope (no accidental WIP).
- Merge **`development` → `master`** only when allowed by team rules (cadence, production-impacting trigger, or explicit urgent/production request on the issue). Align with **`docs/agent-loop.md`**.
- Push **`master`** to **`origin`** when merging for production.
- Deploy to **amvara9** using the documented path (see **`docs/0001-ci-cd-amvara9.md`**, **`scripts/deploy-amvara9.sh`** as referenced in **`README.md`** / **`AGENTS.md`**).
- For “review the success status of the deployment action on GitHub”: open the repo’s **Actions** tab for the relevant workflow run and verify success; capture any failure logs for follow-up without pasting secrets.
- Post a short summary on the issue when promotion/deploy is done (what was merged, whether CI/deploy is green).

## Implementation summary (feature coder)
- **`development`** was synced with **`origin/development`** (already up to date).
- **`master`** was fast-forwarded to **`7a2c2bd`** (same tip as **`development`** after promotion) and pushed to **`origin/master`** (issue explicitly requested production promotion).
- **GitHub Actions — Deploy to amvara9** run **`24773000757`** (triggered by **`master`** push) **failed** at step **Fetch marketing site artifacts**: sync script reported **no `MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN`** in that job’s environment, could not download marketing bundles, and **`MARKETING_VERIFY_NO_PLACEHOLDERS=1`** failed with placeholder bundles for slugs **antillana**, **dilruba**, **flamanapolitana**, **gustazo**, **hakone**. Server deploy steps did not run.
- **Follow-up (repo settings):** ensure Actions secrets include a PAT with **Actions read** on every repo listed in **`config/marketing-sites.json`** (see error text in workflow logs), then re-run the failed workflow or redeploy.

## Status for tester
Git promotion to **`origin/master`** is done per above. End-to-end success still depends on a **green** **Deploy to amvara9** run on **`master`** (currently blocked until **`MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN`** are configured in Actions). Verify using **Testing instructions** below.

---

## Testing instructions

1. **Git:** Confirm **`origin/master`** and **`origin/development`** are at the expected points for the promotion under test (re-check tips after any new merge):  
   `git fetch origin && git rev-parse origin/master origin/development`  
   Optionally: `git merge-base --is-ancestor origin/master origin/development` (exit **0** expected after a promotion when **`development`** has advanced).

2. **GitHub Actions:** Open **Actions** → **Deploy to amvara9** and inspect the latest **`master`** run (reference run **`24773000757`** until a newer one exists). After **Actions** secrets (`MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN` with PAT scope per **`config/marketing-sites.json`**) are set, **Re-run failed jobs** or trigger a new deploy from **`master`**. Expect **green** through **Fetch marketing site artifacts**, **Set up SSH**, **Build and restart stack on amvara9**, and **Smoke test**.

3. **Optional live check:** After a **green** deploy, verify **`https://satisfecho.de/`** (or documented prod URL) and API health per **`docs/0001-ci-cd-amvara9.md`** / smoke step output.

4. **Manual fallback:** If CI cannot be fixed immediately, an operator may run **`scripts/deploy-amvara9.sh`** on the server per **`README.md`** / **`AGENTS.md`** (marketing bundles may still be required for full parity with CI).

---

## Test report

**Date/time (UTC):** 2026-04-28 09:47 UTC  
**Log window:** GitHub Actions API / `gh run view` for **Deploy to amvara9** (instantaneous snapshot); local git fetch same window.

**Environment:** Repo **`development`** synced via `./scripts/git-sync-development.sh` before edits; no Docker app tests required for this task. **`BASE_URL` (optional):** N/A for primary criteria; ad hoc **`https://satisfecho.de/api/health`**. Branch under test: promotion tied to **`origin/master`** at **`7a2c2bd`**.

**What was tested (from Testing instructions):**
1. Git remote tips and ancestry.  
2. Latest **Deploy to amvara9** run for **`master`** (vs reference **`24773000757`** and any newer run).  
3. Optional live API health (informational — only meaningful after a green deploy for “new build” proof).

**Results:**

| Criterion | Result | Evidence |
|-----------|--------|----------|
| (1) Git: `origin/master` / `origin/development` + optional ancestor check | **PASS** | `git rev-parse origin/master origin/development` → **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`**, **`ab241122d2645ebd6445a4ec31b3d3ceb0710801`**. `git merge-base --is-ancestor origin/master origin/development` → exit **0** (master is ancestor of development). |
| (2) GitHub Actions: green **Deploy to amvara9** on latest **`master`**, through fetch/SSH/build/smoke | **FAIL** | **`gh run list --workflow "Deploy to amvara9" --limit 5`**: most recent **`master`** deploy is still run **`24773000757`**, **conclusion `failure`**. No newer successful **`master`** push deploy after that run. Job **Fetch marketing site artifacts** failed: empty **`MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN`**, placeholder slugs **antillana**, **dilruba**, **flamanapolitana**, **gustazo**, **hakone**; downstream steps **skipped**. Run URL: https://github.com/satisfecho/pos/actions/runs/24773000757 |
| (3) Optional live check after green deploy | **N/A** | No green deploy; **`curl -sS -o /dev/null -w "%{http_code}" https://satisfecho.de/api/health`** → **200** with `{"status":"ok"}` (legacy/previous stack; does not prove CI deploy for commit **7a2c2bd** succeeded). |

**Overall:** **FAIL** — failed criterion: **(2)** **Deploy to amvara9** not green; production automation for this promotion is still blocked on repository **Actions** secrets / PAT for marketing artifacts (re-run or new push after secrets are set).

**Product owner feedback:** The merge to **`master`** and branch relationship look correct, but the deployment pipeline that should push and smoke-test on **amvara9** has not completed for the **`master`** push in question. Until **`MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN`** (or equivalent) is configured and a **green** **Deploy to amvara9** run is observed, the issue cannot be treated as fully done from a release perspective. **Next step:** add the required secrets, then **Re-run failed jobs** on run **`24773000757`** or push **`master`** again; re-open verification with a new **UNTESTED** handoff when ready.

**URLs tested:**  
1. `https://github.com/satisfecho/pos/actions/runs/24773000757` (workflow run; failure)  
2. `https://satisfecho.de/api/health` (200 — informational)

**Relevant log excerpts (minimal):** From **`gh run view 24773000757 --log-failed`**: job step **Fetch marketing site artifacts** shows `MARKETING_ARTIFACT_TOKEN:` / `GH_TOKEN:` empty in env, `[marketing-sync] no token`, and `::error::placeholder still present for slug=…` for **antillana**, **dilruba**, **flamanapolitana**, **gustazo**, **hakone**; process exit code **1**; **Set up SSH** through **Smoke test** **skipped**.
