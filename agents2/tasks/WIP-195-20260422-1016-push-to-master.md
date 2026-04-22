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

## Test report — follow-up verification

1. **Date/time (UTC)** and log window: **2026-04-22T10:27:38Z** (retest after **`UNTESTED` → `TESTING`** rename); commands and **`gh`** inspection within **~1 minute**.

2. **Environment:** Repo **`/Users/raro42/projects/pos2`** after **`./scripts/git-sync-development.sh`**; **`development`** locally; **`gh`** authenticated; no Puppeteer **`BASE_URL`** (no browser UX pass/fail for deploy).

3. **What was tested:** **Testing instructions** items **1–3** again (remote git tips; latest **`master`** **Deploy to amvara9** via **`gh`**; optional prod health as supplementary only).

4. **Results:**
   - **Git remotes:** **PASS** — **`git fetch origin`** then **`git rev-parse origin/master`** → **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`**; **`git rev-parse origin/development`** → **`72b4b1dda74e09582fcfc34b8ff48cdde9b0a4ee`** (development ahead vs prior report). **`git merge-base --is-ancestor origin/master origin/development`** exits **0**; promotion commit **`7a2c2bd`** remains in **`origin/development`** history.
   - **GitHub Actions Deploy to amvara9:** **FAIL** — **`gh run view 24773000757 --json conclusion,status`** → **`completed`**, **`failure`**. **`gh run list --workflow "Deploy to amvara9" --branch master --limit 5`** shows run **`24773000757`** as the **latest** **`master`** deploy (**2026-04-22T10:18:20Z**), still **failure**; no newer green **`master`** deploy after that push.
   - **Optional live check after green deploy:** **N/A** — pipeline for **`24773000757`** did not succeed; **`curl -sS https://satisfecho.de/api/health`** → **HTTP 200**, body **`{"status":"ok"}`** (existing production; does not validate that failed workflow deployed new bits).

5. **Overall:** **FAIL** — Success criteria for **Deploy to amvara9** after the **`master`** promotion are still not met until repository secrets / marketing artifact fetch passes and a **green** run completes.

6. **Product owner feedback:** Same as prior report: add a PAT with sufficient **Actions** read scope (per **`config/marketing-sites.json`**), then **re-run** the failed workflow or ship a fresh **`master`** deploy and send the task back to **UNTESTED** for verification.

7. **URLs tested:**
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757` — **`gh run view`** confirms **`failure`**.
   2. `https://satisfecho.de/api/health` — **200**, **`{"status":"ok"}`**.

8. **Relevant log excerpts:** **`gh run view 24773000757 --json`** → **`"conclusion":"failure"`**, **`"status":"completed"`**, **`"updatedAt":"2026-04-22T10:18:30Z"`**.

## Test report — verification (2026-04-22 session)

1. **Date/time (UTC)** and log window: **2026-04-22T10:35Z** through **2026-04-22T10:36Z** (`git fetch`, **`gh run list`**, **`gh run view`**, **`curl`**).

2. **Environment:** Repo **`/Users/raro42/projects/pos2`** after **`./scripts/git-sync-development.sh`**; local branch **`development`** (synced); **`BASE_URL`** not used (no Puppeteer); **`gh`** authenticated.

3. **What was tested:** **Testing instructions** items **1–3** (remote **`origin/master`** vs **`origin/development`**; latest **`Deploy to amvara9`** on **`master`** via **`gh`**; optional **`https://satisfecho.de/api/health`**).

