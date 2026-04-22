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

## Test report

1. **Date/time (UTC)** and log window: **2026-04-22T10:20:04Z** through **2026-04-22T10:21Z** (verification commands and `gh` Actions inspection).

2. **Environment:** Host shell at repo **`/Users/raro42/projects/pos2`** after **`./scripts/git-sync-development.sh`**; **`development`** branch locally; **`BASE_URL`** not used for Puppeteer (no browser flow test). GitHub CLI **`gh`** authenticated.

3. **What was tested:** Items 1–3 under **Testing instructions** (git remote tips; Deploy to amvara9 run **`24773000757`** / latest **`master`** deploy; optional prod health only as supplementary signal because deploy did not complete).

4. **Results:**
   - **Git remotes:** **PASS** — After **`git fetch origin`**, **`git rev-parse origin/master`** → **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`**; **`git rev-parse origin/development`** → **`6ecbd7d18dd9128aa18210949d5d181e485cb041`**. Tips differ (development ahead). **`git merge-base --is-ancestor 7a2c2bd origin/development`** exits **0**, so **`origin/master`** promotion commit **`7a2c2bd`** is contained in **`origin/development`** history.
   - **GitHub Actions Deploy to amvara9:** **FAIL** — Run **`24773000757`** (`master` push) **completed with failure**. Job **`deploy`** failed at **Fetch marketing site artifacts**; **`MARKETING_ARTIFACT_TOKEN`** / **`GH_TOKEN`** empty in workflow env; **`MARKETING_VERIFY_NO_PLACEHOLDERS=1`** reported placeholders for slugs **antillana**, **dilruba**, **flamanapolitana**, **gustazo**, **hakone**. Subsequent steps (**Set up SSH**, **Build and restart stack on amvara9**, **Smoke test**) did not run. Latest **`master`** deploy in **`gh run list --workflow "Deploy to amvara9" --branch master`** is still this failing run (no newer green redeploy observed).
   - **Optional live check after green deploy:** **N/A** — Deploy was not green; cannot treat optional homepage/smoke per instructions as verified for **this** push. **`curl https://satisfecho.de/api/health`** returned **HTTP 200** and body **`{"status":"ok"}`** (existing stack; does not prove **`24773000757`** deployed).

5. **Overall:** **FAIL** — Deploy workflow did not succeed; criterion for successful production pipeline after **`master`** push is not met until secrets/marketing artifacts are fixed and a **green** deploy completes.

6. **Product owner feedback:** The **`master`** promotion commit **`7a2c2bd`** is on **`origin`** and is an ancestor of current **`origin/development`**, but the automated deploy for that push never reached the server or smoke steps. Configure the GitHub Actions secret(s) so **`MARKETING_ARTIFACT_TOKEN`** or **`GH_TOKEN`** has **Actions read** on every marketing repo in **`config/marketing-sites.json`**, then **re-run failed jobs** or trigger a fresh **`master`** deploy and re-test.

7. **URLs tested:**
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757` — workflow run (failure).
   2. `https://satisfecho.de/api/health` — HTTP 200, JSON `{"status":"ok"}`.

8. **Relevant log excerpts** — GitHub Actions failed step (trimmed):

```
MARKETING_ARTIFACT_TOKEN:
GH_TOKEN:
[marketing-sync] no token — try local build for antillana
...
[marketing-sync] ::error::placeholder still present for slug=gustazo — missing artifact or PAT scope
##[error]Process completed with exit code 1.
```
