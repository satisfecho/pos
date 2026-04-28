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
Git promotion to **`origin/master`** is done per above. End-to-end success still depends on a **green** **Deploy to amvara9** run on **`master`** (currently blocked until **`MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN`** are configured in Actions). Verify using **Testing instructions** at the end of this file.

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

---

## Test report (verification 2026-04-28)

**Date/time (UTC):** 2026-04-28 05:29–05:31 UTC  
**Log window:** `git fetch` / `git rev-parse` ~05:30 UTC; **`gh run list`** / **`gh run view`** same window.

**Environment:** Repo **`satisfecho/pos`** (local clone synced via **`./scripts/git-sync-development.sh`**). Verification uses **`gh`** against GitHub Actions; no Docker / **`BASE_URL`** smoke (blocked until CI green).

**What was tested:** **Testing instructions** items **1** (git tips / ancestry) and **2** (latest **Deploy to amvara9** on **`master`**). Item **3** (optional live **`https://satisfecho.de/`**) **N/A** until a successful deploy run exists.

**Results:**

| Criterion | Result | Evidence |
|-----------|--------|----------|
| **`origin/master`** / **`origin/development`** refs and ancestry | **PASS** | After **`git fetch origin`**: **`git rev-parse origin/master origin/development`** → **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`** (master), **`3917c5ea7670376bfb9bf48c6fd405c07277a072`** (development). **`git merge-base --is-ancestor origin/master origin/development`** exit **0**. |
| Latest **Deploy to amvara9** on **`master`** green | **FAIL** | **`gh run list --repo satisfecho/pos --branch master --workflow "Deploy to amvara9" --limit 5`**: newest run still **`24773000757`** (**failure**, 2026-04-22). **`gh run view 24773000757 --json conclusion`** → **`"conclusion":"failure"`**. No newer **`master`** deploy supersedes this. Root cause unchanged: marketing artifact fetch / PAT (**per prior run logs**). |
| Optional prod URL / API after green deploy | **N/A** | No green deploy to validate against. |

**Overall:** **FAIL** — **Deploy to amvara9** on **`master`** has not succeeded since verification; secrets / marketing PAT (`MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN`) must be fixed and the workflow re-run or a new **`master`** push must yield a **green** deploy before this task can **PASS**.

**Product owner feedback:** **`master`** remains at **`7a2c2bd`** while **`development`** has continued (**`3917c5ea`**); ancestry is healthy. Automated deployment from **`master`** via Actions is still blocked at the marketing-sync step until repository Actions secrets match **`config/marketing-sites.json`** PAT requirements.

**URLs tested:**

1. Failed workflow run: https://github.com/satisfecho/pos/actions/runs/24773000757  
2. Issue: https://github.com/satisfecho/pos/issues/195  

**N/A — no browser** (optional prod check skipped).

**Relevant log excerpts** — **`gh run view 24773000757 --json conclusion`** (minimal):

```json
{"conclusion":"failure","name":"Deploy to amvara9","status":"completed"}
```

---

## Test report (verification 2026-04-28)

**Date/time (UTC):** 2026-04-28 05:45–05:47 UTC  
**Log window:** `git fetch` / ref checks ~05:46 UTC; **`gh run list`** / **`gh run view`** ~05:46 UTC.

**Environment:** Local clone at **`/Users/raro42/projects/pos2`**, synced with **`./scripts/git-sync-development.sh`** before edits. Verification via **`git`** and **`gh`** against **`satisfecho/pos`**; no Docker / **`BASE_URL`** smoke (optional prod check blocked until CI green).

**What was tested:** **Testing instructions** items **1** (git tips / ancestry) and **2** (latest **Deploy to amvara9** on **`master`**). Item **3** (optional **`https://satisfecho.de/`**) **N/A** until a successful deploy run exists.

**Results:**

| Criterion | Result | Evidence |
|-----------|--------|----------|
| **`origin/master`** / **`origin/development`** refs and ancestry | **PASS** | After **`git fetch origin`**: **`git rev-parse origin/master origin/development`** → **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`** (**`master`**), **`643b3b9b073dcd97a5cf9e9bcbda2aaa24669687`** (**`development`**). **`git merge-base --is-ancestor origin/master origin/development`** exit **0**. |
| Latest **Deploy to amvara9** on **`master`** green | **FAIL** | **`gh run list --repo satisfecho/pos --branch master --workflow "Deploy to amvara9" --limit 8`**: newest completed run remains **`24773000757`** (**failure**, **`2026-04-22T10:18:20Z`**). **`gh run view 24773000757 --json conclusion`** → **`"conclusion":"failure"`**. No newer **`master`** **Deploy to amvara9** supersedes it. |
| Optional prod URL / API after green deploy | **N/A** | No green deploy to validate against. |

**Overall:** **FAIL** — automated **Deploy to amvara9** from **`master`** has not succeeded; the latest run is still the marketing-artifact / PAT failure (**`24773000757`**). Configure **`MARKETING_ARTIFACT_TOKEN`** / **`GH_TOKEN`** per repo docs, re-run failed jobs or push **`master`** to trigger a new run, then re-test.

**Product owner feedback:** **`master`** and **`development`** tips are consistent with normal fast-forward promotion history (**`master`** is ancestor of **`development`**), but CI-based production deploy from **`master`** remains blocked until the **Deploy to amvara9** workflow completes green; operators may use manual **`scripts/deploy-amvara9.sh`** only if documented and acceptable for parity.

**URLs tested:**

1. Latest (failed) workflow run: https://github.com/satisfecho/pos/actions/runs/24773000757  
2. Issue: https://github.com/satisfecho/pos/issues/195  

**N/A — no browser** (optional prod check skipped).

**Relevant log excerpts (last section)** — **`gh run view 24773000757 --json conclusion,url`**:

```json
{"conclusion":"failure","url":"https://github.com/satisfecho/pos/actions/runs/24773000757"}
```

---

## Test report (verification 2026-04-28)

**Date/time (UTC):** 2026-04-28 06:02–06:03 UTC  
**Log window:** `git fetch` / ref checks ~06:02 UTC; **`gh run list`** / **`gh run view`** ~06:03 UTC.

**Environment:** Local clone **`/Users/raro42/projects/pos2`** synced via **`./scripts/git-sync-development.sh`** before verification. Checks use **`git`** and **`gh`** against **`satisfecho/pos`**; no Docker / **`BASE_URL`** prod smoke (optional item **3** blocked until CI green).

**What was tested:** **Testing instructions** items **1** (git tips / ancestry) and **2** (latest **Deploy to amvara9** on **`master`**). Item **3** (optional **`https://satisfecho.de/`**) **N/A** until a successful deploy run exists.

**Results:**

