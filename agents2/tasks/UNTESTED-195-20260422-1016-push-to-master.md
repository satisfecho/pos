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

---

## Re-verification (tester closing step)

### Date/time (UTC) and log window

- **Verification run:** **2026-04-22 16:54 UTC** (`date -u`).
- **Evidence window:** **`git fetch origin`** and **`gh run view`** immediately after; no local Docker run.

### Environment

- **Repo:** `satisfecho/pos`; **`./scripts/git-sync-development.sh`** at start of tester step.
- **Remote tips after fetch:** **`origin/master`** **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`**, **`origin/development`** **`d6792d186c4d9657a958d96b725da40d6e051fc0`** (still divergent).

### What was tested

Repeat **Testing instructions** §1–§3: **`origin/master`** vs **`origin/development`**; latest **Deploy to amvara9** on **`master`**; optional prod **`curl`**.

### Results

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | **`origin/master`** matches **`origin/development`** at shared tip | **FAIL** | `git rev-parse origin/master origin/development` → two different SHAs; `git rev-list --left-right --count origin/master...origin/development` → **`0	82`** (**development** ahead). |
| 2 | **GitHub Actions — Deploy to amvara9** relevant **`master`** deploy green through marketing fetch, SSH, server, smoke | **FAIL** | **`gh run list --workflow "Deploy to amvara9" --branch master --limit 5`**: latest **`24773000757`** **completed** **failure**. **`gh run view 24773000757`**: failed step **Fetch marketing site artifacts**; downstream steps skipped. |
| 3 | Optional live check after green deploy | **N/A** | No green **`master`** deploy for this promotion. **`curl -s -o /dev/null -w "%{http_code}"`** → **`https://satisfecho.de/`** **200**, **`https://satisfecho.de/api/health`** **200** (site reachable; does not validate the failed workflow). |

### Overall

**FAIL** — criteria **1** and **2** unchanged; **3** **N/A**.

### Product owner feedback

The **#195** promotion path is still not verified: **`master`** has not caught **`development`** (**82** commits behind). **Deploy to amvara9** **24773000757** remains red at marketing artifact fetch (secrets/PAT scope per implementation summary). Configure **Actions** secrets so marketing bundles fetch succeeds, **Re-run failed jobs** or trigger a new **`master`** deploy, or follow manual **`scripts/deploy-amvara9.sh`** with bundle parity; then move task back to **UNTESTED** for another verification pass.

### URLs tested

1. https://github.com/satisfecho/pos/actions/runs/24773000757  
2. https://satisfecho.de/  
3. https://satisfecho.de/api/health  

### Relevant log excerpts

**Branch parity (2026-04-22 16:54 UTC):**

```text
$ git rev-parse origin/master origin/development
7a2c2bd59b2cfb6cbc6a55ac407993494b17256f
d6792d186c4d9657a958d96b725da40d6e051fc0

$ git rev-list --left-right --count origin/master...origin/development
0	82
```

**GitHub Actions (`gh run view 24773000757`):**

```text
X Fetch marketing site artifacts (curl + GitHub API)
  - Set up SSH
  - Checkout latest code on amvara9 (...)
  - Sync marketing sites to server (...)
  - Build and restart stack on amvara9
  - Smoke test (landing, version, API health)
X Process completed with exit code 1.
```

---

## Test report

### Date/time (UTC) and log window

- **Verification run:** **2026-04-22 17:26 UTC** (`date -u`; **`git fetch origin`**, **`gh`**, **`curl`** immediately after **`./scripts/git-sync-development.sh`**).
- **Workflow evidence:** **`Deploy to amvara9`** run **`24773000757`** — unchanged **failure** at **Fetch marketing site artifacts** (job **`72484038503`**, **`updatedAt`** **2026-04-22T10:18:30Z** per **`gh run view --json`**).

### Environment

- **Repo:** `satisfecho/pos`; **`./scripts/git-sync-development.sh`** run before edits.
- **Remote tips after `git fetch origin`:** **`origin/master`** **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`**, **`origin/development`** **`cc93196a83b60dae35724d4765209a4c19682887`** (still divergent).
- **Compose / local Docker:** not used (verification is git + CI + optional prod **`curl`**).

### What was tested

Per **Testing instructions** §1–§3: **`origin/master`** vs **`origin/development`**; latest **Deploy to amvara9** on **`master`**; optional **`curl`** to **`https://satisfecho.de/`** and **`/api/health`**.

### Results

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | **`origin/master`** matches **`origin/development`** at shared tip (or promoted **`7a2c2bd`** / later shared tip) | **FAIL** | `git rev-parse origin/master origin/development` → two SHAs above; `git rev-list --left-right --count origin/master...origin/development` → **`0	84`** (**development** **84** commits ahead). |
| 2 | **GitHub Actions — Deploy to amvara9** (latest **`master`** deploy): green through marketing fetch, SSH, server, smoke | **FAIL** | **`gh run list --workflow "Deploy to amvara9" --branch master --limit 5`**: latest **`24773000757`** **completed** **failure**. **`gh run view 24773000757 --json`**: conclusion **failure**; step **Fetch marketing site artifacts** **failure**; **Set up SSH** through **Smoke test** **skipped**. |
| 3 | Optional live check after **green** deploy | **N/A** | No green **`master`** deploy for this promotion. **`curl -s -o /dev/null -w "%{http_code}"`** → **`https://satisfecho.de/`** **200**, **`https://satisfecho.de/api/health`** **200** (reachability only). |

### Overall

**FAIL** — criteria **1** and **2** failed; criterion **3** **N/A**.

### Product owner feedback

**#195** remains unverified: **`master`** still lags **`origin/development`** by **84** commits, so the stated promotion parity is not true. The most recent **`master`** **Deploy to amvara9** run (**24773000757**) is still red at **Fetch marketing site artifacts** (downstream deploy/smoke steps did not run). Fix **Actions** secrets / PAT scope for marketing artifacts, **Re-run** or redeploy from **`master`**, or use the documented manual deploy path with real bundles; then return this task to **UNTESTED** for another pass.

### URLs tested

1. https://github.com/satisfecho/pos/actions/runs/24773000757 (**Actions** run summary via **`gh run view`**).
2. https://satisfecho.de/ (**HTTP 200**).
3. https://satisfecho.de/api/health (**HTTP 200**).

