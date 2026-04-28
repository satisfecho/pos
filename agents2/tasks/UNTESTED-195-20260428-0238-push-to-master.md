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
Git promotion to **`origin/master`** is done per above. End-to-end success still depends on a **green** **Deploy to amvara9** run on **`master`** (currently blocked until **`MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN`** are configured in Actions). Verify using the steps below.

## Testing instructions

1. **Git:** Confirm **`origin/master`** and **`origin/development`** are at the expected points for the promotion under test (re-check tips after any new merge):  
   `git fetch origin && git rev-parse origin/master origin/development`  
   Optionally: `git merge-base --is-ancestor origin/master origin/development` (exit **0** expected after a promotion when **`development`** has advanced).

2. **GitHub Actions:** Open **Actions** → **Deploy to amvara9** and inspect the latest **`master`** run (reference run **`24773000757`** until a newer one exists). After **Actions** secrets (`MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN` with PAT scope per **`config/marketing-sites.json`**) are set, **Re-run failed jobs** or trigger a new deploy from **`master`**. Expect **green** through **Fetch marketing site artifacts**, **Set up SSH**, **Build and restart stack on amvara9**, and **Smoke test**.

3. **Optional live check:** After a **green** deploy, verify **`https://satisfecho.de/`** (or documented prod URL) and API health per **`docs/0001-ci-cd-amvara9.md`** / smoke step output.

4. **Manual fallback:** If CI cannot be fixed immediately, an operator may run **`scripts/deploy-amvara9.sh`** on the server per **`README.md`** / **`AGENTS.md`** (marketing bundles may still be required for full parity with CI).

---

## Test report

**Date/time (UTC):** 2026-04-28 05:16–05:18 UTC  
**Log window:** GitHub Actions run inspected at ~05:17 UTC; local `git fetch` same window.

**Environment:** Repo **`satisfecho/pos`**, branch refs **`origin/master`** / **`origin/development`** after `git fetch origin`. No Docker / local compose required for this verification task. **`BASE_URL`** live check not performed (deploy CI not green).

**What was tested:** Items 1–2 from **Testing instructions** (git tips + latest **Deploy to amvara9** on **`master`**). Item 3 skipped until a green deploy exists.

**Results:**

| Criterion | Result | Evidence |
|-----------|--------|----------|
| Git tips / ancestry | **PASS** | `git rev-parse origin/master origin/development` → **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`** (master), **`22578b64959d1cc69443b7764249d0a49ceabd59`** (development). `git merge-base --is-ancestor origin/master origin/development` exit **0**. |
| Latest **Deploy to amvara9** on **`master`** green | **FAIL** | **`gh run list --repo satisfecho/pos --branch master`** shows latest **Deploy to amvara9** completion is still run **`24773000757`** (**failure**, 2026-04-22). **`gh run view 24773000757`** — job fails at **Fetch marketing site artifacts**; logs show empty **`MARKETING_ARTIFACT_TOKEN`** / **`GH_TOKEN`**, placeholder slugs **antillana**, **dilruba**, **flamanapolitana**, **gustazo**, **hakone**. No newer **`master`** deploy run supersedes this failure. |
| Optional **`https://satisfecho.de/`** / API after green deploy | **N/A** | Blocked until CI passes (per instructions). |

**Overall:** **FAIL** — deploy workflow on **`master`** is still red; secrets / marketing artifact fetch must be fixed and workflow re-run or a new **`master`** push must produce a green **Deploy to amvara9** before end-to-end verification can pass.

**Product owner feedback:** Git promotion state is consistent with the documented merge (**`master`** at **`7a2c2bd`**), but production deployment via GitHub Actions has not completed successfully because the marketing-sync step still lacks the required PAT in the Actions environment. Until **`MARKETING_ARTIFACT_TOKEN`** / **`GH_TOKEN`** is configured per **`config/marketing-sites.json`**, operators cannot rely on CI for amvara9 refreshes from **`master`**.

**URLs tested:**

1. GitHub Actions run (failed): https://github.com/satisfecho/pos/actions/runs/24773000757  
2. GitHub issue: https://github.com/satisfecho/pos/issues/195  

**N/A — no browser** (no optional prod smoke after green deploy).

**Relevant log excerpts (last section)** — from **`gh run view 24773000757 --log-failed`** (truncated):

```
MARKETING_ARTIFACT_TOKEN: 
GH_TOKEN: 
[marketing-sync] ::error::placeholder still present for slug=antillana — missing artifact or PAT scope
...
##[error]Process completed with exit code 1.
```