4. **Results:**
   - **Git remotes:** **PASS** — **`git fetch origin`** then **`git rev-parse origin/master`** → **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`**; **`git rev-parse origin/development`** → **`309a2e87f3210aca200514eb1d048b06d57c9eb2`**. **`git merge-base --is-ancestor origin/master origin/development`** exits **0** (**`master`** tip is contained in **`development`** history).
   - **GitHub Actions Deploy to amvara9:** **FAIL** — **`gh run list --workflow "Deploy to amvara9" --branch master --limit 5`** shows **`24773000757`** (push **2026-04-22T10:18:20Z**) as the **latest** **`master`** deploy, **`completed`**, **`failure`**. **`gh run view 24773000757 --json`** → **`conclusion":"failure"`**, **`updatedAt":"2026-04-22T10:18:30Z`**. No newer green **`master`** deploy after that push.
   - **Optional live check after green deploy:** **N/A** — pipeline for the promoted **`master`** push did not succeed; **`curl -sS https://satisfecho.de/api/health`** → **HTTP 200**, **`{"status":"ok"}`** (existing production only).

5. **Overall:** **FAIL** — **`Deploy to amvara9`** for the **`master`** promotion is still **not green**; success criteria require a passing workflow through marketing artifacts, SSH, build, and smoke.

6. **Product owner feedback:** **`MARKETING_ARTIFACT_TOKEN`** / **`GH_TOKEN`** (or equivalent) must be set in Actions with **Actions read** on every repo in **`config/marketing-sites.json`**, then **re-run failed jobs** or trigger a fresh **`master`** deploy; return task to **UNTESTED** when ready for another verification pass.

7. **URLs tested:**
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757` — failed **`Deploy to amvara9`** run (latest **`master`** deploy).
   2. `https://satisfecho.de/api/health` — **200**, **`{"status":"ok"}`**.

8. **Relevant log excerpts:**

```
gh run list --workflow "Deploy to amvara9" --branch master --limit 3
24773000757  failure  ...  master  push  2026-04-22T10:18:20Z

gh run view 24773000757 --json conclusion,status
{"conclusion":"failure","status":"completed"}
```

## Test report

1. **Date/time (UTC)** and log window: **2026-04-22T10:42Z** through **2026-04-22T10:44Z** (`./scripts/git-sync-development.sh` first, then `git fetch` / `gh` / `curl` within **~2 minutes**).

2. **Environment:** Repo **`/Users/raro42/projects/pos2`**; local branch **`development`** after sync; **`gh`** CLI used for Actions; no **`BASE_URL`** / Puppeteer (deploy/CI verification only).

3. **What was tested:** **Testing instructions** items **1–3** (remote tips; latest **`Deploy to amvara9`** for **`master`**; optional prod health as a **supplementary** signal only).

4. **Results:**
   - **Git remotes:** **PASS** — **`git fetch origin`**, then **`git rev-parse origin/master`** → **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`**, **`git rev-parse origin/development`** → **`87d4beb5a96d3768d5550e426bfe27bed5439d4f`** (tips differ; **`development`** ahead). **`git merge-base --is-ancestor origin/master origin/development`** exits **0** (promoted **`master`** commit remains in **`development`** history). *Note:* This no longer matches the task’s “same tip as promotion” snapshot; **`master`** is still at **`7a2c2bd`** while **`development`** has moved on.
   - **GitHub Actions Deploy to amvara9:** **FAIL** — **`gh run list --workflow "Deploy to amvara9" --branch master --limit 8`** shows **`24773000757`** (**2026-04-22T10:18:20Z**) as the **latest** **`master`** push deploy, **`completed`/`failure`**. **`gh run view 24773000757`** → **`conclusion":"failure"`**, **`updatedAt":"2026-04-22T10:18:30Z`**. No newer **`success`** **`master`** deploy superseding this run.
   - **Optional live check after green deploy:** **N/A** — Automated deploy for the **`master`** promotion push did **not** complete successfully; **`curl -sS https://satisfecho.de/api/health`** → **HTTP 200**, **`{"status":"ok"}`** reflects the **currently running** stack, not proof that **`24773000757`** deployed.

5. **Overall:** **FAIL** — Production CI pipeline for the promoted **`master`** push is still **not green** (marketing artifact / token step); blocker unchanged from prior reports.