### Relevant log excerpts

**Branch parity (2026-04-22 17:26 UTC):**

```text
$ git rev-parse origin/master origin/development
7a2c2bd59b2cfb6cbc6a55ac407993494b17256f
cc93196a83b60dae35724d4765209a4c19682887

$ git rev-list --left-right --count origin/master...origin/development
0	84
```

**GitHub Actions (`gh run view 24773000757 --json jobs`):**

```text
Fetch marketing site artifacts → failure
Set up SSH → skipped
Checkout latest code on amvara9 → skipped
Sync marketing sites to server → skipped
Build and restart stack on amvara9 → skipped
Smoke test (landing, version, API health) → skipped
```

---

## Test report

### Date/time (UTC) and log window

- **Verification run:** **2026-04-22 17:46 UTC** (`date -u`; **`git fetch origin`**, **`gh`**, **`curl`** immediately after **`./scripts/git-sync-development.sh`**).

### Environment

- **Repo:** `satisfecho/pos`; **`./scripts/git-sync-development.sh`** before task file edits.
- **Remote tips after `git fetch origin`:** **`origin/master`** **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`**, **`origin/development`** **`a65464901519372551dd580028d0bc8ff69968e5`** (divergent).
- **Compose / local Docker:** not used.

### What was tested

Per **Testing instructions** §1–§3: **`origin/master`** vs **`origin/development`**; latest **Deploy to amvara9** on **`master`**; optional **`curl`** to **`https://satisfecho.de/`** and **`/api/health`**.

### Results

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | **`origin/master`** matches **`origin/development`** at shared tip | **FAIL** | `git rev-parse origin/master origin/development` → two SHAs; `git rev-list --left-right --count origin/master...origin/development` → **`0	86`** (**development** **86** commits ahead). |
| 2 | **GitHub Actions — Deploy to amvara9** latest **`master`** deploy green through marketing fetch, SSH, server, smoke | **FAIL** | **`gh run list --workflow "Deploy to amvara9" --branch master --limit 5`**: latest **`24773000757`** **completed** **failure**. **`gh run view 24773000757 --json`**: conclusion **failure**; step **Fetch marketing site artifacts (curl + GitHub API)** **failure**; downstream steps **skipped**. |
| 3 | Optional live check after **green** deploy | **N/A** | No green **`master`** deploy for this promotion. **`curl`** **`https://satisfecho.de/`** **200**, **`https://satisfecho.de/api/health`** **200** (reachability only). |

### Overall

**FAIL** — criteria **1** and **2** failed; criterion **3** **N/A**.

### Product owner feedback

**#195** promotion is still not verified: **`origin/master`** lags **`origin/development`** by **86** commits. Latest **`master`** **Deploy to amvara9** (**24773000757**) remains red at **Fetch marketing site artifacts**, so server deploy and smoke did not run. Configure **Actions** secrets / PAT for marketing artifacts, **Re-run failed jobs** or trigger a new **`master`** deploy, or use the documented manual deploy path with real bundles; then return this task to **UNTESTED** for another pass.

### URLs tested

1. https://github.com/satisfecho/pos/actions/runs/24773000757
2. https://satisfecho.de/
3. https://satisfecho.de/api/health

### Relevant log excerpts

**Branch parity (2026-04-22 17:46 UTC):**

```text
$ git rev-parse origin/master origin/development
7a2c2bd59b2cfb6cbc6a55ac407993494b17256f
a65464901519372551dd580028d0bc8ff69968e5

$ git rev-list --left-right --count origin/master...origin/development
0	86
```

**GitHub Actions (`gh run view 24773000757 --json`):**

```text
conclusion: failure
Fetch marketing site artifacts (curl + GitHub API) → failure
Set up SSH → skipped
Checkout latest code on amvara9 → skipped
Sync marketing sites to server → skipped
Build and restart stack on amvara9 → skipped
Smoke test (landing, version, API health) → skipped
```

---

## Test report

### Date/time (UTC) and log window

- **Verification run:** **2026-04-22 18:22 UTC** (`date -u`; **`git fetch origin`**, **`gh`**, **`curl`** immediately after **`./scripts/git-sync-development.sh`**).

### Environment

- **Repo:** `satisfecho/pos`; **`./scripts/git-sync-development.sh`** before task edits.
- **Remote tips after `git fetch origin`:** **`origin/master`** **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`**, **`origin/development`** **`47480e8fee0f2ba6998a2b410dfbfb4fed66211e`** (divergent).
- **Compose / local Docker:** not used.

### What was tested

Per **Testing instructions** §1–§3: **`origin/master`** vs **`origin/development`**; latest **Deploy to amvara9** on **`master`**; optional **`curl`** to **`https://satisfecho.de/`** and **`/api/health`**.

### Results

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | **`origin/master`** matches **`origin/development`** at shared tip (or promoted **`7a2c2bd`** / later shared tip) | **FAIL** | `git rev-parse origin/master origin/development` → two SHAs above; `git rev-list --left-right --count origin/master...origin/development` → **`0	88`** (**development** **88** commits ahead). |
| 2 | **GitHub Actions — Deploy to amvara9** latest **`master`** deploy green through marketing fetch, SSH, server, smoke | **FAIL** | **`gh run list --workflow "Deploy to amvara9" --branch master --limit 5`**: latest **`24773000757`** **completed** **failure**. **`gh run view 24773000757 --json`**: conclusion **failure**; step **Fetch marketing site artifacts (curl + GitHub API)** **failure**; downstream steps **skipped**. |
| 3 | Optional live check after **green** deploy | **N/A** | No green **`master`** deploy for this promotion. **`curl`** **`https://satisfecho.de/`** **200**, **`https://satisfecho.de/api/health`** **200** (reachability only). |

### Overall

**FAIL** — criteria **1** and **2** failed; criterion **3** **N/A**.

### Product owner feedback

**#195** promotion remains unverified: **`origin/master`** still lags **`origin/development`** by **88** commits. Latest **`master`** **Deploy to amvara9** (**24773000757**) is still red at **Fetch marketing site artifacts**, so server deploy and smoke did not run. Configure **Actions** secrets / PAT for marketing artifacts per **`config/marketing-sites.json`**, **Re-run failed jobs** or trigger a new **`master`** deploy, or use the documented manual deploy path with real bundles; then return this task to **UNTESTED** for another pass.