| Criterion | Result | Evidence |
|-----------|--------|----------|
| **`origin/master`** / **`origin/development`** refs and ancestry | **PASS** | After **`git fetch origin`**: **`git rev-parse origin/master origin/development`** → **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`** (**`master`**), **`196ecc15f4b271cb509e2040d4f677a0a0c400dc`** (**`development`**). **`git merge-base --is-ancestor origin/master origin/development`** exit **0**. |
| Latest **Deploy to amvara9** on **`master`** green | **FAIL** | **`gh run list --repo satisfecho/pos --branch master --workflow "Deploy to amvara9" --limit 5`**: newest completed run remains **`24773000757`** (**failure**, **`2026-04-22T10:18:20Z`**). **`gh run view 24773000757 --json conclusion`** → **`"conclusion":"failure"`**. No newer **`master`** deploy run supersedes this outcome. |
| Optional prod URL / API after green deploy | **N/A** | No green deploy to validate against. |

**Overall:** **FAIL** — **Deploy to amvara9** triggered by **`master`** has not produced a green run since **`24773000757`**; marketing artifact / **`MARKETING_ARTIFACT_TOKEN`** / **`GH_TOKEN`** setup (per prior logs and coder summary) must be corrected and the workflow re-run or superseded by a successful **`master`** deploy before end-to-end verification **PASS**.

**Product owner feedback:** **`master`** remains behind **`development`** tips shown above while ancestry holds (**`master`** is ancestor of **`development`**). Production refresh via GitHub Actions from **`master`** is still blocked until **Deploy to amvara9** completes successfully on **`master`** after secrets/fixes.

**URLs tested:**

1. Latest (failed) workflow run: https://github.com/satisfecho/pos/actions/runs/24773000757  
2. Issue: https://github.com/satisfecho/pos/issues/195  

**N/A — no browser** (optional prod check skipped).

**Relevant log excerpts (last section)** — **`gh run view 24773000757 --repo satisfecho/pos --json conclusion,url`**:

```json
{"conclusion":"failure","url":"https://github.com/satisfecho/pos/actions/runs/24773000757"}
```

---

## Test report (verification 2026-04-28)

**Date/time (UTC):** 2026-04-28 06:12–06:14 UTC  
**Log window:** `git fetch` / ref checks ~06:12 UTC; **`gh run list`** / **`gh run view`** ~06:13 UTC.

**Environment:** Local clone **`/Users/raro42/projects/pos2`** synced via **`./scripts/git-sync-development.sh`** before verification. Checks use **`git`** and **`gh`** against **`satisfecho/pos`**; no Docker / **`BASE_URL`** prod smoke (optional item **3** blocked until CI green).

**What was tested:** **Testing instructions** items **1** (git tips / ancestry) and **2** (latest **Deploy to amvara9** on **`master`**). Item **3** (optional **`https://satisfecho.de/`**) **N/A** until a successful deploy run exists.

**Results:**

| Criterion | Result | Evidence |
|-----------|--------|----------|
| **`origin/master`** / **`origin/development`** refs and ancestry | **PASS** | After **`git fetch origin`**: **`git rev-parse origin/master origin/development`** → **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`** (**`master`**), **`ca36c86f7dfcb3166955fba76ffff379e72129b9`** (**`development`**). **`git merge-base --is-ancestor origin/master origin/development`** exit **0**. |
| Latest **Deploy to amvara9** on **`master`** green | **FAIL** | **`gh run list --repo satisfecho/pos --branch master --workflow "Deploy to amvara9" --limit 8`**: newest completed run remains **`24773000757`** (**failure**, **`2026-04-22T10:18:20Z`**). **`gh run view 24773000757 --json conclusion`** → **`"conclusion":"failure"`**. No newer **`master`** **Deploy to amvara9** supersedes it. |
| Optional prod URL / API after green deploy | **N/A** | No green deploy to validate against. |

**Overall:** **FAIL** — **Deploy to amvara9** on **`master`** has not produced a green run; latest is still **`24773000757`**. Per task and prior reports, **Actions** secrets (**`MARKETING_ARTIFACT_TOKEN`** / **`GH_TOKEN`**) and marketing artifact fetch must be fixed, then re-run the workflow or trigger a new **`master`** deploy; re-test after a **green** run.

**Product owner feedback:** **`master`** remains **`7a2c2bd`** while **`development`** has advanced (**`ca36c86`**); ancestry is correct (**`master`** ancestor of **`development`**). Automated production deploy from **`master`** via CI is still blocked at the same failed workflow until secrets/fixes yield a successful **Deploy to amvara9**.

**URLs tested:**

1. Latest (failed) workflow run: https://github.com/satisfecho/pos/actions/runs/24773000757  
2. Issue: https://github.com/satisfecho/pos/issues/195  

**N/A — no browser** (optional prod check skipped).

**Relevant log excerpts (last section)** — **`gh run view 24773000757 --repo satisfecho/pos --json conclusion,url`**:

```json
{"conclusion":"failure","createdAt":"2026-04-22T10:18:20Z","displayTitle":"Agent 001: add FEAT task for GitHub issue #195 (push to master)","status":"completed","url":"https://github.com/satisfecho/pos/actions/runs/24773000757"}
```

---

## Test report (verification 2026-04-28)

**Date/time (UTC):** 2026-04-28 06:22–06:24 UTC  
**Log window:** `git fetch` / `git rev-parse` ~06:22 UTC; **`gh run list`** / **`gh run view`** ~06:22–06:23 UTC.

**Environment:** Local clone **`/Users/raro42/projects/pos2`**; **`./scripts/git-sync-development.sh`** run before this step. Branch **`development`** (local) aligned with sync; remote verification via **`git fetch origin`** and **`gh`** against **`satisfecho/pos`**. No Docker; optional prod **`BASE_URL`** smoke not run (blocked until CI green per **Testing instructions** item **3**).

**What was tested:** **Testing instructions** items **1** (git tips / ancestry) and **2** (latest **Deploy to amvara9** on **`master`**). Item **3** (optional **`https://satisfecho.de/`**) **N/A** until a **green** deploy exists.

**Results:**

| Criterion | Result | Evidence |
|-----------|--------|----------|
| **`origin/master`** / **`origin/development`** tips and ancestry | **PASS** | After **`git fetch origin`**: **`git rev-parse origin/master origin/development`** → **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`** (**`master`**), **`4033fdce8ddbac737bd567976199129878ce01d2`** (**`development`**). **`git merge-base --is-ancestor origin/master origin/development`** exit **0**. |
| Latest **Deploy to amvara9** on **`master`** **green** | **FAIL** | **`gh run list --repo satisfecho/pos --branch master --workflow "Deploy to amvara9" --limit 8`**: newest completed run remains **`24773000757`** (**`failure`**, **`2026-04-22T10:18:20Z`**). **`gh run view 24773000757 --json conclusion,url`** → **`"conclusion":"failure"`**. No newer **`master`** deploy supersedes this run. |
| Optional prod URL / API after **green** deploy | **N/A** | No **green** deploy to validate. |

**Overall:** **FAIL** — **Deploy to amvara9** from **`master`** has not produced a newer **success** run; latest is still **`24773000757`**. Configure **Actions** secrets (**`MARKETING_ARTIFACT_TOKEN`** / **`GH_TOKEN`**) per **`config/marketing-sites.json`**, **re-run failed jobs** or trigger a fresh **`master`** deploy, then return task to **UNTESTED** for re-verification.

**Loop protection:** This criterion has failed in **many** consecutive verification passes for the **same** root cause (marketing artifact step / PAT). Further tester cycles without changing **Actions** secrets or achieving a **green** workflow run will not change the outcome; document here and prioritize fixing CI inputs.

**Product owner feedback:** **`master`** tip **`7a2c2bd`** remains an ancestor of **`development`** (**`4033fdce`**); git state is consistent with ongoing **`development`** work ahead of **`master`**. Automated production deploy via **GitHub Actions** from **`master`** is still blocked until **Deploy to amvara9** completes successfully.

**URLs tested:**

1. Failed workflow run: https://github.com/satisfecho/pos/actions/runs/24773000757  
2. Issue: https://github.com/satisfecho/pos/issues/195  

**N/A — no browser** (optional prod check skipped).

**Relevant log excerpts (last section)** — **`gh run view 24773000757 --repo satisfecho/pos --json conclusion,displayTitle,url,createdAt`**:

```json
{"conclusion":"failure","createdAt":"2026-04-22T10:18:20Z","displayTitle":"Agent 001: add FEAT task for GitHub issue #195 (push to master)","url":"https://github.com/satisfecho/pos/actions/runs/24773000757"}
```

---

## Test report (verification 2026-04-28)

**Date/time (UTC):** 2026-04-28 07:15–07:17 UTC  
**Log window:** `git fetch` / `git rev-parse` ~07:16 UTC; **`gh run list`** / **`gh run view`** ~07:16 UTC.

**Environment:** Local clone **`/Users/raro42/projects/pos2`**, **`./scripts/git-sync-development.sh`** run before edits. Verification via **`git`** and **`gh`** against **`satisfecho/pos`**; no Docker. Optional prod **`BASE_URL`** smoke **N/A** until CI green (per **Testing instructions** item **3**).

**What was tested:** **Testing instructions** items **1** (git tips / ancestry) and **2** (latest **Deploy to amvara9** on **`master`**). Item **3** (optional **`https://satisfecho.de/`**) **N/A** until a **green** deploy exists.