6. **Product owner feedback:** Add/configure **`MARKETING_ARTIFACT_TOKEN`** or **`GH_TOKEN`** in repo **Actions** secrets with **Actions read** on repos in **`config/marketing-sites.json`**, **re-run failed jobs** or trigger a fresh **`master`** deploy, then return this task as **UNTESTED** when a green run exists to verify.

7. **URLs tested:**
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757` — **`gh run view`** (**failure**, unchanged).
   2. `https://satisfecho.de/api/health` — **HTTP 200**, **`{"status":"ok"}`**.

8. **Relevant log excerpts:**

```
gh run list --workflow "Deploy to amvara9" --branch master --limit 3
24773000757  failure  Deploy to amvara9  master  push  2026-04-22T10:18:20Z

gh run view 24773000757 --json conclusion,status,updatedAt
{"conclusion":"failure","status":"completed","updatedAt":"2026-04-22T10:18:30Z"}

curl -sS -o /dev/null -w "%{http_code}" https://satisfecho.de/api/health
200
```

## Test report — verification (022 session)

1. **Date/time (UTC)** and log window: **2026-04-22T10:51Z** through **2026-04-22T10:52Z** (`./scripts/git-sync-development.sh`, then **`git fetch`**, **`gh`**, **`curl`**).

2. **Environment:** Repo **`/Users/raro42/projects/pos2`** after sync; local branch **`development`**; **`gh`** authenticated for **`satisfecho/pos`**; no **`BASE_URL`** / Puppeteer.

3. **What was tested:** **Testing instructions** items **1–3** (remote **`origin/master`** vs **`origin/development`**; latest **`Deploy to amvara9`** on **`master`**; optional **`https://satisfecho.de/api/health`**).

4. **Results:**
   - **Git remotes:** **PASS** — **`git fetch origin`**, **`git rev-parse origin/master`** → **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`**, **`git rev-parse origin/development`** → **`ec1a10fb58ae3cc876993e533d357fa1d29b2b80`**. Tips differ (**`development`** ahead). **`git merge-base --is-ancestor origin/master origin/development`** exits **0**.
   - **GitHub Actions Deploy to amvara9:** **FAIL** — **`gh run list --workflow "Deploy to amvara9" --branch master --limit 5`**: latest **`master`** deploy is **`24773000757`** (**2026-04-22T10:18:20Z**), **`completed`**, **`failure`**. **`gh run view 24773000757 --json`** → **`conclusion":"failure"`**, **`updatedAt":"2026-04-22T10:18:30Z`**. No newer **success** **`master`** deploy after that push.
   - **Optional live check after green deploy:** **N/A** — Deploy for the promoted **`master`** push is still **not green**. **`curl -sS https://satisfecho.de/api/health`** → **HTTP 200**, **`{"status":"ok"}`** (running stack only).

5. **Overall:** **FAIL** — **`Deploy to amvara9`** for the **`master`** promotion has **not** completed successfully; marketing/token step blocker unchanged until secrets are fixed and a **green** run exists.

6. **Product owner feedback:** Configure **`MARKETING_ARTIFACT_TOKEN`** / **`GH_TOKEN`** in GitHub Actions with **Actions read** on repos in **`config/marketing-sites.json`**, then **re-run failed jobs** or trigger a new **`master`** deploy; rename this task back to **`UNTESTED-`** when ready for another verification pass.

7. **URLs tested:**
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757` — **`gh run view`** (**failure**).
   2. `https://satisfecho.de/api/health` — **200**, **`{"status":"ok"}`**.

8. **Relevant log excerpts:**

```
gh run list --workflow "Deploy to amvara9" --branch master --limit 3
24773000757  failure  Deploy to amvara9  master  push  2026-04-22T10:18:20Z

gh run view 24773000757 --json conclusion,status,updatedAt
{"conclusion":"failure","status":"completed","updatedAt":"2026-04-22T10:18:30Z"}
```