### URLs tested

1. https://github.com/satisfecho/pos/actions/runs/24773000757
2. https://satisfecho.de/
3. https://satisfecho.de/api/health

### Relevant log excerpts

**Branch parity (2026-04-22 18:22 UTC):**

```text
$ git rev-parse origin/master origin/development
7a2c2bd59b2cfb6cbc6a55ac407993494b17256f
47480e8fee0f2ba6998a2b410dfbfb4fed66211e

$ git rev-list --left-right --count origin/master...origin/development
0	88
```

**GitHub Actions (`gh run view 24773000757 --json`):**

```text
conclusion: failure
Fetch marketing site artifacts (curl + GitHub API) → failure
Set up SSH → skipped
Checkout latest code on amvara9 → skipped
Sync marketing sites to server → skipped
Build and restart stack on amvara9 → skipped
Smoke test (landing, version, API health) → skipped
```

---

## Test report

### Date/time (UTC) and log window

- **Verification run:** **2026-04-22 18:55 UTC** (`date -u`; **`git fetch origin`**, **`gh run list` / `gh run view`**, **`curl`** immediately after **`./scripts/git-sync-development.sh`**).
- **Workflow evidence:** **`Deploy to amvara9`** run **`24773000757`** — **`updatedAt`** **2026-04-22T10:18:30Z**; conclusion **failure** at step **Fetch marketing site artifacts (curl + GitHub API)** (job **`72484038503`**).

### Environment

- **Repo:** `satisfecho/pos`; **`./scripts/git-sync-development.sh`** before task edits.
- **Remote tips after `git fetch origin`:** **`origin/master`** **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`**, **`origin/development`** **`c371f25237c28315f2d3702efe498a35d4d80c98`** (divergent).
- **Compose / local Docker:** not used (git + CI + optional prod **`curl`**).

### What was tested

Per **Testing instructions** §1–§3: **`origin/master`** vs **`origin/development`**; latest **Deploy to amvara9** on **`master`**; optional **`curl`** to **`https://satisfecho.de/`** and **`/api/health`**.

### Results

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | **`origin/master`** matches **`origin/development`** at **`7a2c2bd`** (or later shared tip) | **FAIL** | `git rev-parse origin/master origin/development` → two SHAs above; `git rev-list --left-right --count origin/master...origin/development` → **`0	90`** (**development** **90** commits ahead). |
| 2 | **GitHub Actions — Deploy to amvara9** latest **`master`** deploy green through marketing fetch, SSH, server deploy, smoke | **FAIL** | **`gh run list --workflow "Deploy to amvara9" --branch master --limit 5`**: latest **`24773000757`** **completed** **failure**. **`gh run view 24773000757 --json`**: conclusion **failure**; **Fetch marketing site artifacts** **failure**; **Set up SSH** through **Smoke test** **skipped**. |
| 3 | Optional live check after **green** deploy | **N/A** | No green **`master`** deploy for this promotion. **`curl -s -o /dev/null -w "%{http_code}"`** → **`https://satisfecho.de/`** **200**, **`https://satisfecho.de/api/health`** **200** (reachability only; does not validate CI marketing fetch or server steps from **24773000757**). |

### Overall

**FAIL** — criteria **1** and **2** failed; criterion **3** **N/A**.

### Product owner feedback

Issue **#195** is still not verified as a successful promotion: **`origin/master`** remains pinned at **`7a2c2bd`** while **`origin/development`** has advanced (**90** commits ahead). The latest **`master`** **Deploy to amvara9** workflow (**24773000757**) is still red at **Fetch marketing site artifacts**, so downstream SSH, server sync, build/restart, and smoke steps did not run. Add or fix **Actions** secrets (**`MARKETING_ARTIFACT_TOKEN`** / **`GH_TOKEN`** scope per **`config/marketing-sites.json`**), **Re-run failed jobs** or push a new **`master`** deploy after secrets are valid, or use the documented manual deploy path with real marketing bundles; then return this task to **UNTESTED** for re-verification.

### URLs tested

1. https://github.com/satisfecho/pos/actions/runs/24773000757 (**Actions** run via **`gh run view`**).
2. https://satisfecho.de/ (**HTTP 200**).
3. https://satisfecho.de/api/health (**HTTP 200**, body includes **`{"status":"ok"}`**).

### Relevant log excerpts

**Branch parity (2026-04-22 18:55 UTC):**

```text
$ git rev-parse origin/master origin/development
7a2c2bd59b2cfb6cbc6a55ac407993494b17256f
c371f25237c28315f2d3702efe498a35d4d80c98

$ git rev-list --left-right --count origin/master...origin/development
0	90
```

**GitHub Actions (`gh run view 24773000757 --json jobs` — deploy job steps):**

```text
Fetch marketing site artifacts (curl + GitHub API) → failure
Set up SSH → skipped
Checkout latest code on amvara9 → skipped
Sync marketing sites to server → skipped
Build and restart stack on amvara9 → skipped
Smoke test (landing, version, API health) → skipped
```

---

## Test report

### Date/time (UTC) and log window

- **Verification run:** **2026-04-22 19:22 UTC** (`date -u`; **`git fetch origin`**, **`gh run list` / `gh run view`**, **`curl`** immediately after **`./scripts/git-sync-development.sh`**).
- **Workflow evidence:** **`Deploy to amvara9`** run **`24773000757`** — **`updatedAt`** **2026-04-22T10:18:30Z**; conclusion **failure** at step **Fetch marketing site artifacts (curl + GitHub API)**.

### Environment

- **Repo:** `satisfecho/pos`; **`./scripts/git-sync-development.sh`** before task edits.
- **Remote tips after `git fetch origin`:** **`origin/master`** **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`**, **`origin/development`** **`121009804ea6a42c57dc28a1bac15dfb4cf1acb0`** (divergent).
- **Compose / local Docker:** not used (git + CI + optional prod **`curl`**).

### What was tested

Per **Testing instructions** §1–§3: **`origin/master`** vs **`origin/development`**; latest **Deploy to amvara9** on **`master`**; optional **`curl`** to **`https://satisfecho.de/`** and **`/api/health`**.