**Results:**

| Criterion | Result | Evidence |
|-----------|--------|----------|
| **`origin/master`** / **`origin/development`** tips and ancestry | **PASS** | After **`git fetch origin`**: **`git rev-parse origin/master origin/development`** → **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`** (**`master`**), **`f098af9cb253f6ca04077b5df44dea0b4e84d6b3`** (**`development`**). **`git merge-base --is-ancestor origin/master origin/development`** exit **0**. |
| Latest **Deploy to amvara9** on **`master`** **green** | **FAIL** | **`gh run list --repo satisfecho/pos --branch master --workflow "Deploy to amvara9" --limit 8`**: newest completed run remains **`24773000757`** (**failure**, **`2026-04-22T10:18:20Z`**). **`gh run view 24773000757 --json conclusion`** → **`"conclusion":"failure"`**. No newer **`master`** deploy supersedes it. |
| Optional prod URL / API after **green** deploy | **N/A** | No **green** deploy to validate. |

**Overall:** **FAIL** — criteria **1** pass, **2** fail. **Deploy to amvara9** from **`master`** has not produced a newer success than the known failed run **`24773000757`**. **Loop protection:** prior reports already documented the unchanged root cause (marketing artifacts / **`MARKETING_ARTIFACT_TOKEN`** / **`GH_TOKEN`**). Re-test after Actions secrets are fixed and a **green** **Deploy to amvara9** on **`master`** exists.

**Product owner feedback:** **`master`** (**`7a2c2bd`**) remains an ancestor of **`development`** (**`f098af9`**), so branch history is fine, but automated production deploy from **`master`** via GitHub Actions is still blocked until the workflow completes green; manual **`scripts/deploy-amvara9.sh`** remains the documented fallback.

**URLs tested:**

1. Latest (failed) workflow run: https://github.com/satisfecho/pos/actions/runs/24773000757  
2. Issue: https://github.com/satisfecho/pos/issues/195  

**N/A — no browser** (optional prod check skipped).

**Relevant log excerpts (last section)** — **`gh run list`** (first line, **`master`** **Deploy to amvara9**):

```
completed	failure	Agent 001: add FEAT task for GitHub issue #195 (push to master)	Deploy to amvara9	master	push	24773000757	10s	2026-04-22T10:18:20Z
```

---

## Test report (verification 2026-04-28)

**Date/time (UTC):** 2026-04-28 07:24–07:26 UTC  
**Log window:** `git fetch` / `git rev-parse` ~07:25 UTC; **`gh run list`** / **`gh run view`** ~07:25 UTC.

**Environment:** Local clone **`/Users/raro42/projects/pos2`**, **`./scripts/git-sync-development.sh`** run before verification. Checks use **`git`** and **`gh`** against **`satisfecho/pos`**; no Docker. Optional prod **`BASE_URL`** check per item **3** **N/A** until a **green** **Deploy to amvara9** on **`master`** exists.

**What was tested:** **Testing instructions** items **1** (git tips / ancestry) and **2** (latest **Deploy to amvara9** on **`master`**). Item **3** (optional **`https://satisfecho.de/`**) **N/A** until a successful deploy run.

**Results:**

| Criterion | Result | Evidence |
|-----------|--------|----------|
| **`origin/master`** / **`origin/development`** tips and ancestry | **PASS** | After **`git fetch origin`**: **`git rev-parse origin/master origin/development`** → **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`** (**`master`**), **`b21f21cd9b8534f008409313210d55fc5b90046b`** (**`development`**). **`git merge-base --is-ancestor origin/master origin/development`** exit **0**. |
| Latest **Deploy to amvara9** on **`master`** **green** | **FAIL** | **`gh run list --repo satisfecho/pos --branch master --workflow "Deploy to amvara9" --limit 8`**: newest completed run remains **`24773000757`** (**failure**, **`2026-04-22T10:18:20Z`**). **`gh run view 24773000757 --json conclusion`** → **`"conclusion":"failure"`**. No newer **`master`** deploy supersedes this run. |
| Optional prod URL / API after **green** deploy | **N/A** | No **green** deploy on **`master`** after **`24773000757`**. |

**Overall:** **FAIL** — **Deploy to amvara9** on **`master`** has not produced a newer **success** than the documented failed run **`24773000757`**. **Loop protection** (prior reports): repeated verification does not change outcome until **Actions** secrets (**`MARKETING_ARTIFACT_TOKEN`** / **`GH_TOKEN`**) and marketing artifact fetch succeed, then **re-run** or a new **`master`** push yields a **green** workflow.

**Product owner feedback:** **`master`** (**`7a2c2bd`**) remains an ancestor of **`development`** (**`b21f21c`**), but CI-based production deploy from **`master`** is still blocked at the same failed workflow run until repository configuration allows **Fetch marketing site artifacts** to pass.

**URLs tested:**

1. Latest (failed) workflow run: https://github.com/satisfecho/pos/actions/runs/24773000757  
2. Issue: https://github.com/satisfecho/pos/issues/195  

**N/A — no browser** (optional prod check skipped).

**Relevant log excerpts (last section)** — **`gh run view 24773000757 --repo satisfecho/pos --json conclusion,url,createdAt`**:

```json
{"conclusion":"failure","createdAt":"2026-04-22T10:18:20Z","url":"https://github.com/satisfecho/pos/actions/runs/24773000757"}
```

---

## Test report (verification 2026-04-28)

**Date/time (UTC):** 2026-04-28 07:33–07:35 UTC  
**Log window:** `git fetch` / `git rev-parse` ~07:34 UTC; **`gh run list`** / **`gh run view`** ~07:34 UTC.

**Environment:** Local clone **`/Users/raro42/projects/pos2`**, **`./scripts/git-sync-development.sh`** run before verification. Checks use **`git`** and **`gh`** against **`satisfecho/pos`**; no Docker. Optional prod **`BASE_URL`** smoke **N/A** until CI green (item **3**).

**What was tested:** **Testing instructions** items **1** (git tips / ancestry) and **2** (latest **Deploy to amvara9** on **`master`**). Item **3** (optional **`https://satisfecho.de/`**) **N/A** until a **green** deploy exists.

