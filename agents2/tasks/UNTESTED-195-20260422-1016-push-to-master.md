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

## Testing instructions

1. **Git:** Confirm **`origin/master`** matches **`origin/development`** at **`7a2c2bd`** (or later if additional commits landed):  
   `git fetch origin && git rev-parse origin/master origin/development`
2. **GitHub Actions:** Open **Actions** → **Deploy to amvara9** → run **`24773000757`** (or latest **`master`** deploy). After secrets are fixed, either **Re-run failed jobs** or trigger a new deploy from **`master`** and expect **green** through **Fetch marketing site artifacts**, **Set up SSH**, **Build and restart stack on amvara9**, **Smoke test**.
3. **Optional live check:** After a **green** deploy, verify **`https://satisfecho.de/`** (or documented prod URL) and API health per **`docs/0001-ci-cd-amvara9.md`** / smoke step output.
4. **Manual fallback:** If CI cannot be fixed immediately, an operator may run **`scripts/deploy-amvara9.sh`** from the server checkout per **`README.md`** / **`AGENTS.md`** (still needs marketing bundles resolved for full parity with CI).

---

## Test report

### Date/time (UTC) and log window

- **Verification run:** **2026-04-22 16:34 UTC** (`date -u`; branch/CI checks and spot **`curl`**).
- **Workflow evidence:** **`Deploy to amvara9`** run **`24773000757`** — job failed at **Fetch marketing site artifacts**; original log window **2026-04-22T10:18:20Z**–**10:18:27Z** (per **`gh run view`**).

### Environment

- **Repo:** `satisfecho/pos`; **`./scripts/git-sync-development.sh`** run before task edits.
- **Branch:** local **`development`** tracking **`origin/development`**; remote refs after **`git fetch origin`**: **`origin/master`** **`7a2c2bd`**, **`origin/development`** **`d1f2030f`** (tips differ).
- **Compose / local Docker:** not used (no app build under test).
- **Prod spot-check:** `https://satisfecho.de` (**`curl`** HEAD-equivalent status codes only).

### What was tested

Per **Testing instructions** §1–§3: **`origin/master`** vs **`origin/development`** parity; latest **`Deploy to amvara9`** on **`master`** (**24773000757** / **`gh run list`**); optional reachability of prod **`/`** and **`/api/health`**.

### Results

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | **`origin/master`** matches **`origin/development`** at the same tip (or task’s promoted **`7a2c2bd`** / later shared tip) | **FAIL** | `git rev-parse origin/master origin/development` → **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`** then **`d1f2030f19fee2c054fecf6c37b1286114ee67fa`**. `git rev-list --left-right --count origin/master...origin/development` → **`0	80`** (**development** **80** commits ahead). |
| 2 | **GitHub Actions — Deploy to amvara9** (relevant **`master`** deploy): green through marketing fetch, SSH, server steps, smoke | **FAIL** | **`gh run view 24773000757`**: conclusion **failure**; failed step **Fetch marketing site artifacts**. **`gh run list --workflow "Deploy to amvara9" --branch master --limit 3`**: latest run **24773000757** **failure** (prior **24710137656** also **failure**; older **24708658534** **success** is not the issue’s failed deploy). |
| 3 | Optional live check after **green** deploy | **N/A** | No green **`master`** deploy for this promotion; **`curl`** **`https://satisfecho.de/`** → **200**, **`https://satisfecho.de/api/health`** → **200** (site up; does not validate CI marketing bundles or server deploy from **24773000757**). |

### Overall

**FAIL** — criteria **1** and **2** failed; criterion **3** remains **N/A** until a green pipeline.

### Product owner feedback

**#195** is still not verified: **`master`** lags **`development`** by **80** commits, so branch parity for the promotion is false. The **`master`** push deploy **24773000757** remains red at **Fetch marketing site artifacts** (missing **`MARKETING_ARTIFACT_TOKEN`** / **`GH_TOKEN`** and placeholder marketing bundles). Add the required Actions secrets / PAT scope, re-run deploy, or use a documented manual path with real bundles; then return the task to **UNTESTED** for a re-test.

### URLs tested

1. https://github.com/satisfecho/pos/actions/runs/24773000757 (**Actions** run; **`gh run view`**).
2. https://satisfecho.de/ (**HTTP 200**).
3. https://satisfecho.de/api/health (**HTTP 200**).

### Relevant log excerpts

**GitHub Actions (`gh run view 24773000757`):**

```text
X master Deploy to amvara9 · 24773000757
  X Fetch marketing site artifacts (curl + GitHub API)
  - Set up SSH
  - Build and restart stack on amvara9
  - Smoke test (landing, version, API health)
X Process completed with exit code 1.
```

**Host (branch parity, 2026-04-22 16:34 UTC):**

```text
$ git rev-parse origin/master origin/development
7a2c2bd59b2cfb6cbc6a55ac407993494b17256f
d1f2030f19fee2c054fecf6c37b1286114ee67fa

$ git rev-list --left-right --count origin/master...origin/development
0	80
```