### Results

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | **`origin/master`** matches **`origin/development`** at **`7a2c2bd`** (or later shared tip) | **FAIL** | `git rev-parse origin/master origin/development` → two SHAs above; `git rev-list --left-right --count origin/master...origin/development` → **`0	92`** (**development** **92** commits ahead). |
| 2 | **GitHub Actions — Deploy to amvara9** latest **`master`** deploy green through marketing fetch, SSH, server deploy, smoke | **FAIL** | **`gh run list --workflow "Deploy to amvara9" --branch master --limit 5`**: latest **`24773000757`** **completed** **failure**. **`gh run view 24773000757 --json`**: conclusion **failure**; step **Fetch marketing site artifacts (curl + GitHub API)** **failure**; **Set up SSH** through **Smoke test** **skipped**. |
| 3 | Optional live check after **green** deploy | **N/A** | No green **`master`** deploy for this promotion. **`curl`** **`https://satisfecho.de/`** **200**, **`https://satisfecho.de/api/health`** **200** (reachability only). |

### Overall

**FAIL** — criteria **1** and **2** failed; criterion **3** **N/A**.

### Product owner feedback

Issue **#195** is still not verified: **`origin/master`** remains at **`7a2c2bd`** while **`origin/development`** has advanced (**92** commits ahead). The latest **`master`** **Deploy to amvara9** run (**24773000757**) is still red at **Fetch marketing site artifacts**, so SSH, server sync, build/restart, and smoke steps did not run. Restore **Actions** secrets / PAT scope for marketing artifacts per **`config/marketing-sites.json`**, **Re-run failed jobs** or push a new **`master`** deploy after secrets are valid, or use **`scripts/deploy-amvara9.sh`** manually with real bundles; then return this task to **UNTESTED** for re-verification.

### URLs tested

1. https://github.com/satisfecho/pos/actions/runs/24773000757 (**Actions** run via **`gh run view`**).
2. https://satisfecho.de/ (**HTTP 200**).
3. https://satisfecho.de/api/health (**HTTP 200**).

### Relevant log excerpts

**Branch parity (2026-04-22 19:22 UTC):**

```text
$ git rev-parse origin/master origin/development
7a2c2bd59b2cfb6cbc6a55ac407993494b17256f
121009804ea6a42c57dc28a1bac15dfb4cf1acb0

$ git rev-list --left-right --count origin/master...origin/development
0	92
```

**GitHub Actions (`gh run view 24773000757` — deploy job steps):**

```text
Fetch marketing site artifacts (curl + GitHub API) → failure
Set up SSH → skipped
Checkout latest code on amvara9 → skipped
Sync marketing sites to server → skipped
Build and restart stack on amvara9 → skipped
Smoke test (landing, version, API health) → skipped
```

---

## Test report

### Date/time (UTC) and log window

- **Verification run:** **2026-04-22 19:36 UTC** (`date -u`; **`git fetch origin`**, **`gh run list`** / **`gh run view`**, **`curl`** immediately after **`./scripts/git-sync-development.sh`**).
- **Workflow evidence:** **`Deploy to amvara9`** run **`24773000757`** — **`updatedAt`** **2026-04-22T10:18:30Z**; conclusion **failure** at step **Fetch marketing site artifacts (curl + GitHub API)** (job **`72484038503`**).

### Environment

- **Repo:** `satisfecho/pos`; **`./scripts/git-sync-development.sh`** before task edits.
- **Remote tips after `git fetch origin`:** **`origin/master`** **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`**, **`origin/development`** **`2d066bc62bba75bb657ed48bf9ee9712ea457e53`** (divergent).
- **Compose / local Docker:** not used (git + CI + optional prod **`curl`**).

### What was tested

Per **Testing instructions** §1–§3: **`origin/master`** vs **`origin/development`**; latest **Deploy to amvara9** on **`master`**; optional **`curl`** to **`https://satisfecho.de/`** and **`/api/health`**.

### Results

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | **`origin/master`** matches **`origin/development`** at **`7a2c2bd`** (or later shared tip) | **FAIL** | `git rev-parse origin/master origin/development` → two SHAs above; `git rev-list --left-right --count origin/master...origin/development` → **`0	94`** (**development** **94** commits ahead). |
| 2 | **GitHub Actions — Deploy to amvara9** latest **`master`** deploy green through marketing fetch, SSH, server deploy, smoke | **FAIL** | **`gh run list --workflow "Deploy to amvara9" --branch master --limit 5`**: latest **`24773000757`** **completed** **failure**. **`gh run view 24773000757 --json`**: conclusion **failure**; step **Fetch marketing site artifacts (curl + GitHub API)** **failure**; **Set up SSH** through **Smoke test** **skipped**. |
| 3 | Optional live check after **green** deploy | **N/A** | No green **`master`** deploy for this promotion. **`curl -s -o /dev/null -w "%{http_code}"`** → **`https://satisfecho.de/`** **200**, **`https://satisfecho.de/api/health`** **200** (reachability only; does not validate CI marketing fetch or server steps from **24773000757**). |

### Overall

**FAIL** — criteria **1** and **2** failed; criterion **3** **N/A**.

### Loop protection

Per **`agents2/020-test.md`**, verification has failed **more than three** times for the same underlying blockers (**branch parity** + **marketing artifact fetch**). This run documents the same outcome again; stop repeated tester cycles until secrets/PAT parity for marketing bundles is fixed and **`master`** is promoted or deploy is re-run successfully—then return task to **UNTESTED**.

### Product owner feedback

Issue **#195** remains unverified: **`origin/master`** is still at **`7a2c2bd`** while **`origin/development`** has advanced (**94** commits ahead). The latest **`master`** **Deploy to amvara9** run (**24773000757**) is still red at **Fetch marketing site artifacts**, so SSH, server sync, build/restart, and smoke steps did not run. Configure **Actions** secrets (**`MARKETING_ARTIFACT_TOKEN`** / **`GH_TOKEN`** scope per **`config/marketing-sites.json`**), **Re-run failed jobs** or trigger a new **`master`** deploy after secrets are valid, or use **`scripts/deploy-amvara9.sh`** manually with real marketing bundles; then move this task back to **UNTESTED** for re-verification.

### URLs tested

1. https://github.com/satisfecho/pos/actions/runs/24773000757 (**Actions** run via **`gh run view`**).
2. https://satisfecho.de/ (**HTTP 200**).
3. https://satisfecho.de/api/health (**HTTP 200**).