**Results:**

| Criterion | Result | Evidence |
|-----------|--------|----------|
| **`origin/master`** / **`origin/development`** tips and ancestry | **PASS** | After **`git fetch origin`**: **`git rev-parse origin/master origin/development`** → **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`** (**`master`**), **`c554b88198c093d1615ffe2b75a5d62d832932d3`** (**`development`**). **`git merge-base --is-ancestor origin/master origin/development`** exit **0**. |
| Latest **Deploy to amvara9** on **`master`** **green** | **FAIL** | **`gh run list --repo satisfecho/pos --branch master --workflow "Deploy to amvara9" --limit 8`**: newest completed run remains **`24773000757`** (**failure**, **`2026-04-22T10:18:20Z`**). **`gh run view 24773000757 --json conclusion`** → **`"conclusion":"failure"`**. No newer **`master`** deploy supersedes this run. |
| Optional prod URL / API after **green** deploy | **N/A** | No **green** deploy on **`master`** after **`24773000757`**. |

**Overall:** **FAIL** — criterion **2** unchanged: **Deploy to amvara9** from **`master`** has not produced a newer **success** than **`24773000757`**. **Loop protection:** prior reports already established the blocker (marketing artifacts / **`MARKETING_ARTIFACT_TOKEN`** / **`GH_TOKEN`**); further tester passes without fixing **Actions** secrets or achieving a **green** run only repeat the same outcome.

**Product owner feedback:** **`master`** (**`7a2c2bd`**) remains an ancestor of **`development`** (**`c554b881`**); git promotion history is consistent. Automated production deploy from **`master`** via GitHub Actions is still blocked until **Deploy to amvara9** completes green on **`master`** (configure secrets per **`config/marketing-sites.json`**, re-run workflow or trigger a new **`master`** deploy).

**URLs tested:**

1. Latest (failed) workflow run: https://github.com/satisfecho/pos/actions/runs/24773000757  
2. Issue: https://github.com/satisfecho/pos/issues/195  

**N/A — no browser** (optional prod check skipped).

**Relevant log excerpts (last section)** — **`gh run view 24773000757 --repo satisfecho/pos --json conclusion,url`**:

```json
{"conclusion":"failure","url":"https://github.com/satisfecho/pos/actions/runs/24773000757"}
```

---

## Test report (verification 2026-04-28)

**Date/time (UTC):** 2026-04-28 07:42–07:44 UTC  
**Log window:** `./scripts/git-sync-development.sh` ~07:42 UTC; **`git fetch`** / **`git rev-parse`** ~07:43 UTC; **`gh run list`** / **`gh run view`** ~07:43 UTC.

**Environment:** Local clone **`/Users/raro42/projects/pos2`**, synced via **`./scripts/git-sync-development.sh`** before verification. **`development`** checked per workflow rules. Verification uses **`git`** and **`gh`** against **`satisfecho/pos`**; no Docker. Optional prod **`BASE_URL`** smoke (item **3**) **N/A** until a **green** **Deploy to amvara9** on **`master`** exists.

**What was tested:** **Testing instructions** items **1** (git tips / ancestry) and **2** (latest **Deploy to amvara9** on **`master`**). Item **3** (optional **`https://satisfecho.de/`**) **N/A** until a successful deploy run.

**Results:**

| Criterion | Result | Evidence |
|-----------|--------|----------|
| **`origin/master`** / **`origin/development`** tips and ancestry | **PASS** | After **`git fetch origin`**: **`git rev-parse origin/master origin/development`** → **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`** (**`master`**), **`b1ee51a422f6d950a37d552a2760ec0e82664bf1`** (**`development`**). **`git merge-base --is-ancestor origin/master origin/development`** exit **0**. |
| Latest **Deploy to amvara9** on **`master`** **green** | **FAIL** | **`gh run list --repo satisfecho/pos --branch master --workflow "Deploy to amvara9" --limit 8`**: newest completed run remains **`24773000757`** (**failure**, **`2026-04-22T10:18:20Z`**). **`gh run view 24773000757 --json conclusion`** → **`"conclusion":"failure"`**. No newer **`master`** deploy supersedes this run. |
| Optional prod URL / API after **green** deploy | **N/A** | No **green** deploy on **`master`** after **`24773000757`**. |

**Overall:** **FAIL** — criterion **2** fails: **Deploy to amvara9** from **`master`** has not produced a newer **success** than **`24773000757`**. **Loop protection:** prior reports document the unchanged root cause (marketing artifact fetch / **`MARKETING_ARTIFACT_TOKEN`** / **`GH_TOKEN`**); fix **Actions** secrets per **`config/marketing-sites.json`**, **re-run failed jobs** or push **`master`** to trigger a green run, then move task back to **UNTESTED** for re-verification.

**Product owner feedback:** **`master`** (**`7a2c2bd`**) remains an ancestor of **`development`** (**`b1ee51a4`**); git refs are consistent. Automated production deploy from **`master`** via GitHub Actions remains blocked until **Deploy to amvara9** completes green on **`master`**.

**URLs tested:**

1. Latest (failed) workflow run: https://github.com/satisfecho/pos/actions/runs/24773000757  
2. Issue: https://github.com/satisfecho/pos/issues/195  

**N/A — no browser** (optional prod check skipped).

**Relevant log excerpts (last section)** — **`gh run view 24773000757 --repo satisfecho/pos --json conclusion,url,createdAt`**:

```json
{"conclusion":"failure","createdAt":"2026-04-22T10:18:20Z","url":"https://github.com/satisfecho/pos/actions/runs/24773000757"}
```

---

## Test report (verification 2026-04-28)

**Date/time (UTC):** 2026-04-28 07:52–07:53 UTC  
**Log window:** `git fetch` / `git rev-parse` ~07:52 UTC; **`gh run list`** / **`gh run view`** ~07:52 UTC.

**Environment:** Local clone **`/Users/raro42/projects/pos2`**, **`./scripts/git-sync-development.sh`** run before this session. Verification via **`git`** and **`gh`** against **`satisfecho/pos`**; no Docker. Optional prod **`BASE_URL`** check (item **3**) **N/A** until a **green** **Deploy to amvara9** on **`master`** exists.

**What was tested:** **Testing instructions** items **1** (git tips / ancestry) and **2** (latest **Deploy to amvara9** on **`master`**). Item **3** (optional **`https://satisfecho.de/`**) **N/A** until a successful deploy run.

**Results:**

