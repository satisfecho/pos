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

- **Started:** 2026-04-22 ~16:26 UTC (verification commands and issue updates).
- **Evidence window:** workflow run **`24773000757`** logs timestamped **2026-04-22T10:18:26Z**–**10:18:27Z** (failed job step **Fetch marketing site artifacts**).

### Environment

- **Repo:** `pos` (`satisfecho/pos`), synced via `./scripts/git-sync-development.sh` before edits.
- **Branches checked:** **`origin/master`**, **`origin/development`** after **`git fetch origin`**.
- **Compose / local Docker:** not required for these criteria (no application change under test).
- **`BASE_URL` (prod spot-check):** `https://satisfecho.de` (HEAD only; optional criterion tied to green deploy).

### What was tested

Per **Testing instructions** §1–§3: remote branch parity, **`Deploy to amvara9`** outcome for **`master`** push (**24773000757** / latest), optional prod reachability context.

### Results

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | **`origin/master`** matches **`origin/development`** at **`7a2c2bd`** or the same newer tip | **FAIL** | `git rev-parse origin/master origin/development` → **`7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`** vs **`a269faad95345146b7da94f0197e4f1898ce6dec`** (different tips). `git rev-list --left-right --count origin/master...origin/development` → **`0	78`** (**development** is **78** commits ahead of **master**). |
| 2 | **GitHub Actions — Deploy to amvara9** for relevant **`master`** deploy: green through marketing fetch, SSH, server sync, smoke | **FAIL** | `gh run view 24773000757 --repo satisfecho/pos`: status **X** (failed). Latest **`Deploy to amvara9`** runs on **`master`** remain **failure** (same run listed first in `gh run list --workflow "Deploy to amvara9"`). Failed step logs show empty **`MARKETING_ARTIFACT_TOKEN`** / **`GH_TOKEN`**, **`MARKETING_VERIFY_NO_PLACEHOLDERS=1`** errors for slugs **antillana**, **dilruba**, **flamanapolitana**, **gustazo**, **hakone**. |
| 3 | Optional live check after green deploy | **N/A** | No green **`master`** deploy verified; superficial **`curl`** only: **`/`** and **`/api/health`** returned **HTTP 200** (does not prove the failing workflow’s bundles or post-deploy smoke). |

### Overall

**FAIL** — criteria **1** and **2** failed; optional **3** not satisfied as specified (no green deploy path).

### Product owner feedback

Promotion and automated deploy for issue **#195** are not yet verifiable: **`development`** has moved well past **`master`**, so the “both branches at the same promoted commit” check does not hold. The **`Deploy to amvara9`** workflow for the **`master`** push is still red because marketing artifact secrets or PAT scope are missing in CI, so server steps never ran. Until repo secrets are fixed and a **`master`** deploy completes green (or an equivalent documented manual deploy with real marketing bundles), treat production as **not** updated by this pipeline run.

### URLs tested

1. https://github.com/satisfecho/pos/actions/runs/24773000757 (**Deploy to amvara9**, run metadata via **`gh run view`**).
2. https://satisfecho.de/ (**HTTP 200**, spot check).
3. https://satisfecho.de/api/health (**HTTP 200**, spot check).

### Relevant log excerpts

**GitHub Actions (failed job — marketing sync):**

```text
MARKETING_ARTIFACT_TOKEN:
GH_TOKEN:
[marketing-sync] no token — try local build for antillana
...
[marketing-sync] ::error::placeholder still present for slug=antillana — missing artifact or PAT scope
...
##[error]Process completed with exit code 1.
```

**Host commands (branch parity):**

```text
$ git rev-parse origin/master origin/development
7a2c2bd59b2cfb6cbc6a55ac407993494b17256f
a269faad95345146b7da94f0197e4f1898ce6dec
```