### Relevant log excerpts

**Branch parity (2026-04-22 19:36 UTC):**

```text
$ git rev-parse origin/master origin/development
7a2c2bd59b2cfb6cbc6a55ac407993494b17256f
2d066bc62bba75bb657ed48bf9ee9712ea457e53

$ git rev-list --left-right --count origin/master...origin/development
0	94
```

**GitHub Actions (`gh run view 24773000757 --json` — deploy job steps):**

```text
Fetch marketing site artifacts (curl + GitHub API) → failure
Set up SSH → skipped
Checkout latest code on amvara9 → skipped
Sync marketing sites to server → skipped
Build and restart stack on amvara9 → skipped
Smoke test (landing, version, API health) → skipped
```

---

## Test report

### Date/time (UTC) and log window

- **Verification run:** **2026-04-22 19:44 UTC** (`date -u`; **`git fetch origin`**, **`gh run list` / `gh run view`**, **`curl`** immediately after **`./scripts/git-sync-development.sh`** at start of this tester step).
- **Workflow evidence:** **`Deploy to amvara9`** run **`24773000757`** — **`updatedAt`** **2026-04-22T10:18:30Z**; deploy job **`72484038503`**; step **Fetch marketing site artifacts (curl + GitHub API)** **failure**; downstream steps **skipped** (per **`gh run view 24773000757 --json`**).

### Environment

- **Repo:** `satisfecho/pos`; **`./scripts/git-sync-development.sh`** run before task file edits.
- **Remote tips after `git fetch origin`:** **`origin/master`** **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`**, **`origin/development`** **`8ee75163704fc86e33f36d664df9c3e304c5348a`** (divergent).
- **Compose / local Docker:** not used (git + CI + optional prod **`curl`**).

### What was tested

Per **Testing instructions** §1–§3: **`origin/master`** vs **`origin/development`**; latest **Deploy to amvara9** on **`master`**; optional **`curl`** to **`https://satisfecho.de/`** and **`/api/health`**.

### Results

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | **`origin/master`** matches **`origin/development`** at **`7a2c2bd`** (or later shared tip) | **FAIL** | `git rev-parse origin/master origin/development` → two SHAs above; `git rev-list --left-right --count origin/master...origin/development` → **`0	96`** (**development** **96** commits ahead). |
| 2 | **GitHub Actions — Deploy to amvara9** latest **`master`** deploy green through marketing fetch, SSH, server deploy, smoke | **FAIL** | **`gh run list --workflow "Deploy to amvara9" --branch master --limit 8`**: latest **`24773000757`** **completed** **failure**. **`gh run view 24773000757 --json`**: **`conclusion`** **`failure`**; step **Fetch marketing site artifacts** **`failure`**; **Set up SSH** through **Smoke test** **`skipped`**. |
| 3 | Optional live check after **green** deploy | **N/A** | No green **`master`** deploy for this promotion. **`curl -s -o /dev/null -w "%{http_code}"`** → **`https://satisfecho.de/`** **200**, **`https://satisfecho.de/api/health`** **200** (reachability only). |

### Overall

**FAIL** — criteria **1** and **2** failed; criterion **3** **N/A**.

### Loop protection

Prior reports already exceeded three failures on the same blockers (**branch parity** + **marketing artifact fetch**); this pass **re-confirms** the same state. Stop further redundant tester cycles until **`master`** is promoted to match **`development`** (or team accepts scope) **and** **Actions** secrets / PAT allow **Fetch marketing site artifacts** to succeed **or** a **green** **`master`** deploy replaces **24773000757** — then return task to **UNTESTED**.

### Product owner feedback

Issue **#195** is still not verified: **`origin/master`** remains at **`7a2c2bd`** while **`origin/development`** is **`8ee75163`** (**96** commits ahead). The latest **`master`** **Deploy to amvara9** run (**24773000757**) is still red at **Fetch marketing site artifacts**, so SSH, server sync, build/restart, and smoke steps did not run. Fix **Actions** secrets (**`MARKETING_ARTIFACT_TOKEN`** / **`GH_TOKEN`** scope per **`config/marketing-sites.json`**), **Re-run failed jobs** or trigger a new **`master`** deploy after secrets are valid, or use **`scripts/deploy-amvara9.sh`** manually with real marketing bundles; then rename this task to **UNTESTED** for re-verification.

### URLs tested

1. https://github.com/satisfecho/pos/actions/runs/24773000757 (**Actions** run via **`gh run view`**).
2. https://satisfecho.de/ (**HTTP 200**).
3. https://satisfecho.de/api/health (**HTTP 200**).

### Relevant log excerpts

**Branch parity (2026-04-22 19:44 UTC):**

```text
$ git rev-parse origin/master origin/development
7a2c2bd59b2cfb6cbc6a55ac407993494b17256f
8ee75163704fc86e33f36d664df9c3e304c5348a

$ git rev-list --left-right --count origin/master...origin/development
0	96
```

**GitHub Actions (`gh run view 24773000757 --json` — deploy job steps):**

```text
Fetch marketing site artifacts (curl + GitHub API) → failure
Set up SSH → skipped
Checkout latest code on amvara9 → skipped
Sync marketing sites to server → skipped
Build and restart stack on amvara9 → skipped
Smoke test (landing, version, API health) → skipped
```

---

## Test report

### Date/time (UTC) and log window

- **Verification run:** **2026-04-22 19:57 UTC** (`date -u`; **`git fetch origin`**, **`gh run list`** / **`gh run view`**, **`curl`** immediately after **`./scripts/git-sync-development.sh`**).
- **Workflow evidence:** **`Deploy to amvara9`** run **`24773000757`** — **`updatedAt`** **2026-04-22T10:18:30Z**; deploy job **`72484038503`**; step **Fetch marketing site artifacts (curl + GitHub API)** **failure**; downstream steps **skipped** (per **`gh run view 24773000757 --json`**).

### Environment

- **Repo:** `satisfecho/pos`; **`./scripts/git-sync-development.sh`** run before task file edits.
- **Branch:** local **`development`** tracking **`origin/development`** after fetch.
- **Remote tips:** **`origin/master`** **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`**, **`origin/development`** **`a8c53fa4d79c0100598451faf2f41ceb7dc1916c`** (divergent).
- **Compose / local Docker:** not used (git + CI + optional prod **`curl`**).

### What was tested

Per **Testing instructions** §1–§3: **`origin/master`** vs **`origin/development`**; latest **Deploy to amvara9** on **`master`**; optional **`curl`** to **`https://satisfecho.de/`** and **`/api/health`**.