| Criterion | Result | Evidence |
|-----------|--------|----------|
| **`origin/master`** / **`origin/development`** tips and ancestry | **PASS** | After **`git fetch origin`**: **`git rev-parse origin/master origin/development`** → **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`** (**`master`**), **`e8fcff8c25fcf364d5f6c17147c228873c33b2af`** (**`development`**). **`git merge-base --is-ancestor origin/master origin/development`** exit **0**. |
| Latest **Deploy to amvara9** on **`master`** **green** | **FAIL** | **`gh run list --repo satisfecho/pos --branch master --workflow "Deploy to amvara9" --limit 10`**: newest completed run remains **`24773000757`** (**failure**, **`2026-04-22T10:18:20Z`**). **`gh run view 24773000757 --json conclusion`** → **`"conclusion":"failure"`**. No newer **`master`** deploy supersedes this run. |
| Optional prod URL / API after **green** deploy | **N/A** | No **green** deploy on **`master`** after **`24773000757`**. |

**Overall:** **FAIL** — **Deploy to amvara9** from **`master`** has not produced a newer **success** than **`24773000757`**. Root cause unchanged per prior reports: marketing artifact fetch requires **`MARKETING_ARTIFACT_TOKEN`** / **`GH_TOKEN`** in Actions (see **`config/marketing-sites.json`**). **Loop protection:** repeated verification without fixing secrets cannot change this outcome.

**Product owner feedback:** **`master`** (**`7a2c2bd`**) remains an ancestor of **`development`** (**`e8fcff8c`**), so branch history is consistent. Automated production deploy from **`master`** via GitHub Actions is still blocked until **Deploy to amvara9** completes green; operators may use **`scripts/deploy-amvara9.sh`** per task **Testing instructions** item **4** when CI cannot be fixed immediately.

**URLs tested:**

1. Latest (failed) workflow run: https://github.com/satisfecho/pos/actions/runs/24773000757  
2. Issue: https://github.com/satisfecho/pos/issues/195  

**N/A — no browser** (optional prod check skipped).

**Relevant log excerpts (last section)** — **`gh run view 24773000757 --repo satisfecho/pos --json conclusion,url,createdAt`**:

```json
{"conclusion":"failure","createdAt":"2026-04-22T10:18:20Z","url":"https://github.com/satisfecho/pos/actions/runs/24773000757"}
```

---

## Test report (verification 2026-04-28)

**Date/time (UTC):** 2026-04-28 08:01–08:03 UTC  
**Log window:** `./scripts/git-sync-development.sh` ~08:01 UTC; **`git fetch origin`** / **`git rev-parse`** ~08:01 UTC; **`gh run list`** / **`gh run view`** ~08:02 UTC.

**Environment:** Local clone **`/Users/raro42/projects/pos2`**, synced on **`development`** before verification. **`gh`** CLI against **`satisfecho/pos`**; no Docker / no optional prod **`BASE_URL`** smoke (item **3** **N/A** until a **green** **Deploy to amvara9** on **`master`** exists).

**What was tested:** **Testing instructions** items **1** (git tips / ancestry) and **2** (latest **Deploy to amvara9** on **`master`**). Item **3** (optional **`https://satisfecho.de/`** / API) **N/A** until a successful deploy run.

**Results:**

| Criterion | Result | Evidence |
|-----------|--------|----------|
| **`origin/master`** / **`origin/development`** tips and ancestry | **PASS** | After **`git fetch origin`**: **`git rev-parse origin/master origin/development`** → **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`** (**`master`**), **`426ab8e9b5c7765789316db0011ee22d0db27d6b`** (**`development`**). **`git merge-base --is-ancestor origin/master origin/development`** exit **0**. |
| Latest **Deploy to amvara9** on **`master`** **green** | **FAIL** | **`gh run list --repo satisfecho/pos --branch master --workflow "Deploy to amvara9" --limit 10`**: newest completed run remains **`24773000757`** (**failure**, **`2026-04-22T10:18:20Z`**). **`gh run view 24773000757 --repo satisfecho/pos --json conclusion`** → **`"conclusion":"failure"`**. No newer **`master`** deploy supersedes this run. |
| Optional prod URL / API after **green** deploy | **N/A** | No **green** **`master`** deploy after **`24773000757`** to validate. |

**Overall:** **FAIL** — criterion **2** fails; **Deploy to amvara9** has not produced a newer **success** than **`24773000757`**. **Loop protection** (prior reports): outcome unchanged until **Actions** secrets (**`MARKETING_ARTIFACT_TOKEN`** / **`GH_TOKEN`** per **`config/marketing-sites.json`**) allow **Fetch marketing site artifacts** to pass and a workflow run completes **green**, or operators follow **Testing instructions** item **4** (manual **`scripts/deploy-amvara9.sh`**).

**Product owner feedback:** **`master`** (**`7a2c2bd`**) remains an ancestor of **`development`** (**`426ab8e9`**), so ref layout is consistent. Automated production deploy from **`master`** via GitHub Actions is still blocked at the last known failed **Deploy to amvara9** run until CI is fixed and re-run or superseded.

**URLs tested:**

1. Latest (failed) workflow run: https://github.com/satisfecho/pos/actions/runs/24773000757  
2. Issue: https://github.com/satisfecho/pos/issues/195  

**N/A — no browser** (optional prod check skipped).

**Relevant log excerpts (last section)** — **`gh run list`** (first line, **`master`**, **Deploy to amvara9**):

```
completed	failure	Agent 001: add FEAT task for GitHub issue #195 (push to master)	Deploy to amvara9	master	push	24773000757	10s	2026-04-22T10:18:20Z
```

**Relevant log excerpts** — **`gh run view 24773000757 --repo satisfecho/pos --json conclusion,url`**:

```json
{"conclusion":"failure","url":"https://github.com/satisfecho/pos/actions/runs/24773000757"}
```

---

## Test report (verification 2026-04-28)

**Date/time (UTC):** 2026-04-28 08:09–08:11 UTC  
**Log window:** `git fetch origin` / `git rev-parse` ~08:10 UTC; **`gh run list`** / **`gh run view`** ~08:10 UTC.

**Environment:** Local clone **`/Users/raro42/projects/pos2`**, **`./scripts/git-sync-development.sh`** run at session start. Verification via **`git`** and **`gh`** against **`satisfecho/pos`**; no Docker. Optional prod **`BASE_URL`** / **`https://satisfecho.de/`** (item **3**) **N/A** until a **green** **Deploy to amvara9** on **`master`** exists.

**What was tested:** **Testing instructions** items **1** (git tips / ancestry) and **2** (latest **Deploy to amvara9** on **`master`**). Item **3** skipped (**N/A**).

**Results:**