### Results

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | **`origin/master`** matches **`origin/development`** at **`7a2c2bd`** (or later shared tip) | **FAIL** | `git rev-parse origin/master origin/development` → two SHAs above; `git rev-list --left-right --count origin/master...origin/development` → **`0	98`** (**development** **98** commits ahead). |
| 2 | **GitHub Actions — Deploy to amvara9** latest **`master`** deploy green through marketing fetch, SSH, server deploy, smoke | **FAIL** | **`gh run list --workflow "Deploy to amvara9" --branch master --limit 5`**: latest **`24773000757`** **completed** **failure**. **`gh run view 24773000757 --json`**: **`conclusion`** **`failure`**; step **Fetch marketing site artifacts (curl + GitHub API)** **`failure`**; **Set up SSH** through **Smoke test** **`skipped`**. |
| 3 | Optional live check after **green** deploy | **N/A** | No green **`master`** deploy for this promotion. **`curl -s -o /dev/null -w "%{http_code}"`** → **`https://satisfecho.de/`** **200**, **`https://satisfecho.de/api/health`** **200** (reachability only). |

### Overall

**FAIL** — criteria **1** and **2** failed; criterion **3** **N/A**.

### Loop protection

Prior tester reports already exceeded three failures on the same underlying blockers (**branch parity** + **marketing artifact fetch**). This pass **re-confirms** the same state; stop redundant cycles until **`master`** is promoted (or scope is explicitly accepted) **and** marketing **Actions** secrets / PAT allow **Fetch marketing site artifacts** to succeed **or** a newer **green** **`master`** deploy appears — then return the task to **UNTESTED**.

### Product owner feedback

Issue **#195** remains unverified: **`origin/master`** is still **`7a2c2bd`** while **`origin/development`** is **`a8c53fa`** (**98** commits ahead). The latest **`master`** **Deploy to amvara9** run (**24773000757**) is still red at **Fetch marketing site artifacts**, so SSH, server sync, build/restart, and smoke steps did not run. Configure **Actions** secrets (**`MARKETING_ARTIFACT_TOKEN`** / **`GH_TOKEN`** scope per **`config/marketing-sites.json`**), **Re-run failed jobs** or trigger a new **`master`** deploy after secrets are valid, or use **`scripts/deploy-amvara9.sh`** manually with real marketing bundles; then rename this task back to **UNTESTED** for re-verification.

### URLs tested

1. https://github.com/satisfecho/pos/actions/runs/24773000757 (**Actions** run via **`gh run view`**).
2. https://satisfecho.de/ (**HTTP 200**).
3. https://satisfecho.de/api/health (**HTTP 200**).

### Relevant log excerpts

**Branch parity (2026-04-22 19:57 UTC):**

```text
$ git rev-parse origin/master origin/development
7a2c2bd59b2cfb6cbc6a55ac407993494b17256f
a8c53fa4d79c0100598451faf2f41ceb7dc1916c

$ git rev-list --left-right --count origin/master...origin/development
0	98
```

**GitHub Actions (`gh run view 24773000757 --json` — deploy job steps):**

```text
Fetch marketing site artifacts (curl + GitHub API) → failure
Set up SSH → skipped
Checkout latest code on amvara9 → skipped
Sync marketing sites to server → skipped
Build and restart stack on amvara9 → skipped
Smoke test (landing, version, API health) → skipped
```

---

## Test report

### Date/time (UTC) and log window

- **Verification run:** **2026-04-22 20:36 UTC** (`date -u`; **`git fetch origin`**, **`gh run list`** / **`gh run view`**, **`curl`** immediately after **`./scripts/git-sync-development.sh`** at repo root).
- **Workflow evidence:** **`Deploy to amvara9`** run **`24773000757`** — **`updatedAt`** **2026-04-22T10:18:30Z**; deploy job **`72484038503`**; step **Fetch marketing site artifacts (curl + GitHub API)** **failure**; downstream steps **skipped** (per **`gh run view 24773000757 --json`**).

### Environment

- **Repo:** `satisfecho/pos`; **`./scripts/git-sync-development.sh`** run before task file edits.
- **Branch:** local **`development`** tracking **`origin/development`** after **`git fetch origin`**.
- **Remote tips:** **`origin/master`** **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`**, **`origin/development`** **`ed1c62b0f53ab155f063b165e6ee74432c5ca9e0`** (divergent).
- **Compose / local Docker:** not used (git + CI + optional prod **`curl`**).

### What was tested

Per **Testing instructions** §1–§3: **`origin/master`** vs **`origin/development`**; latest **Deploy to amvara9** on **`master`**; optional **`curl`** to **`https://satisfecho.de/`** and **`/api/health`**.

### Results

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | **`origin/master`** matches **`origin/development`** at **`7a2c2bd`** (or later shared tip) | **FAIL** | `git rev-parse origin/master origin/development` → two SHAs above; `git rev-list --left-right --count origin/master...origin/development` → **`0	100`** (**development** **100** commits ahead). |
| 2 | **GitHub Actions — Deploy to amvara9** latest **`master`** deploy green through marketing fetch, SSH, server deploy, smoke | **FAIL** | **`gh run list --workflow "Deploy to amvara9" --branch master --limit 8`**: latest **`24773000757`** **completed** **failure**. **`gh run view 24773000757 --json`**: **`conclusion`** **`failure`**; step **Fetch marketing site artifacts (curl + GitHub API)** **`failure`**; **Set up SSH** through **Smoke test** **`skipped`**. |
| 3 | Optional live check after **green** deploy | **N/A** | No green **`master`** deploy for this promotion. **`curl -s -o /dev/null -w "%{http_code}"`** → **`https://satisfecho.de/`** **200**, **`https://satisfecho.de/api/health`** **200** (reachability only; does not validate CI marketing fetch or server steps from **24773000757**). |

### Overall

**FAIL** — criteria **1** and **2** failed; criterion **3** **N/A**.

### Loop protection

Prior tester reports already documented **more than three** failures on the same blockers (**branch parity** + **marketing artifact fetch**). This pass **re-confirms** the same state; avoid further redundant tester-only cycles until **`master`** is promoted (or scope is explicitly accepted) **and** marketing **Actions** secrets / PAT allow **Fetch marketing site artifacts** to succeed **or** a newer **green** **`master`** deploy replaces **24773000757** — then return the task to **UNTESTED**.

### Product owner feedback

Issue **#195** remains unverified: **`origin/master`** is still **`7a2c2bd`** while **`origin/development`** is **`ed1c62b0`** (**100** commits ahead). The latest **`master`** **Deploy to amvara9** run (**24773000757**) is still red at **Fetch marketing site artifacts**, so SSH, server sync, build/restart, and smoke steps did not run. Configure **Actions** secrets (**`MARKETING_ARTIFACT_TOKEN`** / **`GH_TOKEN`** scope per **`config/marketing-sites.json`**), **Re-run failed jobs** or trigger a new **`master`** deploy after secrets are valid, or use **`scripts/deploy-amvara9.sh`** manually with real marketing bundles; then rename this task back to **UNTESTED** for re-verification.

### URLs tested

1. https://github.com/satisfecho/pos/actions/runs/24773000757 (**Actions** run via **`gh run view`**).
2. https://satisfecho.de/ (**HTTP 200**).
3. https://satisfecho.de/api/health (**HTTP 200**).

### Relevant log excerpts

**Branch parity (2026-04-22 20:36 UTC):**

```text
$ git rev-parse origin/master origin/development
7a2c2bd59b2cfb6cbc6a55ac407993494b17256f
ed1c62b0f53ab155f063b165e6ee74432c5ca9e0

$ git rev-list --left-right --count origin/master...origin/development
0	100
```

**GitHub Actions (`gh run view 24773000757 --json` — deploy job steps):**

```text
Fetch marketing site artifacts (curl + GitHub API) → failure
Set up SSH → skipped
Checkout latest code on amvara9 → skipped
Sync marketing sites to server → skipped
Build and restart stack on amvara9 → skipped
Smoke test (landing, version, API health) → skipped
```

---

## Test report

### Date/time (UTC) and log window

- **Verification run:** **2026-04-22 21:15 UTC** (`date -u`; **`git fetch origin`**, **`gh run list`** / **`gh run view`**, **`curl`** immediately after **`./scripts/git-sync-development.sh`**).
- **Workflow evidence:** **`Deploy to amvara9`** run **`24773000757`** — **`updatedAt`** **2026-04-22T10:18:30Z**; **`conclusion`** **`failure`** at step **Fetch marketing site artifacts (curl + GitHub API)** (job **`72484038503`**).

### Environment

- **Repo:** `satisfecho/pos`; **`./scripts/git-sync-development.sh`** run before task file edits.
- **Branch:** local **`development`** tracking **`origin/development`** after **`git fetch origin`**.
- **Remote tips:** **`origin/master`** **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`**, **`origin/development`** **`27834e40d352fab9264c9c76036667633577bab0`** (divergent).
- **Compose / local Docker:** not used (git + CI + optional prod **`curl`**).

### What was tested

Per **Testing instructions** §1–§3: **`origin/master`** vs **`origin/development`**; latest **Deploy to amvara9** on **`master`**; optional **`curl`** to **`https://satisfecho.de/`** and **`/api/health`**.

### Results

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | **`origin/master`** matches **`origin/development`** at **`7a2c2bd`** (or later shared tip) | **FAIL** | `git rev-parse origin/master origin/development` → two SHAs above; `git rev-list --left-right --count origin/master...origin/development` → **`0	102`** (**development** **102** commits ahead). |
| 2 | **GitHub Actions — Deploy to amvara9** latest **`master`** deploy green through marketing fetch, SSH, server deploy, smoke | **FAIL** | **`gh run list --workflow "Deploy to amvara9" --branch master --limit 8`**: latest **`24773000757`** **completed** **failure**. **`gh run view 24773000757 --json`**: **`conclusion`** **`failure`**; step **Fetch marketing site artifacts** **`failure`**; **Set up SSH** through **Smoke test** **`skipped`**. |
| 3 | Optional live check after **green** deploy | **N/A** | No green **`master`** deploy for this promotion. **`curl -s -o /dev/null -w "%{http_code}"`** → **`https://satisfecho.de/`** **200**, **`https://satisfecho.de/api/health`** **200** (reachability only; does not validate CI marketing fetch or server steps from **24773000757**). |

### Overall

**FAIL** — criteria **1** and **2** failed; criterion **3** **N/A**.

### Loop protection

Prior reports already exceeded three failures on the same blockers (**branch parity** + **marketing artifact fetch**). This pass **re-confirms** unchanged remote/CI state (documented above); avoid redundant tester-only cycles until **`master`** matches **`development`** (or scope is accepted) **and** marketing **Actions** secrets / PAT allow **Fetch marketing site artifacts** to succeed **or** a newer **green** **`master`** **Deploy to amvara9** replaces **24773000757** — then return the task to **UNTESTED**.

### Product owner feedback

Issue **#195** remains unverified: **`origin/master`** is still **`7a2c2bd`** while **`origin/development`** is **`27834e40`** (**102** commits ahead). The latest **`master`** **Deploy to amvara9** run (**24773000757**) is still red at **Fetch marketing site artifacts**, so SSH, server sync, build/restart, and smoke steps did not run. Configure **Actions** secrets (**`MARKETING_ARTIFACT_TOKEN`** / **`GH_TOKEN`** scope per **`config/marketing-sites.json`**), **Re-run failed jobs** or trigger a new **`master`** deploy after secrets are valid, or use **`scripts/deploy-amvara9.sh`** manually with real marketing bundles; then rename this task back to **UNTESTED** for re-verification.

### URLs tested

1. https://github.com/satisfecho/pos/actions/runs/24773000757 (**Actions** run via **`gh run view`**).
2. https://satisfecho.de/ (**HTTP 200**).
3. https://satisfecho.de/api/health (**HTTP 200**).

### Relevant log excerpts

**Branch parity (2026-04-22 21:15 UTC):**

```text
$ git rev-parse origin/master origin/development
7a2c2bd59b2cfb6cbc6a55ac407993494b17256f
27834e40d352fab9264c9c76036667633577bab0

$ git rev-list --left-right --count origin/master...origin/development
0	102
```