| Criterion | Result | Evidence |
|-----------|--------|----------|
| **`origin/master`** / **`origin/development`** tips and ancestry | **PASS** | After **`git fetch origin`**: **`git rev-parse origin/master origin/development`** → **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`** (**`master`**), **`7ca6e620e909d12d7c42226466b51e31e82a7127`** (**`development`**). **`git merge-base --is-ancestor origin/master origin/development`** exit **0**. |
| Latest **Deploy to amvara9** on **`master`** **green** | **FAIL** | **`gh run list --repo satisfecho/pos --branch master --workflow "Deploy to amvara9" --limit 10`**: newest completed run remains **`24773000757`** (**failure**, **`2026-04-22T10:18:20Z`**). **`gh run view 24773000757 --json conclusion`** → **`"conclusion":"failure"`**. No newer **`master`** deploy supersedes this run. |
| Optional prod URL / API after **green** deploy | **N/A** | No **green** **`master`** deploy after **`24773000757`**. |

**Overall:** **FAIL** — criterion **2** fails; automated **Deploy to amvara9** from **`master`** has not produced a newer **success** than **`24773000757`**. **Loop protection:** prior reports document the stable blocker (marketing artifact fetch / **`MARKETING_ARTIFACT_TOKEN`** / **`GH_TOKEN`** per **`config/marketing-sites.json`**); re-test after **Actions** secrets are fixed and a **green** workflow run exists, or document manual **`scripts/deploy-amvara9.sh`** per **Testing instructions** item **4**.

**Product owner feedback:** **`master`** (**`7a2c2bd`**) remains an ancestor of **`development`** (**`7ca6e620`**), so git promotion ancestry is sound. CI-based production deploy from **`master`** is still blocked until **Deploy to amvara9** completes green on **`master`**.

**URLs tested:**

1. Latest (failed) workflow run: https://github.com/satisfecho/pos/actions/runs/24773000757  
2. Issue: https://github.com/satisfecho/pos/issues/195  

**N/A — no browser** (optional prod check skipped).

**Relevant log excerpts (last section)** — **`gh run list`** (first line, **`master`**, **Deploy to amvara9**):

```
completed	failure	Agent 001: add FEAT task for GitHub issue #195 (push to master)	Deploy to amvara9	master	push	24773000757	10s	2026-04-22T10:18:20Z
```

**Relevant log excerpts** — **`gh run view 24773000757 --repo satisfecho/pos --json conclusion,url`**:

```json
{"conclusion":"failure","url":"https://github.com/satisfecho/pos/actions/runs/24773000757"}
```

---

## Test report (verification 2026-04-28)

**Date/time (UTC):** 2026-04-28 08:18–08:20 UTC  
**Log window:** `./scripts/git-sync-development.sh` ~session start; **`git fetch origin`** / **`git rev-parse`** ~08:18 UTC; **`gh run list`** / **`gh run view`** ~08:19 UTC.

**Environment:** Local clone **`/Users/raro42/projects/pos2`**, branch **`development`** synced per workspace rules. Verification via **`git`** and **`gh`** against **`satisfecho/pos`**. No Docker; optional prod **`https://satisfecho.de/`** / API check (**Testing instructions** item **3**) **N/A** until a **green** **Deploy to amvara9** on **`master`** exists.

**What was tested:** **Testing instructions** items **1** (git tips / ancestry) and **2** (latest **Deploy to amvara9** on **`master`**). Item **3** **N/A**.

**Results:**

| Criterion | Result | Evidence |
|-----------|--------|----------|
| **`origin/master`** / **`origin/development`** tips and ancestry | **PASS** | After **`git fetch origin`**: **`git rev-parse origin/master origin/development`** → **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`** (**`master`**), **`3309da9aeb8681bae5acebf3a19fbe9b76da36a7`** (**`development`**). **`git merge-base --is-ancestor origin/master origin/development`** exit **0**. |
| Latest **Deploy to amvara9** on **`master`** **green** | **FAIL** | **`gh run list --repo satisfecho/pos --branch master --workflow "Deploy to amvara9" --limit 5`**: newest completed run remains **`24773000757`** (**failure**, **`2026-04-22T10:18:20Z`**). **`gh run view 24773000757 --json conclusion`** → **`"conclusion":"failure"`**. No newer **`master`** deploy supersedes this run. |
| Optional prod URL / API after **green** deploy | **N/A** | No **green** **`master`** deploy after **`24773000757`**. |

**Overall:** **FAIL** — criterion **2** fails. **Loop protection:** numerous prior reports document the same blocker (marketing artifact fetch / **`MARKETING_ARTIFACT_TOKEN`** / **`GH_TOKEN`** per **`config/marketing-sites.json`**); outcome cannot turn **PASS** until **Actions** secrets allow a **green** **Deploy to amvara9** on **`master`**, or the team accepts manual **`scripts/deploy-amvara9.sh`** parity per **Testing instructions** item **4** and re-scopes verification.

**Product owner feedback:** **`master`** (**`7a2c2bd`**) remains an ancestor of **`development`** (**`3309da9`**); git refs are consistent. Automated production deploy from **`master`** via GitHub Actions is still blocked at the latest failed **Deploy to amvara9** run until CI completes green or operators document an approved manual deploy path.

**URLs tested:**

1. Latest (failed) workflow run: https://github.com/satisfecho/pos/actions/runs/24773000757  
2. Issue: https://github.com/satisfecho/pos/issues/195  

**N/A — no browser** (optional prod check skipped).

**Relevant log excerpts (last section)** — **`gh run view 24773000757 --repo satisfecho/pos --json conclusion,url,createdAt`**:

```json
{"conclusion":"failure","createdAt":"2026-04-22T10:18:20Z","url":"https://github.com/satisfecho/pos/actions/runs/24773000757"}
```

---

## Test report (verification 2026-04-28)

**Date/time (UTC):** 2026-04-28 08:27–08:29 UTC  
**Log window:** `./scripts/git-sync-development.sh` ~08:27 UTC; **`git fetch origin`** / **`git rev-parse`** ~08:27 UTC; **`gh run list`** / **`gh run view`** ~08:27 UTC.

**Environment:** Local clone **`/Users/raro42/projects/pos2`**, synced on **`development`** before edits. Verification via **`git`** and **`gh`** against **`satisfecho/pos`**; no Docker. Optional prod **`https://satisfecho.de/`** / API (**Testing instructions** item **3**) **N/A** until a **green** **Deploy to amvara9** on **`master`** exists.

**What was tested:** **Testing instructions** items **1** (git tips / ancestry) and **2** (latest **Deploy to amvara9** on **`master`**). Item **3** **N/A**.

**Results:**

| Criterion | Result | Evidence |
|-----------|--------|----------|
| **`origin/master`** / **`origin/development`** tips and ancestry | **PASS** | After **`git fetch origin`**: **`git rev-parse origin/master origin/development`** → **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`** (**`master`**), **`8770e355b1caa69a328e086263b243910f6fb52d`** (**`development`**). **`git merge-base --is-ancestor origin/master origin/development`** exit **0**. |
| Latest **Deploy to amvara9** on **`master`** **green** | **FAIL** | **`gh run list --repo satisfecho/pos --branch master --workflow "Deploy to amvara9" --limit 8`**: newest completed run remains **`24773000757`** (**failure**, **`2026-04-22T10:18:20Z`**). **`gh run view 24773000757 --json conclusion`** → **`"conclusion":"failure"`**. No newer **`master`** deploy supersedes this run. |
| Optional prod URL / API after **green** deploy | **N/A** | No **green** **`master`** deploy after **`24773000757`**. |

**Overall:** **FAIL** — criterion **2** fails. **Loop protection:** prior reports already document the stable external blocker (marketing artifact fetch / **`MARKETING_ARTIFACT_TOKEN`** / **`GH_TOKEN`** per **`config/marketing-sites.json`**); re-test after **Actions** secrets are fixed and a **green** **Deploy to amvara9** on **`master`** exists, or the team explicitly re-scopes verification around **Testing instructions** item **4** (manual **`scripts/deploy-amvara9.sh`**).

**Product owner feedback:** **`master`** (**`7a2c2bd`**) remains an ancestor of **`development`** (**`8770e355`**); git refs are consistent. Automated production deploy from **`master`** via GitHub Actions is still blocked at run **`24773000757`** until CI completes green or operators use the documented manual deploy path.

**URLs tested:**

1. Latest (failed) workflow run: https://github.com/satisfecho/pos/actions/runs/24773000757  
2. Issue: https://github.com/satisfecho/pos/issues/195  

**N/A — no browser** (optional prod check skipped).

**Relevant log excerpts (last section)** — **`gh run view 24773000757 --repo satisfecho/pos --json conclusion,url`**:

```json
{"conclusion":"failure","url":"https://github.com/satisfecho/pos/actions/runs/24773000757"}
```

**`gh run list`** (first line, **`master`**, **Deploy to amvara9**):

```
completed	failure	Agent 001: add FEAT task for GitHub issue #195 (push to master)	Deploy to amvara9	master	push	24773000757	10s	2026-04-22T10:18:20Z
```

---

## Test report (verification 2026-04-28)

**Date/time (UTC):** 2026-04-28 08:36–08:38 UTC  
**Log window:** `git fetch origin` / `git rev-parse` ~08:36 UTC; **`gh run list`** / **`gh run view`** ~08:36 UTC.

**Environment:** Local clone **`/Users/raro42/projects/pos2`**, **`./scripts/git-sync-development.sh`** run at step start; task renamed **UNTESTED** → **TESTING** before verification. Checks use **`git`** and **`gh`** against **`satisfecho/pos`**; no Docker. Optional prod **`https://satisfecho.de/`** (**Testing instructions** item **3**) **N/A** until a **green** **Deploy to amvara9** on **`master`**.