**GitHub Actions (`gh run view 24773000757 --json` — deploy job steps):**

```text
Fetch marketing site artifacts (curl + GitHub API) → failure
Set up SSH → skipped
Checkout latest code on amvara9 → skipped
Sync marketing sites to server → skipped
Build and restart stack on amvara9 → skipped
Smoke test (landing, version, API health) → skipped
```

---

## Test report

### Date/time (UTC) and log window

- **Verification run:** **2026-04-22 21:39 UTC** (`date -u`; **`git fetch origin`**, **`gh run list`** / **`gh run view`**, **`curl`** immediately after **`./scripts/git-sync-development.sh`** at **`/Users/raro42/projects/pos2`**).
- **Workflow evidence:** **`Deploy to amvara9`** run **`24773000757`** — **`updatedAt`** **2026-04-22T10:18:30Z**; deploy job **`72484038503`**; step **Fetch marketing site artifacts (curl + GitHub API)** **`failure`**; downstream steps **`skipped`** (per **`gh run view 24773000757 --json`**).

### Environment

- **Repo:** `satisfecho/pos`; **`./scripts/git-sync-development.sh`** run before task file edits.
- **Branch:** local **`development`** tracking **`origin/development`** after **`git fetch origin`**.
- **Remote tips:** **`origin/master`** **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`**, **`origin/development`** **`5520aea4f68bb1b7a8d6feecff77ad79e156a77a`** (divergent).
- **Compose / local Docker:** not used (git + CI + optional prod **`curl`**).

### What was tested

Per **Testing instructions** §1–§3: **`origin/master`** vs **`origin/development`**; latest **Deploy to amvara9** on **`master`**; optional **`curl`** to **`https://satisfecho.de/`** and **`/api/health`**.

### Results

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | **`origin/master`** matches **`origin/development`** at **`7a2c2bd`** (or later shared tip) | **FAIL** | `git rev-parse origin/master origin/development` → two SHAs above; `git rev-list --left-right --count origin/master...origin/development` → **`0	104`** (**development** **104** commits ahead). |
| 2 | **GitHub Actions — Deploy to amvara9** latest **`master`** deploy green through marketing fetch, SSH, server deploy, smoke | **FAIL** | **`gh run list --workflow "Deploy to amvara9" --branch master --limit 8`**: latest **`24773000757`** **completed** **failure**. **`gh run view 24773000757 --json`**: **`conclusion`** **`failure`**; step **Fetch marketing site artifacts (curl + GitHub API)** **`failure`**; **Set up SSH** through **Smoke test** **`skipped`**. |
| 3 | Optional live check after **green** deploy | **N/A** | No green **`master`** deploy for this promotion. **`curl -s -o /dev/null -w "%{http_code}"`** → **`https://satisfecho.de/`** **200**, **`https://satisfecho.de/api/health`** **200** (reachability only; does not validate CI marketing fetch or server steps from **24773000757**). |

### Overall

**FAIL** — criteria **1** and **2** failed; criterion **3** **N/A**.

### Loop protection

Prior reports already exceeded three failures on the same blockers (**branch parity** + **marketing artifact fetch**). This pass **re-confirms** unchanged remote/CI state only; defer further tester cycles until **`master`** matches **`development`** (or scope is explicitly accepted) **and** marketing **Actions** secrets / PAT allow **Fetch marketing site artifacts** to succeed **or** a newer **green** **`master`** **Deploy to amvara9** replaces **24773000757** — then return the task to **UNTESTED**.

### Product owner feedback

Issue **#195** remains unverified: **`origin/master`** is still **`7a2c2bd`** while **`origin/development`** is **`5520aea4`** (**104** commits ahead). The latest **`master`** **Deploy to amvara9** run (**24773000757**) is still red at **Fetch marketing site artifacts**, so SSH, server sync, build/restart, and smoke steps did not run. Configure **Actions** secrets (**`MARKETING_ARTIFACT_TOKEN`** / **`GH_TOKEN`** scope per **`config/marketing-sites.json`**), **Re-run failed jobs** or trigger a new **`master`** deploy after secrets are valid, or use **`scripts/deploy-amvara9.sh`** manually with real marketing bundles; then rename this task back to **UNTESTED** for re-verification.

### URLs tested

1. https://github.com/satisfecho/pos/actions/runs/24773000757 (**Actions** run via **`gh run view`**).
2. https://satisfecho.de/ (**HTTP 200**).
3. https://satisfecho.de/api/health (**HTTP 200**).

### Relevant log excerpts

**Branch parity (2026-04-22 21:39 UTC):**

```text
$ git rev-parse origin/master origin/development
7a2c2bd59b2cfb6cbc6a55ac407993494b17256f
5520aea4f68bb1b7a8d6feecff77ad79e156a77a

$ git rev-list --left-right --count origin/master...origin/development
0	104
```

**GitHub Actions (`gh run view 24773000757 --json` — deploy job steps):**

```text
Fetch marketing site artifacts (curl + GitHub API) → failure
Set up SSH → skipped
Checkout latest code on amvara9 → skipped
Sync marketing sites to server → skipped
Build and restart stack on amvara9 → skipped
Smoke test (landing, version, API health) → skipped
```

---

## Testing instructions

1. **Git:** Confirm **`origin/master`** matches **`origin/development`** at **`7a2c2bd`** (or later if additional commits landed):  
   `git fetch origin && git rev-parse origin/master origin/development`
2. **GitHub Actions:** Open **Actions** → **Deploy to amvara9** → run **`24773000757`** (or latest **`master`** deploy). After secrets are fixed, either **Re-run failed jobs** or trigger a new deploy from **`master`** and expect **green** through **Fetch marketing site artifacts**, **Set up SSH**, **Build and restart stack on amvara9**, **Smoke test**.
3. **Optional live check:** After a **green** deploy, verify **`https://satisfecho.de/`** (or documented prod URL) and API health per **`docs/0001-ci-cd-amvara9.md`** / smoke step output.
4. **Manual fallback:** If CI cannot be fixed immediately, an operator may run **`scripts/deploy-amvara9.sh`** from the server checkout per **`README.md`** / **`AGENTS.md`** (still needs marketing bundles resolved for full parity with CI).