**What was tested:** **Testing instructions** items **1** (git tips / ancestry) and **2** (latest **Deploy to amvara9** on **`master`**). Item **3** **N/A**.

**Results:**

| Criterion | Result | Evidence |
|-----------|--------|----------|
| **`origin/master`** / **`origin/development`** tips and ancestry | **PASS** | After **`git fetch origin`**: **`git rev-parse origin/master origin/development`** → **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`** (**`master`**), **`74cbb7eb028daa1c53f379df37d56a1c782edbee`** (**`development`**). **`git merge-base --is-ancestor origin/master origin/development`** exit **0**. |
| Latest **Deploy to amvara9** on **`master`** **green** | **FAIL** | **`gh run list --repo satisfecho/pos --branch master --workflow "Deploy to amvara9" --limit 8`**: newest completed run remains **`24773000757`** (**failure**, **`2026-04-22T10:18:20Z`**). **`gh run view 24773000757 --json conclusion`** → **`"conclusion":"failure"`**. No newer **`master`** deploy supersedes this run. |
| Optional prod URL / API after **green** deploy | **N/A** | No **green** **`master`** deploy after **`24773000757`**. |

**Overall:** **FAIL** — criterion **2** fails; **Deploy to amvara9** from **`master`** has not produced a newer **success** than **`24773000757`**. **Loop protection:** same external blocker as prior reports (marketing artifacts / **`MARKETING_ARTIFACT_TOKEN`** / **`GH_TOKEN`** per **`config/marketing-sites.json`** until Actions secrets allow **Fetch marketing site artifacts** to pass).

**Product owner feedback:** **`master`** (**`7a2c2bd`**) remains an ancestor of **`development`** (**`74cbb7eb`**); git refs are consistent with ongoing **`development`** work. Automated production deploy from **`master`** via GitHub Actions is still blocked at run **`24773000757`** until CI completes green or operators follow **Testing instructions** item **4** (manual **`scripts/deploy-amvara9.sh`**).

**URLs tested:**

1. Latest (failed) workflow run: https://github.com/satisfecho/pos/actions/runs/24773000757  
2. Issue: https://github.com/satisfecho/pos/issues/195  

**N/A — no browser** (optional prod check skipped).

**Relevant log excerpts (last section)** — **`gh run view 24773000757 --repo satisfecho/pos --json conclusion,url,createdAt`**:

```json
{"conclusion":"failure","createdAt":"2026-04-22T10:18:20Z","status":"completed","url":"https://github.com/satisfecho/pos/actions/runs/24773000757"}
```

---

## Test report (verification 2026-04-28)

**Date/time (UTC):** 2026-04-28 08:44–08:46 UTC  
**Log window:** `./scripts/git-sync-development.sh` ~session start; **`git fetch origin`** / **`git rev-parse`** ~08:44 UTC; **`gh run list`** / **`gh run view`** ~08:44 UTC.

**Environment:** Local clone **`/Users/raro42/projects/pos2`** on **`development`** after sync. Verification uses **`git`** and **`gh`** against **`satisfecho/pos`**; no Docker. Optional prod **`https://satisfecho.de/`** (**Testing instructions** item **3**) **N/A** until a **green** **Deploy to amvara9** on **`master`** exists.

**What was tested:** **Testing instructions** items **1** (git tips / ancestry) and **2** (latest **Deploy to amvara9** on **`master`**). Item **3** **N/A**.

**Results:**

| Criterion | Result | Evidence |
|-----------|--------|----------|
| **`origin/master`** / **`origin/development`** tips and ancestry | **PASS** | After **`git fetch origin`**: **`git rev-parse origin/master origin/development`** → **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`** (**`master`**), **`94b19fc2a3344b1a565035f7cc719a528e9f1c97`** (**`development`**). **`git merge-base --is-ancestor origin/master origin/development`** exit **0**. |
| Latest **Deploy to amvara9** on **`master`** **green** | **FAIL** | **`gh run list --repo satisfecho/pos --branch master --workflow "Deploy to amvara9" --limit 5`**: newest completed run remains **`24773000757`** (**failure**, **`2026-04-22T10:18:20Z`**). **`gh run view 24773000757 --repo satisfecho/pos --json conclusion,url`** → **`"conclusion":"failure"`**. No newer **`master`** deploy supersedes this run. |
| Optional prod URL / API after **green** deploy | **N/A** | No **green** **`master`** deploy after **`24773000757`**. |

**Overall:** **FAIL** — criterion **2** fails. **Loop protection:** same stable outcome as prior reports until **Actions** secrets (**`MARKETING_ARTIFACT_TOKEN`** / **`GH_TOKEN`** per **`config/marketing-sites.json`**) allow **Fetch marketing site artifacts** to pass and a newer **Deploy to amvara9** on **`master`** completes **success**, or the team explicitly verifies **Testing instructions** item **4** (manual **`scripts/deploy-amvara9.sh`**) and re-scopes acceptance.

**Product owner feedback:** **`master`** (**`7a2c2bd`**) remains an ancestor of **`development`** (**`94b19fc2`**); git refs are consistent. Automated production deploy from **`master`** via GitHub Actions is still blocked at workflow run **`24773000757`** until CI is fixed and re-run or superseded by a **green** deploy.

**URLs tested:**

1. Latest (failed) workflow run: https://github.com/satisfecho/pos/actions/runs/24773000757  
2. Issue: https://github.com/satisfecho/pos/issues/195  

**N/A — no browser** (optional prod check skipped).

**Relevant log excerpts (last section)** — **`gh run view 24773000757 --repo satisfecho/pos --json conclusion,url`**:

```json
{"conclusion":"failure","url":"https://github.com/satisfecho/pos/actions/runs/24773000757"}
```

---

## Test report (verification 2026-04-28)

**Date/time (UTC):** 2026-04-28 09:05–09:08 UTC  
**Log window:** `./scripts/git-sync-development.sh` at step start; `git fetch origin` / `git rev-parse` ~09:06 UTC; `gh run list` / `gh run view` ~09:06 UTC.

**Environment:** Local clone `/Users/raro42/projects/pos2`, synced on **`development`** before edits. Verification via **`git`** and **`gh`** against **`satisfecho/pos`**; no Docker. Optional prod **`https://satisfecho.de/`** (Testing instructions item **3**) **N/A** until a **green** **Deploy to amvara9** on **`master`** exists.

**What was tested:** Testing instructions items **1** (git tips / ancestry) and **2** (latest **Deploy to amvara9** on **`master`**). Item **3** **N/A**.

**Results:**

| Criterion | Result | Evidence |
|-----------|--------|----------|
| **`origin/master`** / **`origin/development`** tips and ancestry | **PASS** | After **`git fetch origin`**: **`git rev-parse origin/master origin/development`** → **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`** (**`master`**), **`2ffa3b0a7f13b0bb8fcc16a31a1b285930f53477`** (**`development`**). **`git merge-base --is-ancestor origin/master origin/development`** exit **0**. |
| Latest **Deploy to amvara9** on **`master`** **green** | **FAIL** | **`gh run list --repo satisfecho/pos --branch master --workflow "Deploy to amvara9" --limit 8`**: newest completed run remains **`24773000757`** (**failure**, **`2026-04-22T10:18:20Z`**). **`gh run view 24773000757 --repo satisfecho/pos --json conclusion`** → **`"conclusion":"failure"`**. No newer **`master`** deploy supersedes this run. |
| Optional prod URL / API after **green** deploy | **N/A** | No **green** **`master`** deploy after **`24773000757`**. |

**Overall:** **FAIL** — criterion **2** fails. **Deploy to amvara9** from **`master`** has not produced a newer **success** than **`24773000757`**. **Loop protection:** prior reports repeatedly document the same blocker (marketing artifact fetch / **`MARKETING_ARTIFACT_TOKEN`** / **`GH_TOKEN`** per **`config/marketing-sites.json`**); further tester passes without fixing **Actions** secrets or achieving a **green** workflow cannot change this outcome.

**Product owner feedback:** **`master`** (**`7a2c2bd`**) remains an ancestor of **`development`** (**`2ffa3b0a`**); git refs are consistent. Automated production deploy from **`master`** via GitHub Actions is still blocked until **Deploy to amvara9** completes green on **`master`** (configure secrets, re-run failed jobs, or trigger a new **`master`** deploy), or the team explicitly accepts manual **`scripts/deploy-amvara9.sh`** per Testing instructions item **4**.

**URLs tested:**

1. Latest (failed) workflow run: https://github.com/satisfecho/pos/actions/runs/24773000757  
2. Issue: https://github.com/satisfecho/pos/issues/195  

**N/A — no browser** (optional prod check skipped).

**Relevant log excerpts (last section)** — **`gh run view 24773000757 --repo satisfecho/pos --json conclusion,url,createdAt`**:

```json
{"conclusion":"failure","createdAt":"2026-04-22T10:18:20Z","status":"completed","url":"https://github.com/satisfecho/pos/actions/runs/24773000757"}
```

---

## Test report (verification 2026-04-28)

**Date/time (UTC):** 2026-04-28 09:01–09:03 UTC  
**Log window:** `./scripts/git-sync-development.sh` at step start; `git fetch origin` / `git rev-parse` ~09:01 UTC; `gh run list` / `gh run view` ~09:02 UTC.

**Environment:** Local clone `/Users/raro42/projects/pos2`, synced on **`development`** before edits. Task renamed **UNTESTED** → **TESTING** for this run. Verification via **`git`** and **`gh`** against **`satisfecho/pos`**; no Docker. Optional prod **`https://satisfecho.de/`** (Testing instructions item **3**) **N/A** until a **green** **Deploy to amvara9** on **`master`** exists.

**What was tested:** Testing instructions items **1** (git tips / ancestry) and **2** (latest **Deploy to amvara9** on **`master`**). Item **3** **N/A**.

**Results:**

| Criterion | Result | Evidence |
|-----------|--------|----------|
| **`origin/master`** / **`origin/development`** tips and ancestry | **PASS** | After **`git fetch origin`**: **`git rev-parse origin/master origin/development`** → **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`** (**`master`**), **`7fecd430e2c26a33bf00101146388dc792f825a7`** (**`development`**). **`git merge-base --is-ancestor origin/master origin/development`** exit **0**. |
| Latest **Deploy to amvara9** on **`master`** **green** | **FAIL** | **`gh run list --repo satisfecho/pos --branch master --workflow "Deploy to amvara9" --limit 10`**: newest completed run remains **`24773000757`** (**failure**, **`2026-04-22T10:18:20Z`**). **`gh run view 24773000757 --repo satisfecho/pos --json conclusion`** → **`"conclusion":"failure"`**. No newer **`master`** deploy supersedes this run. |
| Optional prod URL / API after **green** deploy | **N/A** | No **green** **`master`** deploy after **`24773000757`**. |

**Overall:** **FAIL** — criterion **2** fails. **Deploy to amvara9** from **`master`** has not produced a newer **success** than **`24773000757`**. **Loop protection:** prior reports document the stable external blocker (marketing artifact fetch / **`MARKETING_ARTIFACT_TOKEN`** / **`GH_TOKEN`** per **`config/marketing-sites.json`**); outcome cannot become **PASS** until **Actions** secrets allow a **green** workflow or the team explicitly re-scopes verification per Testing instructions item **4** (manual **`scripts/deploy-amvara9.sh`**).

**Product owner feedback:** **`master`** (**`7a2c2bd`**) remains an ancestor of **`development`** (**`7fecd430`**); git refs are consistent. Automated production deploy from **`master`** via GitHub Actions is still blocked at run **`24773000757`** until CI completes green or operators use the documented manual deploy path.

**URLs tested:**

1. Latest (failed) workflow run: https://github.com/satisfecho/pos/actions/runs/24773000757  
2. Issue: https://github.com/satisfecho/pos/issues/195  

**N/A — no browser** (optional prod check skipped).

**Relevant log excerpts (last section)** — **`gh run list`** (first line, **`master`**, **Deploy to amvara9**):

```
completed	failure	Agent 001: add FEAT task for GitHub issue #195 (push to master)	Deploy to amvara9	master	push	24773000757	10s	2026-04-22T10:18:20Z
```

**`gh run view 24773000757 --repo satisfecho/pos --json conclusion,url`**:

```json
{"conclusion":"failure","createdAt":"2026-04-22T10:18:20Z","displayTitle":"Agent 001: add FEAT task for GitHub issue #195 (push to master)","status":"completed","url":"https://github.com/satisfecho/pos/actions/runs/24773000757"}
```

---

## Testing instructions

1. **Git:** Confirm **`origin/master`** and **`origin/development`** are at the expected points for the promotion under test (re-check tips after any new merge):  
   `git fetch origin && git rev-parse origin/master origin/development`  
   Optionally: `git merge-base --is-ancestor origin/master origin/development` (exit **0** expected after a promotion when **`development`** has advanced).

2. **GitHub Actions:** Open **Actions** → **Deploy to amvara9** and inspect the latest **`master`** run (reference run **`24773000757`** until a newer one exists). After **Actions** secrets (`MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN` with PAT scope per **`config/marketing-sites.json`**) are set, **Re-run failed jobs** or trigger a new deploy from **`master`**. Expect **green** through **Fetch marketing site artifacts**, **Set up SSH**, **Build and restart stack on amvara9**, and **Smoke test**.

3. **Optional live check:** After a **green** deploy, verify **`https://satisfecho.de/`** (or documented prod URL) and API health per **`docs/0001-ci-cd-amvara9.md`** / smoke step output.

4. **Manual fallback:** If CI cannot be fixed immediately, an operator may run **`scripts/deploy-amvara9.sh`** on the server per **`README.md`** / **`AGENTS.md`** (marketing bundles may still be required for full parity with CI).
