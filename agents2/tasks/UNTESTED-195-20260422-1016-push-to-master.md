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

## Previous verification (2026-04-26) — FAIL (for context)

1. **Date/time (UTC) and log window**  
   - 2026-04-26T (approximately) single verification pass; `gh run view` / `git` commands run on host (no `docker logs` for this task — no local stack test required in instructions).

2. **Environment**  
   - **Branch:** local `development` synced (already up to date with `origin/development` before edits).  
   - **Remotes:** `git fetch origin` from `/Users/raro42/projects/pos2`.  
   - **`BASE_URL` / browser:** N/A — no optional live check (deploy not green).  
   - **Evidence:** `gh` CLI to `satisfecho/pos` Actions (authenticated).

3. **What was tested (from Testing instructions)**  
   - (1) `origin/master` vs `origin/development` with `rev-parse`  
   - (2) GitHub Actions run `24773000757` and latest `Deploy to amvara9` on `master`  
   - (3) Optional `https://satisfecho.de/` — **skipped** (no green deploy)  
   - (4) Manual server deploy — not executed

4. **Results**

   | Criterion | Result | Evidence |
   |---|---|---|
   | 1. Git: refs aligned | **FAIL** | `git rev-parse origin/master origin/development` → `7a2c2bd59b2cfb6cbc6a55ac407993494b17256f` then `c609795496451ac7ec1b095dc5b7620f51d5dfc8` (two different SHAs). `7a2c2bd` is an ancestor of `c6097954` on `development`; `origin/master` is still the promoted commit `7a2c2bd` while `origin/development` has advanced (e.g. follow-up work after promotion). |
   | 2. GitHub Actions: deploy green for relevant run | **FAIL** | `gh run view 24773000757 --repo satisfecho/pos` → run **X failed** at **Fetch marketing site artifacts**; subsequent jobs (SSH, stack, smoke) **not run**. `gh run list --workflow "Deploy to amvara9" --limit 5` on `master`: latest push deploy is still the failed `24773000757` (2026-04-22); no newer **success** after that for `master` deploy. |
   | 3. Optional production URL / health after green | **N/A** | No green deploy; optional step not applicable. |
   | 4. Manual fallback on server | **N/A** | Not run (out of scope for this verification pass). |

5. **Overall: FAIL**  
   - Failed: strict branch-tip match for instruction (1), and (2) deployment pipeline not successful — marketing artifact token/placeholder problem unchanged in recorded run. **Follow-up:** add/configure `MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN` in repo Actions secrets and re-run deploy (per implementation summary and workflow log); then re-test.

6. **Product owner feedback**  
   The merge to `master` at `7a2c2bd` is present on the remote, but `development` has since moved forward and the automated amvara9 deploy for that `master` push is still **red** in Actions (marketing bundles), so end-to-end “promote and deploy successfully” is not verified. Operators should treat production as not updated by that **green** pipeline until a successful workflow run is observed.

7. **URLs tested**  
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757` (run metadata and status)  
   - **N/A** — no full browser product URLs (optional prod check skipped).

8. **Relevant log excerpts (CI — failed step)**  
   - From `gh run view 24773000757 --log-failed` (truncated):  
   - `MARKETING_ARTIFACT_TOKEN:` and `GH_TOKEN:` empty; `[marketing-sync] no token` for antillana, dilruba, flamanapolitana, gustazo, hakone; `::error::placeholder still present for slug=...`; `Process completed with exit code 1`.

## Testing instructions

1. **Git:** Confirm **`origin/master`** and **`origin/development`** are at the expected points for the promotion under test (e.g. after a new merge, re-check tips):  
   `git fetch origin && git rev-parse origin/master origin/development`
2. **GitHub Actions:** Open **Actions** → **Deploy to amvara9** → run **`24773000757`** (or latest **`master`** deploy). After secrets are fixed, either **Re-run failed jobs** or trigger a new deploy from **`master`** and expect **green** through **Fetch marketing site artifacts**, **Set up SSH**, **Build and restart stack on amvara9**, **Smoke test**.
3. **Optional live check:** After a **green** deploy, verify **`https://satisfecho.de/`** (or documented prod URL) and API health per **`docs/0001-ci-cd-amvara9.md`** / smoke step output.
4. **Manual fallback:** If CI cannot be fixed immediately, an operator may run **`scripts/deploy-amvara9.sh`** from the server checkout per **`README.md`** / **`AGENTS.md`** (still needs marketing bundles resolved for full parity with CI).

## Test report

1. **Date/time (UTC) and log window**  
   - **Verification:** 2026-04-26T16:32Z–16:38Z (approx.).  
   - **Evidence:** `git` / `gh` / `curl` on host; CI failed-step logs via `gh run view 24773000757 --log-failed` (not `docker logs` — task scope is git + GitHub deploy).

2. **Environment**  
   - **Branch:** `development` synced (already up to date with `origin/development` at run start, per `./scripts/git-sync-development.sh`).  
   - **Remotes (after `git fetch origin`):** `origin/master` = `7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`, `origin/development` = `e3da5729b85529de0de417d17543ee65c899e1c7`.  
   - **Compose / local app:** N/A (not in Testing instructions for this task).

3. **What was tested (from “What to verify” / Testing instructions)**  
   - (1) `git rev-parse` for both remotes; whether lineage matches expected post-promotion state.  
   - (2) GitHub Actions **Deploy to amvara9** for latest **`master`** deploy (run **24773000757** and list for newer).  
   - (3) Optional: prod URLs after green — N/A to strict pass/fail (deploy not green); sanity **curl** to `https://satisfecho.de/api/health` and `/` for context.  
   - (4) Manual server deploy — N/A (not run).

4. **Results**

   | Criterion | Result | Evidence line |
   |---|---|---|
   | 1. Git: refs / lineage | **PASS** | `git rev-parse origin/master origin/development` (SHAs above); `git merge-base --is-ancestor origin/master origin/development` → exit **0** (all commits on `origin/master` are in `origin/development`’s history — expected after a promotion, with `development` having advanced). |
   | 2. GitHub Actions: deploy **green** for latest **`master`** deploy | **FAIL** | `gh run list --workflow "Deploy to amvara9" --limit 8`: latest on **`master`** is **24773000757** (2026-04-22T10:18:20Z) **failure**. `gh run view 24773000757` → **X** at **Fetch marketing site artifacts (curl + GitHub API)**; **Set up SSH** through **Smoke test** not run. No newer **success** on `master` after 24710137656 / 24773000757 in this list. |
   | 3. Optional live check after **green** | **N/A** | No green master deploy; optional step not applicable. |
   | 4. Manual fallback | **N/A** | Not run. |
   | Sanity (not replacing (2)) | **INFO** | `curl` → `https://satisfecho.de/api/health` **200**, `https://satisfecho.de/` **200**; does not prove a successful 24773000757 pipeline. |

5. **Overall: FAIL**  
   - Fails criterion **2** — automated amvara9 deploy for the **master** push in scope is not green (marketing token / placeholder bundles, unchanged from prior report). Criterion **1** passes. **Next:** add/configure **`MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN`** in repo Actions (PAT with Actions read on all repos in **`config/marketing-sites.json`**) and **re-run** failed jobs or push a new **`master` deploy; then re-test per Testing instructions (optional prod check after green).

6. **Product owner feedback**  
   Production URLs respond with HTTP 200, but the **Deploy to amvara9** run tied to the **`master` push in question** still fails in CI before any SSH or smoke steps. Until a workflow run is **success** through marketing fetch and smoke, the issue’s “confirm deployment action succeeded on GitHub” is **not** satisfied. Operators must fix the secret/PAT and get a **green** run; branch lineage alone is not enough to close the loop.

7. **URLs tested (numbered list)**  
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757` (run view / status)  
   2. `https://satisfecho.de/api/health` (200 — sanity)  
   3. `https://satisfecho.de/` (200 — sanity)

8. **Relevant log excerpts (last section — CI, failed step)**  
   - From `gh run view 24773000757 --log-failed` (excerpt):  
   - `MARKETING_ARTIFACT_TOKEN:` and `GH_TOKEN:` empty.  
   - `[marketing-sync] no token` / skip (antillana, dilruba, flamanapolitana, gustazo, hakone).  
   - `::error::placeholder still for slug=...` (missing artifact or PAT scope; token with Actions read on every repo in `config/marketing-sites.json`).  
   - `##[error]Process completed with exit code 1.`

## Test report (2026-04-26, tester re-verification)

1. **Date/time (UTC) and log window**  
   - **Window:** 2026-04-26T16:42Z–16:44Z (host commands: `git`, `gh`, `curl`; not `docker logs` — not required by Testing instructions for this task).

2. **Environment**  
   - **Compose / local app:** N/A.  
   - **Branch (local):** `development` after `./scripts/git-sync-development.sh` (up to date with `origin/development`).  
   - **Remotes (after `git fetch origin`):** `origin/master` = `7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`, `origin/development` = `b9e7fce7ec5e18f21b46c4d5b7cf0a292585e3d4`.  
   - **Evidence type:** `gh run list/view` to `satisfecho/pos` Actions.

3. **What was tested (from “Testing instructions”)**  
   - (1) `git rev-parse origin/master origin/development` and ancestor check.  
   - (2) **Deploy to amvara9** — latest workflow run for **`master`** and status of run **24773000757** (or newer **master** run if any).  
   - (3) Optional live check after **green** — N/A (no new green **master** deploy in this run).  
   - (4) Manual server deploy — N/A (not run).

4. **Results**

   | Criterion | Result | Evidence line |
   |---|---|---|
   | 1. Git: `origin/master` / `origin/development` and lineage | **PASS** | `git rev-parse` (SHAs above). `git merge-base --is-ancestor origin/master origin/development` → exit **0** (promoted **master** tip is contained in **development**). |
   | 2. GitHub Actions: **green** for latest **`master`** **Deploy to amvara9** | **FAIL** | `gh run list --workflow "Deploy to amvara9" --branch master --limit 5` → most recent is **24773000757** (2026-04-22) **conclusion: failure**; `gh run view 24773000757 --json conclusion` → **"failure"**. No newer **success** on `master` after 24710137656 / 24773000757. |
   | 3. Optional after green | **N/A** | Not applicable until (2) passes. |
   | 4. Manual fallback | **N/A** | Not run. |
   | Sanity (HTTP) | **INFO** | `curl` → `https://satisfecho.de/api/health` and `/` return **200**; does not prove a green deploy pipeline. |

5. **Overall: FAIL**  
   - Criterion **2** fails: the issue’s requirement to confirm the **Deploy to amvara9** run **succeeded** on GitHub is **not** met; latest `master` deploy in scope is still the failed run **24773000757** (same root cause as prior reports: marketing artifact token / placeholder bundles; SSH/smoke not executed). Criterion **1** passes. **Not loop protection** — this is a fresh re-check; underlying CI state unchanged.

6. **Product owner feedback**  
   Branch state is healthy (**master** is an ancestor of **development**), but the automated production deploy workflow for the **`master`** line remains **red**. Until a **success** run completes marketing fetch and downstream steps, do not treat the issue as closed from a “green Actions deploy” perspective. Add/configure the PAT/secrets and re-run or re-trigger deploy, then re-open verification (**UNTESTED-** after coder handoff).

7. **URLs tested (numbered list)**  
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757`  
   2. `https://satisfecho.de/api/health` (200)  
   3. `https://satisfecho.de/` (200)

8. **Relevant log excerpts (CI — not re-fetched; run unchanged)**  
   - `gh run view 24773000757 --json conclusion` **→** `failure` (re-verified 2026-04-26T16:43Z).  
   - For step-level text, the prior run’s `--log-failed` excerpt in this file still applies (empty `MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN`, placeholder slugs) until a new workflow run replaces it.

## Test report (2026-04-26, tester)

1. **Date/time (UTC) and log window**  
   - **Window:** 2026-04-26T16:50Z–16:51Z.  
   - **Commands:** `git` / `gh` / `curl` on host from `/Users/raro42/projects/pos2` (not `docker logs` — not required by Testing instructions for this task).

2. **Environment**  
   - **Compose / local app:** N/A.  
   - **Branch:** `development` after `./scripts/git-sync-development.sh` (up to date with `origin/development` before this step).  
   - **Remotes (after `git fetch origin`):** `origin/master` = `7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`, `origin/development` = `7dafe2e052876db5471062d241780eea313ce637`.  
   - **Evidence:** `gh` against `satisfecho/pos` Actions; `gh run view 24773000757 --json conclusion`.

3. **What was tested (from “Testing instructions”)**  
   - (1) `git rev-parse origin/master origin/development` and `merge-base` ancestor check.  
   - (2) **Deploy to amvara9** — latest workflow run for **`master`**; status of **24773000757** and whether any newer **success** supersedes it.  
   - (3) Optional after **green** — N/A (no green **master** deploy).  
   - (4) Manual server deploy — N/A (not run).

4. **Results**

   | Criterion | Result | Evidence line |
   |---|---|---|
   | 1. Git: `origin/master` / `origin/development` and lineage | **PASS** | SHAs above; `git merge-base --is-ancestor origin/master origin/development` → exit **0** (master tip is an ancestor of development). |
   | 2. GitHub Actions: **green** for latest **`master`** **Deploy to amvara9** | **FAIL** | `gh run list --repo satisfecho/pos --workflow "Deploy to amvara9" --branch master --limit 6` — most recent is **24773000757** (2026-04-22T10:18:20Z) **failure**. `gh run view 24773000757 --json conclusion` → **`"failure"`** (https://github.com/satisfecho/pos/actions/runs/24773000757). No newer **success** on `master` after 24710137656 / 24773000757 in the listed range. |
   | 3. Optional after green | **N/A** | Not applicable until (2) passes. |
   | 4. Manual fallback | **N/A** | Not run. |
   | Sanity (HTTP) | **INFO** | `curl` → `https://satisfecho.de/api/health` and `https://satisfecho.de/` return **200**; does not prove a green **Deploy to amvara9** pipeline. |

5. **Overall: FAIL**  
   - Criterion **2** fails: the **Deploy to amvara9** run for the current **`master`**-line check remains **24773000757** with conclusion **failure**; issue requirement to confirm a **successful** deployment action on GitHub is **not** satisfied. Criterion **1** passes. **Not loop protection** (single re-check; underlying CI state for that run is unchanged from prior WIP/UNTESTED reports). **Next:** configure **`MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN`** per task summary and re-run the workflow or trigger a new **`master`** deploy; return task to **UNTESTED-** for another verification pass when ready.

6. **Product owner feedback**  
   Remote branches look healthy after promotion (`origin/master` is an ancestor of `origin/development`), but the latest **`master`** **Deploy to amvara9** run in GitHub is still the failed April 22 run. Public URLs return 200, which does not replace a green workflow; operators need a **success** run (marketing secrets resolved) before treating deploy as verified.

7. **URLs tested (numbered list)**  
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757` (run view / JSON conclusion)  
   2. `https://satisfecho.de/api/health` (200 — sanity)  
   3. `https://satisfecho.de/` (200 — sanity)

8. **Relevant log excerpts (last section)**  
   - `gh run view 24773000757 --json url,conclusion,displayTitle` (2026-04-26T16:50Z): **`conclusion: failure`**, `url` as in §7.1.  
   - Step-level failure text unchanged from prior reports; re-fetch with `gh run view 24773000757 --log-failed` if full CI logs are needed (marketing token empty / placeholder slugs).

## Test report (2026-04-26, tester)

1. **Date/time (UTC) and log window**  
   - **Window:** 2026-04-26T17:05Z–17:06Z.  
   - **Commands:** `git` / `gh` / `curl` on host at `/Users/raro42/projects/pos2` (not `docker logs` — not required by Testing instructions).

2. **Environment**  
   - **Branch:** `development` after `./scripts/git-sync-development.sh` (fetched; up to date with `origin/development` before this step).  
   - **Remotes (after `git fetch origin`):** `origin/master` = `7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`, `origin/development` = `75e2499620faa4b09293a11d27e2d2cd20247add`.  
   - **Compose / local app:** N/A.  
   - **Evidence:** `gh` to `satisfecho/pos` Actions.

3. **What was tested (from “Testing instructions”)**  
   - (1) `git rev-parse origin/master origin/development` and ancestor check.  
   - (2) **Deploy to amvara9** — latest workflow run for **`master`**; status of **24773000757** and any newer run.  
   - (3) Optional after **green** — N/A (no green **master** deploy).  
   - (4) Manual server deploy — N/A (not run).

4. **Results**

   | Criterion | Result | Evidence line |
   |---|---|---|
   | 1. Git: `origin/master` / `origin/development` and lineage | **PASS** | SHAs above; `git merge-base --is-ancestor origin/master origin/development` → exit **0** (promoted **master** tip is an ancestor of **development**). |
   | 2. GitHub Actions: **green** for latest **`master`** **Deploy to amvara9** | **FAIL** | `gh run list --repo satisfecho/pos --workflow "Deploy to amvara9" --branch master --limit 8` — most recent is still **24773000757** (2026-04-22T10:18:20Z) with **conclusion: failure**. `gh run view 24773000757 --json conclusion` → **`"failure"`**. No newer **success** on `master` supersedes this in the listed runs. |
   | 3. Optional after green | **N/A** | Not applicable until (2) passes. |
   | 4. Manual fallback | **N/A** | Not run. |
   | Sanity (HTTP) | **INFO** | `curl` — `https://satisfecho.de/api/health` **200**, `https://satisfecho.de/` **200**; does not prove a green deploy pipeline. |

5. **Overall: FAIL**  
   - Criterion **2** fails: the **Deploy to amvara9** run for the **`master`**-line check remains **24773000757** with **failure** (unchanged: marketing token / placeholder bundles; downstream deploy/smoke not completed). Criterion **1** passes. **Not loop protection** (single check; no change in latest `master` deploy list vs prior WIP/UNTESTED state). **Next:** configure **Actions secrets** per task (`MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN` / PAT scope on repos in `config/marketing-sites.json`), re-run the workflow or trigger a new **`master`** push deploy; return task to **UNTESTED-** when ready for re-verification.

6. **Product owner feedback**  
   `origin/master` is correctly behind **development** with a valid ancestry (promotion line intact), but the latest **`master`** **Deploy to amvara9** in GitHub is still the same failed run from 22 Apr; the issue’s bar for a **successful** deploy workflow is not met. **Public health/homepage 200s** are informative only; they do not replace a green **Deploy to amvara9** run.

7. **URLs tested (numbered list)**  
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757` (run `conclusion: failure`, `updatedAt` 2026-04-22T10:18:30Z)  
   2. `https://satisfecho.de/api/health` (200)  
   3. `https://satisfecho.de/` (200)

8. **Relevant log excerpts (last section)**  
   - `gh run view 24773000757 --json conclusion,url,updatedAt` (2026-04-26T17:05Z): **`"conclusion":"failure"`**, `url` **https://github.com/satisfecho/pos/actions/runs/24773000757**.  
   - Step-level logs: unchanged from prior reports; use `gh run view 24773000757 --log-failed` for **Fetch marketing site artifacts** (empty token / placeholder slugs) if needed.

## Test report (2026-04-26, tester — 020 session)

1. **Date/time (UTC) and log window**  
   - **Window:** 2026-04-26T17:10Z–17:13Z.  
   - **Commands:** `git` / `gh` / `curl` on host at `/Users/raro42/projects/pos2` (after `./scripts/git-sync-development.sh`). Not `docker logs` (not in Testing instructions).

2. **Environment**  
   - **Branch (local):** `development` synced; **remotes (after `git fetch origin`):** `origin/master` = `7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`, `origin/development` = `4a28bdacb6285bc6766e159d2221141933aaace0`.  
   - **Compose / local app:** N/A per task.  
   - **Evidence:** `gh` to `satisfecho/pos` Actions; `gh run view` JSON.

3. **What was tested (from “Testing instructions”)**  
   - (1) `git rev-parse origin/master origin/development` and `merge-base` ancestor check.  
   - (2) **Deploy to amvara9** — latest run on **`master`**, status of **24773000757** vs any newer run.  
   - (3) Optional after **green** — N/A (no green **master** deploy).  
   - (4) Manual server deploy — N/A (not run).

4. **Results**

   | Criterion | Result | Evidence line |
   |---|---|---|
   | 1. Git: `origin/master` / `origin/development` and lineage | **PASS** | `git rev-parse` (SHAs above); `git merge-base --is-ancestor origin/master origin/development` → exit **0**. |
   | 2. GitHub Actions: **green** for latest **`master`** **Deploy to amvara9** | **FAIL** | `gh run list --repo satisfecho/pos --workflow "Deploy to amvara9" --branch master --limit 8` — latest is still **24773000757** (2026-04-22T10:18:20Z) **failure**. `gh run view 24773000757 --json conclusion` → **`"failure"`**. No newer **success** on `master` after 24710137656 / 24773000757 in the listed set. |
   | 3. Optional after green | **N/A** | Not applicable until (2) passes. |
   | 4. Manual fallback | **N/A** | Not run. |
   | Sanity (HTTP) | **INFO** | `curl` → `https://satisfecho.de/api/health` **200**, `https://satisfecho.de/` **200**; does not prove a green **Deploy to amvara9** run. |

5. **Overall: FAIL**  
   Criterion **2** fails. Criterion **1** passes. **Next:** add/configure **Actions** secrets (`MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN` per `config/marketing-sites.json` / task summary), **re-run** failed jobs or push a new **`master`** trigger, then move this task to **UNTESTED-** for a meaningful re-check.

6. **Product owner feedback**  
   Branch ancestry is valid (`origin/master` is an ancestor of `origin/development`), but the only relevant **`master`** **Deploy to amvara9** run in scope remains the failed 22 Apr run **24773000757**. Production HTTP 200s are not a substitute for a **success** GitHub deploy workflow. Operators need a **green** run after secrets are fixed.

7. **URLs tested (numbered list)**  
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757` (`conclusion: failure`, `updatedAt` 2026-04-22T10:18:30Z)  
   2. `https://satisfecho.de/api/health` (200)  
   3. `https://satisfecho.de/` (200)

8. **Relevant log excerpts (last section)**  
   - `gh run view 24773000757 --repo satisfecho/pos --json conclusion,url,updatedAt,displayTitle` (2026-04-26T17:12Z): **`"conclusion":"failure"`**; `url` as in §7.1.  
   - Step-level: unchanged; full failed-step text still available via `gh run view 24773000757 --log-failed` (marketing token/placeholder; same as prior task reports).

**Loop protection (per `020-test.md`):** This task has been re-verified multiple times with the **same** latest **`master`** deploy run (**24773000757**, **failure**) and no new green pipeline. **Stop cycling** on identical CI state: further tester passes should only run after **PAT/secret** work and a **re-run** or new **`master`** **Deploy to amvara9**; rename back to **UNTESTED-** for the next run when the coder/operator says CI is ready.

## Testing instructions

(Required at end of task for **UNTESTED-**; same steps as the earlier “Testing instructions” block — use for the next verification after CI/secrets or workflow state changes.)

1. **Git:** Confirm **`origin/master`** and **`origin/development`** are at the expected points for the promotion under test (e.g. after a new merge, re-check tips):  
   `git fetch origin && git rev-parse origin/master origin/development`
2. **GitHub Actions:** Open **Actions** → **Deploy to amvara9** → run **`24773000757`** (or latest **`master`** deploy). After secrets are fixed, either **Re-run failed jobs** or trigger a new deploy from **`master`** and expect **green** through **Fetch marketing site artifacts**, **Set up SSH**, **Build and restart stack on amvara9**, **Smoke test**.
3. **Optional live check:** After a **green** deploy, verify **`https://satisfecho.de/`** (or documented prod URL) and API health per **`docs/0001-ci-cd-amvara9.md`** / smoke step output.
4. **Manual fallback:** If CI cannot be fixed immediately, an operator may run **`scripts/deploy-amvara9.sh`** from the server checkout per **`README.md`** / **`AGENTS.md`** (still needs marketing bundles resolved for full parity with CI).

## Test report (2026-04-26, 020-tester)

1. **Date/time (UTC) and log window**  
   - **Window:** 2026-04-26T17:49Z–17:50Z.  
   - **Commands:** `git` / `gh` / `curl` on host at `/Users/raro42/projects/pos2` after `./scripts/git-sync-development.sh` (not `docker logs` — not required by Testing instructions).

2. **Environment**  
   - **Branch (local):** `development` synced; **remotes (after `git fetch origin`):** `origin/master` = `7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`, `origin/development` = `a349eba01a2668702d8247ca13585af2ec358c2a`.  
   - **Compose / local app:** N/A per task.

3. **What was tested (from "Testing instructions")**  
   - (1) `git rev-parse origin/master origin/development` and `merge-base` ancestor check.  
   - (2) **Deploy to amvara9** — latest run on **`master`**; `gh run list` (limit 10) and `gh run view 24773000757 --json conclusion`.  
   - (3) Optional after **green** — N/A (no new green **master** deploy).  
   - (4) Manual server deploy — N/A (not run).

4. **Results**

   | Criterion | Result | Evidence line |
   |---|---|---|
   | 1. Git: `origin/master` / `origin/development` and lineage | **PASS** | SHAs above; `git merge-base --is-ancestor origin/master origin/development` → exit **0**. |
   | 2. GitHub Actions: **green** for latest **`master`** **Deploy to amvara9** | **FAIL** | `gh run list --repo satisfecho/pos --workflow "Deploy to amvara9" --branch master --limit 10` — most recent is still **24773000757** (2026-04-22T10:18:20Z) **failure**; `gh run view 24773000757 --json conclusion` → **`"failure"`**. No newer **success** on `master` supersedes 24773000757 in this list. |
   | 3. Optional after green | **N/A** | Not applicable until (2) passes. |
   | 4. Manual fallback | **N/A** | Not run. |
   | Sanity (HTTP) | **INFO** | `curl` — `https://satisfecho.de/api/health` **200**, `https://satisfecho.de/` **200**; does not prove a green **Deploy to amvara9** run. |

5. **Overall: FAIL**  
   - Criterion **2** fails (latest **`master`** deploy in scope still **24773000757** — **failure**; unchanged from prior verifications). Criterion **1** passes. **Loop protection:** same CI state as previous reports; further tester cycles should run only after secrets/re-run or a new **master** deploy. GitHub **issue #195** updated: comment with outcome; labels set to **`agent:wip`** (removed `agent:untested`).

6. **Product owner feedback**  
   `origin/development` has moved to **`a349eba0…`** while `origin/master` remains **`7a2c2bd…`**, with `master` still an ancestor of `development` (expected). The **Deploy to amvara9** workflow for **master** has not produced a new successful run; issue #195 is **not** satisfied for "green deployment action" until CI passes marketing fetch and downstream steps.

7. **URLs tested (numbered list)**  
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757` (run `conclusion: failure`)  
   2. `https://satisfecho.de/api/health` (200)  
   3. `https://satisfecho.de/` (200)

8. **Relevant log excerpts (last section)**  
   - `gh run view 24773000757 --json conclusion,url,updatedAt` (2026-04-26T17:50Z): **`"conclusion":"failure"`**, `updatedAt` **2026-04-22T10:18:30Z** — no change vs prior verifications.  
   - For step output: `gh run view 24773000757 --log-failed` (marketing token / placeholder slugs) as in earlier task text.

## Test report (2026-04-26, 020-tester)

1. **Date/time (UTC) and log window**  
   - **Window:** 2026-04-26T19:38Z–19:40Z.  
   - **Commands:** `git` / `gh` / `curl` on host at `/Users/raro42/projects/pos2` after `./scripts/git-sync-development.sh` (not `docker logs` — not required by Testing instructions).

2. **Environment**  
   - **Branch (local):** `development` synced. **Remotes (after `git fetch origin`):** `origin/master` = `7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`, `origin/development` = `9cd620d17c06850a34b7ce39b92c309ecb035eab`.  
   - **Compose / local app:** N/A per task.

3. **What was tested (from "Testing instructions")**  
   - (1) `git rev-parse origin/master origin/development` and `merge-base` ancestor check.  
   - (2) **Deploy to amvara9** — latest run on **`master`**, status of **24773000757** vs any newer run with **success** through marketing/SSH/smoke.  
   - (3) Optional after **green** — N/A (no green **master** deploy).  
   - (4) Manual server deploy — N/A (not run).

4. **Results**

   | Criterion | Result | Evidence line |
   |---|---|---|
   | 1. Git: `origin/master` / `origin/development` and lineage | **PASS** | `git rev-parse` (SHAs above). `git merge-base --is-ancestor origin/master origin/development` → exit **0** (promoted **master** tip is an ancestor of **development**). |
   | 2. GitHub Actions: **green** for latest **`master`** **Deploy to amvara9** | **FAIL** | `gh run list --repo satisfecho/pos --workflow "Deploy to amvara9" --branch master --limit 10` — most recent is still **24773000757** (2026-04-22T10:18:20Z) **conclusion: failure**; `gh run view 24773000757 --json conclusion,updatedAt` → **`"conclusion":"failure"`**, `updatedAt` **2026-04-22T10:18:30Z**; no newer **success** on `master` supersedes 24773000757 in the listed range. |
   | 3. Optional after green | **N/A** | Not applicable until (2) passes. |
   | 4. Manual fallback | **N/A** | Not run. |
   | Sanity (HTTP) | **INFO** | `curl` — `https://satisfecho.de/api/health` **200**, `https://satisfecho.de/` **200**; does not prove a green **Deploy to amvara9** run. |

5. **Overall: FAIL**  
   Criterion **2** fails: latest **`master`** **Deploy to amvara9** in scope is still run **24773000757** (**failure**; unchanged from prior **TESTING-**/WIP/UNTESTED verifications). Criterion **1** passes. **Loop protection (per `020-test.md` / prior task text):** do not re-run identical `gh` checks until **Actions** secrets (e.g. **`MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN`**) and/or a **re-run** or new **`master`** deploy change CI state. Rename this task to **WIP-**; return to **UNTESTED-** when operators confirm a new green pipeline is ready to verify.

6. **Product owner feedback**  
   `origin/development` has moved to **`9cd620d…`** while `origin/master` remains **`7a2c2bd…`**, with correct ancestry for a post-promotion state. The **Deploy to amvara9** run that GitHub still lists as the latest for **`master`** is **not** success—issue #195 is **not** satisfied for “deployment action succeeded on GitHub” until a **success** run completes. Live site HTTP 200 does not replace a green workflow.

7. **URLs tested (numbered list)**  
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757` (run `conclusion: failure`)  
   2. `https://satisfecho.de/api/health` (200)  
   3. `https://satisfecho.de/` (200)

8. **Relevant log excerpts (last section)**  
   - `gh run view 24773000757 --repo satisfecho/pos --json conclusion,url,updatedAt` (2026-04-26T19:40Z): **`"conclusion":"failure"`**; `updatedAt` **2026-04-22T10:18:30Z**; `url` **https://github.com/satisfecho/pos/actions/runs/24773000757** — no change.  
   - For step text: `gh run view 24773000757 --log-failed` (marketing token / placeholder slugs) as in the implementation summary; not re-fetched in full.

## Testing instructions

1. **Git:** Confirm **`origin/master`** and **`origin/development`** are at the expected points for the promotion under test (e.g. after a new merge, re-check tips):  
   `git fetch origin && git rev-parse origin/master origin/development`
2. **GitHub Actions:** Open **Actions** → **Deploy to amvara9** → run **`24773000757`** (or latest **`master`** deploy). After secrets are fixed, either **Re-run failed jobs** or trigger a new deploy from **`master`** and expect **green** through **Fetch marketing site artifacts**, **Set up SSH**, **Build and restart stack on amvara9**, **Smoke test**.
3. **Optional live check:** After a **green** deploy, verify **`https://satisfecho.de/`** (or documented prod URL) and API health per **`docs/0001-ci-cd-amvara9.md`** / smoke step output.
4. **Manual fallback:** If CI cannot be fixed immediately, an operator may run **`scripts/deploy-amvara9.sh`** from the server checkout per **`README.md`** / **`AGENTS.md`** (still needs marketing bundles resolved for full parity with CI).

## Test report (2026-04-26, 020-tester)

1. **Date/time (UTC) and log window**  
   - **Window:** 2026-04-26T19:54Z–19:55Z.  
   - **Commands:** `git` / `gh` / `curl` on host at `/Users/raro42/projects/pos2` after `./scripts/git-sync-development.sh` (not `docker logs` — not required by Testing instructions for this task).

2. **Environment**  
   - **Branch (local):** `development` synced. **Remotes (after `git fetch origin`):** `origin/master` = `7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`, `origin/development` = `96d31774bf0960a0a280195dad394308bd824def`.  
   - **Compose / local app:** N/A per task.

3. **What was tested (from "Testing instructions")**  
   - (1) `git rev-parse origin/master origin/development` and `merge-base` ancestor check.  
   - (2) **Deploy to amvara9** — latest run on **`master`**, `gh run list` (limit 10) and `gh run view 24773000757 --json conclusion`.  
   - (3) Optional after **green** — N/A (no new green **master** deploy).  
   - (4) Manual server deploy — N/A (not run).

4. **Results**

   | Criterion | Result | Evidence line |
   |---|---|---|
   | 1. Git: `origin/master` / `origin/development` and lineage | **PASS** | `git rev-parse` (SHAs above); `git merge-base --is-ancestor origin/master origin/development` → exit **0**; `origin/development` = **`96d3177…`**. |
   | 2. GitHub Actions: **green** for latest **`master`** **Deploy to amvara9** | **FAIL** | `gh run list` — most recent is still **24773000757** (2026-04-22T10:18:20Z) **conclusion: failure**; `gh run view 24773000757 --json conclusion,updatedAt,url` → **`"conclusion":"failure"`**, `updatedAt` **2026-04-22T10:18:30Z**; no newer **success** on `master` in the list. |
   | 3. Optional after green | **N/A** | Not applicable until (2) passes. |
   | 4. Manual fallback | **N/A** | Not run. |
   | Sanity (HTTP) | **INFO** | `curl` — `https://satisfecho.de/api/health` **200**, `https://satisfecho.de/` **200**; does not prove a green **Deploy to amvara9** run. |

5. **Overall: FAIL**  
   Criterion **2** fails. Criterion **1** passes. **Loop protection:** run **24773000757** is unchanged in GitHub (`conclusion: failure`, same `updatedAt`); further testing should wait for **Actions** secrets and a **re-run** or new **`master`**-triggered deploy, then return task to **UNTESTED-**. Final rename: **WIP-** (fail).

6. **Product owner feedback**  
   `origin/development` is at **`96d3177…`** with **`origin/master`** as an ancestor—normal after promotion. The **Deploy to amvara9** workflow for **master** has not had a new **success** run; **issue #195** is not satisfied for a **successful** deployment on GitHub until a green run exists. HTTP **200** on production is sanity only.

7. **URLs tested (numbered list)**  
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757` (run `conclusion: failure`)  
   2. `https://satisfecho.de/api/health` (200)  
   3. `https://satisfecho.de/` (200)

8. **Relevant log excerpts (last section)**  
   - `gh run view 24773000757 --repo satisfecho/pos --json conclusion,url,updatedAt` (2026-04-26T19:54Z): **`"conclusion":"failure"`** — no change.  
   - For step text: `gh run view 24773000757 --log-failed` (marketing token / placeholder slugs) as in the implementation summary.

## Testing instructions

1. **Git:** Confirm **`origin/master`** and **`origin/development`** are at the expected points for the promotion under test (e.g. after a new merge, re-check tips):  
   `git fetch origin && git rev-parse origin/master origin/development`
2. **GitHub Actions:** Open **Actions** → **Deploy to amvara9** → run **`24773000757`** (or latest **`master`** deploy). After secrets are fixed, either **Re-run failed jobs** or trigger a new deploy from **`master`** and expect **green** through **Fetch marketing site artifacts**, **Set up SSH**, **Build and restart stack on amvara9**, **Smoke test**.
3. **Optional live check:** After a **green** deploy, verify **`https://satisfecho.de/`** (or documented prod URL) and API health per **`docs/0001-ci-cd-amvara9.md`** / smoke step output.
4. **Manual fallback:** If CI cannot be fixed immediately, an operator may run **`scripts/deploy-amvara9.sh`** from the server checkout per **`README.md`** / **`AGENTS.md`** (still needs marketing bundles resolved for full parity with CI).

## Test report (2026-04-26, 020-tester — session)

1. **Date/time (UTC) and log window**  
   - **Window:** 2026-04-26T20:14Z–20:16Z.  
   - **Commands:** `git` / `gh` / `curl` on host at `/Users/raro42/projects/pos2` after `./scripts/git-sync-development.sh` (not `docker logs` — not required by Testing instructions).

2. **Environment**  
   - **Branch (local):** `development` synced. **Remotes (after `git fetch origin`):** `origin/master` = `7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`, `origin/development` = `8c42c5acbc14ff3deb63d441c70172a9c12a44a3`.  
   - **Compose / local app:** N/A per task.

3. **What was tested (from "Testing instructions")**  
   - (1) `git rev-parse` and `merge-base` ancestor check.  
   - (2) **Deploy to amvara9** — `gh run list` (master, limit 10) and `gh run view 24773000757`.  
   - (3) Optional after **green** — N/A.  
   - (4) Manual server deploy — N/A.

4. **Results**

| Criterion | Result | Evidence |
|---|---|---|
| 1. Git: lineage | **PASS** | `merge-base --is-ancestor origin/master origin/development` → exit 0. |
| 2. Actions: **Deploy to amvara9** on **master** | **FAIL** | Latest is still run **24773000757** — `conclusion: failure`, `updatedAt` 2026-04-22T10:18:30Z; no newer success. |
| 3. Optional after green | **N/A** | |
| 4. Manual fallback | **N/A** | |
| HTTP sanity | **INFO** | `satisfecho.de` health and / → 200. |

5. **Overall: FAIL** (criterion 2; loop protection: CI state unchanged for run 24773000757). **Rename:** TESTING- → **WIP-**.

6. **Product owner feedback** — `origin/master` is an ancestor of `origin/development`; the **master** **Deploy to amvara9** run in scope is still not green on GitHub. Configure PAT/secrets, re-run deploy, then return to **UNTESTED-**.

7. **URLs** — 1) https://github.com/satisfecho/pos/actions/runs/24773000757 2) https://satisfecho.de/api/health 3) https://satisfecho.de/

8. **Logs** — `gh run view 24773000757 --json conclusion` → `failure` (2026-04-26T20:15Z check); step-level: prior `--log-failed` excerpts in this file.

## Test report (2026-04-26T22:50Z–22:55Z UTC, 020-tester)

1. **Date/time (UTC) and log window**  
   - **Window:** 2026-04-26T22:50Z–22:55Z.  
   - **Commands:** `git` / `gh` / `curl` on host at `/Users/raro42/projects/pos2` after `./scripts/git-sync-development.sh` (not `docker logs` — not required by Testing instructions).

2. **Environment**  
   - **Branch (local):** `development` synced. **Remotes (after `git fetch origin`):** `origin/master` = `7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`, `origin/development` = `2fed5b76537556076f9faa95acd326101b6c03cd`.  
   - **Compose / local app:** N/A per task.

3. **What was tested (from "Testing instructions")**  
   - (1) `git rev-parse origin/master origin/development` and `merge-base --is-ancestor` check.  
   - (2) **Deploy to amvara9** — `gh run list` (`--branch master --limit 8`) and `gh run view 24773000757 --json conclusion,updatedAt,url`.  
   - (3) Optional after **green** — N/A (no green **master** deploy).  
   - (4) Manual server deploy — N/A (not run).

4. **Results**

   | Criterion | Result | Evidence line |
   |---|---|---|
   | 1. Git: `origin/master` / `origin/development` and lineage | **PASS** | SHAs above; `git merge-base --is-ancestor origin/master origin/development` → exit **0** (`origin/master` is an ancestor of `origin/development`). |
   | 2. GitHub Actions: **green** for latest **`master`** **Deploy to amvara9** | **FAIL** | `gh run list --repo satisfecho/pos --workflow "Deploy to amvara9" --branch master --limit 8` — most recent is still **24773000757** (2026-04-22T10:18:20Z) **failure**. `gh run view 24773000757 --json conclusion,url,updatedAt,status,displayTitle` (2026-04-26T22:51Z) → **`"conclusion":"failure"`**, `updatedAt` **2026-04-22T10:18:30Z** (unchanged; no re-run with new conclusion). No newer **success** on `master` supersedes 24773000757 in the listed range. |
   | 3. Optional after **green** | **N/A** | Not applicable until (2) passes. |
   | 4. Manual fallback | **N/A** | Not run. |
   | Sanity (HTTP) | **INFO** | `curl` — `https://satisfecho.de/api/health` **200**, `https://satisfecho.de/` **200**; does not prove a green **Deploy to amvara9** run. |

5. **Overall: FAIL**  
   Criterion **2** fails. Criterion **1** passes. **Loop protection (`020-test.md`):** the latest **`master`** **Deploy to amvara9** run is still **24773000757** with **`conclusion: failure`** and the same `updatedAt` as prior verifications; further identical `gh` polling will not change outcome until **Actions** secrets (e.g. `MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN` per `config/marketing-sites.json`) are fixed and the workflow is **re-run** or a new **`master`** push triggers a fresh deploy. Return task to **UNTESTED-** when a green pipeline is expected.

6. **Product owner feedback**  
   Branch state is consistent with an older promoted **`master`** tip and newer **`development`** work (`2fed5b76…` ahead of `7a2c2bd…` with `master` in the ancestry). The GitHub **Deploy to amvara9** workflow for **master** has still not completed successfully since the 22 Apr failed run: issue **#195**’s bar for a **successful** deployment on GitHub is not met. Production **HTTP 200** responses are not a substitute for a **success** workflow.

7. **URLs tested (numbered list)**  
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757` (`conclusion: failure`, run metadata JSON 2026-04-26T22:51Z)  
   2. `https://satisfecho.de/api/health` (200)  
   3. `https://satisfecho.de/` (200)

8. **Relevant log excerpts (last section)**  
   - `gh run view 24773000757 --repo satisfecho/pos --json conclusion,url,updatedAt` (2026-04-26T22:51Z): **`"conclusion":"failure"`**; `updatedAt` **2026-04-22T10:18:30Z** — no new successful completion.  
   - Step-level: unchanged from prior task reports; use `gh run view 24773000757 --log-failed` for **Fetch marketing site artifacts** if full CI text is needed.

## Testing instructions

1. **Git:** Confirm **`origin/master`** and **`origin/development`** are at the expected points for the promotion under test (e.g. after a new merge, re-check tips): `git fetch origin && git rev-parse origin/master origin/development`
2. **GitHub Actions:** Open **Actions** → **Deploy to amvara9** — latest **`master`** run (e.g. **`24773000757`**, or a newer one after a re-run). After **Actions** secrets (`MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN` per `config/marketing-sites.json`) are fixed, **Re-run failed jobs** or trigger a new deploy from **`master`**; expect **green** through **Fetch marketing site artifacts**, **Set up SSH**, **Build and restart stack on amvara9**, **Smoke test**.
3. **Optional live check:** After a **green** deploy, verify **`https://satisfecho.de/`** and API health per **`docs/0001-ci-cd-amvara9.md`** / smoke step output.
4. **Manual fallback:** If CI cannot be fixed immediately, an operator may run **`scripts/deploy-amvara9.sh`** from the server checkout per **`README.md`** / **`AGENTS.md`** (marketing bundles may still be required for full parity with CI).

## Test report (2026-04-26T23:30Z–23:33Z UTC, 020-tester)

1. **Date/time (UTC) and log window**  
   - **Window:** 2026-04-26T23:30Z–23:33Z.  
   - **Commands:** `git` / `gh` / `curl` on host at repo root after `./scripts/git-sync-development.sh` (not `docker logs` — not required by Testing instructions for this task).

2. **Environment**  
   - **Branch (local):** `development` synced. **Remotes (after `git fetch origin`):** `origin/master` = `7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`, `origin/development` = `0b9b232b465ab3e696ee6d0db14a01c6a626a465`.  
   - **Compose / local app:** N/A.  
   - **Evidence:** `gh` to `satisfecho/pos` Actions; `gh run list` / `gh run view` JSON.

3. **What was tested (from “Testing instructions”)**  
   - (1) `git rev-parse origin/master origin/development` and `merge-base --is-ancestor origin/master origin/development`.  
   - (2) **Deploy to amvara9** — latest run on **`master`**, status of **24773000757** vs any newer run with **success**.  
   - (3) Optional after **green** — N/A (no new green **master** deploy).  
   - (4) Manual server deploy — N/A (not run).

4. **Results**

   | Criterion | Result | Evidence line |
   |---|---|---|
   | 1. Git: `origin/master` / `origin/development` and lineage | **PASS** | SHAs above; `git merge-base --is-ancestor origin/master origin/development` → exit **0** (promoted **master** tip is an ancestor of **development**; **development** has advanced to **`0b9b232b…`**). |
   | 2. GitHub Actions: **green** for latest **`master`** **Deploy to amvara9** | **FAIL** | `gh run list --repo satisfecho/pos --workflow "Deploy to amvara9" --branch master --limit 8` — most recent is still **24773000757** (2026-04-22T10:18:20Z) **conclusion: failure**; `gh run view 24773000757 --json conclusion,updatedAt,url` → **`"conclusion":"failure"`**, `updatedAt` **2026-04-22T10:18:30Z** (unchanged; no re-run with new success). No newer **success** on `master` supersedes **24773000757** in the listed runs. |
   | 3. Optional after **green** | **N/A** | Not applicable until (2) passes. |
   | 4. Manual fallback | **N/A** | Not run. |
   | Sanity (HTTP) | **INFO** | `curl` — `https://satisfecho.de/api/health` **200**, `https://satisfecho.de/` **200**; does not prove a green **Deploy to amvara9** run. |

5. **Overall: FAIL**  
   Criterion **2** fails. Criterion **1** passes. **Loop protection (`020-test.md`):** CI state for the latest **`master`** deploy in scope is unchanged (same run **ID**, same **`conclusion`**, same **`updatedAt`**); do not re-run identical checks until **Actions** secrets and/or a **re-run** or new **`master`**-triggered deploy change GitHub. Rename: **TESTING-** → **WIP-**; return to **UNTESTED-** when a green **Deploy to amvara9** is expected.

6. **Product owner feedback**  
   **`origin/development`** is at **`0b9b232b…`** with **`origin/master`** still **`7a2c2bd…`** and valid ancestry—normal after a promotion. The only relevant **`master`** **Deploy to amvara9** result in the Actions list is still a **failure** from 22 Apr; **issue #195** is not satisfied for “confirm deployment action succeeded on GitHub” until a **success** run exists. **HTTP 200** on **satisfecho.de** is sanity only.

7. **URLs tested (numbered list)**  
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757` (`conclusion: failure`, JSON 2026-04-26T23:32Z)  
   2. `https://satisfecho.de/api/health` (200)  
   3. `https://satisfecho.de/` (200)

8. **Relevant log excerpts (last section)**  
   - `gh run view 24773000757 --repo satisfecho/pos --json conclusion,url,updatedAt` (2026-04-26T23:32Z): **`"conclusion":"failure"`**; `updatedAt` **2026-04-22T10:18:30Z** — no change vs prior **TESTING**/WIP/UNTESTED verifications.  
   - For step text: `gh run view 24773000757 --log-failed` (marketing token / placeholder slugs) as in the implementation summary and earlier task sections.

## Testing instructions

1. **Git:** Confirm **`origin/master`** and **`origin/development`** are at the expected points for the promotion under test: `git fetch origin && git rev-parse origin/master origin/development`  
2. **GitHub Actions:** Latest **`master`** **Deploy to amvara9** (e.g. **24773000757** or newer). After **Actions** secrets (`MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN` per `config/marketing-sites.json`) are set, **Re-run failed jobs** or trigger a new deploy from **`master`**; expect **green** through **Fetch marketing site artifacts**, **Set up SSH**, **Build and restart stack on amvara9**, **Smoke test**.  
3. **Optional live check:** After a **green** deploy, verify **`https://satisfecho.de/`** and API health per **`docs/0001-ci-cd-amvara9.md`**.  
4. **Manual fallback:** **`scripts/deploy-amvara9.sh`** on server (see **`README.md`**) if CI cannot be fixed immediately (marketing parity may still apply).

## Test report (2026-04-26T23:52Z–23:56Z UTC, 020-tester)

1. **Date/time (UTC) and log window**  
   - **Window:** 2026-04-26T23:52Z–23:56Z.  
   - **Commands:** `git` / `gh` / `curl` on host at `/Users/raro42/projects/pos2` after `./scripts/git-sync-development.sh` (not `docker logs` — not required by Testing instructions).

2. **Environment**  
   - **Branch (local):** `development` synced. **Remotes (after `git fetch origin`):** `origin/master` = `7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`, `origin/development` = `fa11521c7362f91cc93300ccd1dec6b9c7ec7c2f`.  
   - **Compose / local app:** N/A per task.  
   - **Evidence:** `gh` to `satisfecho/pos` Actions.

3. **What was tested (from “Testing instructions”)**  
   - (1) `git rev-parse origin/master origin/development` and `git merge-base --is-ancestor origin/master origin/development`.  
   - (2) **Deploy to amvara9** — `gh run list --repo satisfecho/pos --workflow "Deploy to amvara9" --branch master --limit 12` and `gh run view 24773000757 --json conclusion,url,updatedAt`.  
   - (3) Optional after **green** — N/A (no green **master** deploy).  
   - (4) Manual server deploy — N/A (not run).

4. **Results**

   | Criterion | Result | Evidence line |
   |---|---|---|
   | 1. Git: `origin/master` / `origin/development` and lineage | **PASS** | SHAs above; `git merge-base --is-ancestor origin/master origin/development` → exit **0** (promoted **master** tip is an ancestor of **development**). |
   | 2. GitHub Actions: **green** for latest **`master`** **Deploy to amvara9** | **FAIL** | `gh run list` — most recent on **`master`** is still **24773000757** (2026-04-22T10:18:20Z, **conclusion: failure**). `gh run view 24773000757 --json conclusion,updatedAt,url` (2026-04-26T23:52Z) → **`"conclusion":"failure"`**, `updatedAt` **2026-04-22T10:18:30Z**, `url` **https://github.com/satisfecho/pos/actions/runs/24773000757**. No newer **success** on **`master`** supersedes **24773000757** in the listed runs (older successes exist but are not “latest”). |
   | 3. Optional after **green** | **N/A** | Not applicable until (2) passes. |
   | 4. Manual fallback | **N/A** | Not run. |
   | Sanity (HTTP) | **INFO** | `curl` — `https://satisfecho.de/api/health` **200**, `https://satisfecho.de/` **200**; does not prove a green **Deploy to amvara9** run. |

5. **Overall: FAIL**  
   Criterion **2** fails (latest **`master`** **Deploy to amvara9** still **24773000757** — **failure**; marketing/PAT issue unchanged in GitHub metadata). Criterion **1** passes. **Loop protection (`020-test.md`):** same run **ID** and **`conclusion`** as all prior verifications — further identical polling is low value until **Actions** secrets are configured and the workflow is **re-run** or a new **`master`** push triggers a fresh deploy. Rename: **TESTING-** → **WIP-**; return task to **UNTESTED-** when a green pipeline is expected.

6. **Product owner feedback**  
   **`origin/development`** has advanced to **`fa11521c…`** while **`origin/master`** remains **`7a2c2bd…`** with valid ancestry — consistent with post-promotion work on **development**. **Issue #195** is still **not** satisfied for “deployment action succeeded on GitHub”: the latest **`master`**-line deploy in Actions remains the failed **22 Apr** run. Live **HTTP 200** on **satisfecho.de** does not replace a **success** workflow.

7. **URLs tested (numbered list)**  
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757` (run `conclusion: failure`, JSON 2026-04-26T23:52Z)  
   2. `https://satisfecho.de/api/health` (200)  
   3. `https://satisfecho.de/` (200)

8. **Relevant log excerpts (last section)**  
   - `gh run view 24773000757 --repo satisfecho/pos --json conclusion,url,updatedAt,displayTitle` (2026-04-26T23:52Z): **`"conclusion":"failure"`**; `updatedAt` **2026-04-22T10:18:30Z** — unchanged.  
   - Step-level failure text: unchanged from implementation summary (`--log-failed`: empty **`MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN`**, placeholder slugs per prior sections).

## Test report (2026-04-27, 020-tester)

1. **Date/time (UTC) and log window**  
   - **Window:** 2026-04-27T00:00Z–2026-04-27T00:08Z (approx.).  
   - **Commands:** `git` / `gh` / `curl` on host at repo root after `./scripts/git-sync-development.sh` (not `docker logs` — not required by Testing instructions for this task).

2. **Environment**  
   - **Branch (local):** `development` synced. **Remotes (after `git fetch origin`):** `origin/master` = `7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`, `origin/development` = `d0841faaa02aaf39d7bf65dd68a1120d49cc5515`.  
   - **Compose / local app:** N/A per task.  
   - **GitHub issue #195:** comment posted; labels **`agent:untested` → `agent:wip`** (test **FAIL**; **`agent:testing`** not on issue at start — was **`agent:untested` only).

3. **What was tested (from “Testing instructions”)**  
   - (1) `git rev-parse origin/master origin/development` and `git merge-base --is-ancestor origin/master origin/development`.  
   - (2) **Deploy to amvara9** — `gh run list --repo satisfecho/pos --workflow "Deploy to amvara9" --branch master --limit 12` and `gh run view 24773000757 --json conclusion,url,updatedAt`.  
   - (3) Optional after **green** — N/A (no green **master** deploy).  
   - (4) Manual server deploy — N/A (not run).

4. **Results**

   | Criterion | Result | Evidence line |
   |---|---|---|
   | 1. Git: `origin/master` / `origin/development` and lineage | **PASS** | SHAs above; `git merge-base --is-ancestor origin/master origin/development` → exit **0** (promoted **master** tip is an ancestor of **development**; **development** = **`d0841faa…`**). |
   | 2. GitHub Actions: **green** for latest **`master`** **Deploy to amvara9** | **FAIL** | `gh run list` — most recent on **`master`** is still **24773000757** (2026-04-22T10:18:20Z) **conclusion: failure**; `gh run view 24773000757 --json conclusion,updatedAt,url` (2026-04-27) → **`"conclusion":"failure"`**, `updatedAt` **2026-04-22T10:18:30Z** (no new re-run; no newer **success** supersedes 24773000757 as **latest** on `master`). |
   | 3. Optional after **green** | **N/A** | Not applicable until (2) passes. |
   | 4. Manual fallback | **N/A** | Not run. |
   | Sanity (HTTP) | **INFO** | `curl` — `https://satisfecho.de/api/health` **200**, `https://satisfecho.de/` **200**; does not prove a green **Deploy to amvara9** run. |

5. **Overall: FAIL**  
   Criterion **2** fails. Criterion **1** passes. **Loop protection (`020-test.md`):** latest **`master`** **Deploy to amvara9** is still run **24773000757** with unchanged **`conclusion: failure`** and the same `updatedAt` as prior re-checks; do not re-verify again until **Actions** secrets and a **re-run** or new **`master`**-triggered deploy change GitHub. **Rename:** `TESTING-` → **`WIP-`**. Return to **`UNTESTED-`** when a green **Deploy to amvara9** is expected.

6. **Product owner feedback**  
   **`origin/development`** is ahead of **`origin/master`** with valid ancestry. **Issue #195** still requires a **successful** **Deploy to amvara9** on GitHub for the **`master`** line; the latest such run is still the failed 22 Apr workflow. Configure **`MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN`**, re-run, then re-queue verification.

7. **URLs tested (numbered list)**  
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757` (run `conclusion: failure`, JSON 2026-04-27)  
   2. `https://satisfecho.de/api/health` (200)  
   3. `https://satisfecho.de/` (200)

8. **Relevant log excerpts (last section)**  
   - `gh run view 24773000757 --repo satisfecho/pos --json conclusion,url,updatedAt` (2026-04-27): **`"conclusion":"failure"`**; `updatedAt` **2026-04-22T10:18:30Z** — unchanged.  
   - Step text: `gh run view 24773000757 --log-failed` (marketing token / placeholder slugs) as in the implementation summary and prior sections of this file.

## Test report (2026-04-27, 020-tester)

1. **Date/time (UTC) and log window**  
   - **Window:** 2026-04-27T01:10Z–2026-04-27T01:13Z.  
   - **Commands:** `git` / `gh` / `curl` on host at repo root after `./scripts/git-sync-development.sh` (not `docker logs` — not in Testing instructions for this task).

2. **Environment**  
   - **Branch (local):** `development` synced. **Remotes (after `git fetch origin`):** `origin/master` = `7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`, `origin/development` = `ebb35d39d59cd501b3c71cd7e837cf7102877ae7`.  
   - **Compose / local app:** N/A per task.

3. **What was tested (from “Testing instructions”)**  
   - (1) `git rev-parse origin/master origin/development` and `git merge-base --is-ancestor origin/master origin/development`.  
   - (2) **Deploy to amvara9** — `gh run list --repo satisfecho/pos --workflow "Deploy to amvara9" --branch master --limit 8` and `gh run view 24773000757 --json conclusion,url,updatedAt,status,displayTitle`.  
   - (3) Optional after **green** — N/A (no new green **master** deploy).  
   - (4) Manual server deploy — N/A (not run).

4. **Results**

   | Criterion | Result | Evidence line |
   |---|---|---|
   | 1. Git: `origin/master` / `origin/development` and lineage | **PASS** | SHAs above; `git merge-base --is-ancestor origin/master origin/development` → exit **0**; **`origin/development`** = **`ebb35d39…`**. |
   | 2. GitHub Actions: **green** for latest **`master`** **Deploy to amvara9** | **FAIL** | `gh run list` — most recent on **`master`** is still **24773000757** (2026-04-22T10:18:20Z) **conclusion: failure**; `gh run view` JSON (2026-04-27T01:12Z) → **`"conclusion":"failure"`**, `updatedAt` **2026-04-22T10:18:30Z** (unchanged; no re-run with success). No newer **success** on **`master`** supersedes **24773000757** as the latest run. |
   | 3. Optional after **green** | **N/A** | Not applicable until (2) passes. |
   | 4. Manual fallback | **N/A** | Not run. |
   | Sanity (HTTP) | **INFO** | `curl` — `https://satisfecho.de/api/health` **200**, `https://satisfecho.de/` **200**; does not prove a green **Deploy to amvara9** run. |

5. **Overall: FAIL**  
   Criterion **2** fails. Criterion **1** passes. **Loop protection (`020-test.md`):** GitHub metadata for run **24773000757** is unchanged (`conclusion: failure`, same `updatedAt`); further identical `gh` polling is low value until **Actions** secrets and a **re-run** or new **`master` push change CI. **Task rename:** `TESTING-` → **`WIP-`**. **Next:** return task to **`UNTESTED-`** when a green **Deploy to amvara9** is expected (after `MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN` per `config/marketing-sites.json` and workflow re-run).

6. **Product owner feedback**  
   **`origin/master`** remains the promoted tip **`7a2c2bd…`**; **`origin/development`** is at **`ebb35d39…`** with `master` in the ancestry. **Issue #195** is still not satisfied for “review the success status of the deployment action on GitHub” — the latest **`master`**-line deploy is the same failed 22 Apr run. Live **200** on **satisfecho.de** is only a health sanity check, not a substitute for a **success** workflow.

7. **URLs tested (numbered list)**  
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757` (run `conclusion: failure`, JSON 2026-04-27T01:12Z)  
   2. `https://satisfecho.de/api/health` (200)  
   3. `https://satisfecho.de/` (200)

8. **Relevant log excerpts (last section)**  
   - `gh run view 24773000757 --repo satisfecho/pos --json conclusion,url,updatedAt,status` (2026-04-27T01:12Z): **`"conclusion":"failure"`**, `status: completed`, `updatedAt: 2026-04-22T10:18:30Z` — no change from prior re-verifications.  
   - Step text: `gh run view 24773000757 --log-failed` (marketing token / placeholder slugs) as in the implementation summary.

## Test report (2026-04-27T02:10Z–2026-04-27T02:14Z UTC, 020-tester)

1. **Date/time (UTC) and log window**  
   - **Window:** 2026-04-27T02:10Z–2026-04-27T02:14Z.  
   - **Commands:** `git` / `gh` / `curl` on host at `/Users/raro42/projects/pos2` after `./scripts/git-sync-development.sh` (not `docker logs` — not required by Testing instructions).

2. **Environment**  
   - **Branch (local):** `development` synced with `origin/development`.  
   - **Remotes (after `git fetch origin`):** `origin/master` = `7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`, `origin/development` = `356559b1fefefa4e9c0df2770a8dcf36f73b8a17`.  
   - **Compose / local app:** N/A per task.

3. **What was tested (from "Testing instructions")**  
   - (1) `git rev-parse origin/master origin/development` and `git merge-base --is-ancestor origin/master origin/development`.  
   - (2) **Deploy to amvara9** — `gh run list --repo satisfecho/pos --workflow "Deploy to amvara9" --branch master --limit 12` and `gh run view 24773000757 --json conclusion,url,updatedAt`.  
   - (3) Optional after **green** — N/A (no new green **master** deploy).  
   - (4) Manual server deploy — N/A (not run).

4. **Results**

   | Criterion | Result | Evidence line |
   |---|---|---|
   | 1. Git: `origin/master` / `origin/development` and lineage | **PASS** | SHAs above; `git merge-base --is-ancestor origin/master origin/development` → exit **0**; **`origin/development`** = **`356559b1…`**. |
   | 2. GitHub Actions: **green** for latest **`master`** **Deploy to amvara9** | **FAIL** | `gh run list` — most recent on **`master`** is still **24773000757** (2026-04-22T10:18:20Z) **conclusion: failure**; `gh run view 24773000757` JSON (2026-04-27T02:13Z) → **`"conclusion":"failure"`**, `updatedAt` **2026-04-22T10:18:30Z**; no newer **success** on **`master`** supersedes **24773000757** in the listed runs. |
   | 3. Optional after **green** | **N/A** | Not applicable until (2) passes. |
   | 4. Manual fallback | **N/A** | Not run. |
   | Sanity (HTTP) | **INFO** | `curl` — `https://satisfecho.de/api/health` **200**, `https://satisfecho.de/` **200**; does not prove a green **Deploy to amvara9** run. |

5. **Overall: FAIL**  
   Criterion **2** fails. Criterion **1** passes. **Loop protection (`020-test.md`):** run **24773000757** is unchanged in GitHub (`conclusion: failure`, same `updatedAt` as prior re-verifications); do not re-run identical checks until **Actions** secrets and/or a **re-run** or new **`master` push change CI. **Task rename:** `TESTING-` → **`WIP-`**. Return to **`UNTESTED-`** when a green **Deploy to amvara9** is expected (after `MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN` per `config/marketing-sites.json` and workflow re-run per implementation summary).

6. **Product owner feedback**  
   **`origin/master`** remains **`7a2c2bd…`**; **`origin/development`** is at **`356559b1…`** with `master` in the ancestry. **Issue #195** is still not satisfied for a **successful** **Deploy to amvara9** on GitHub for the **`master`** line — the latest such run is still the failed 22 Apr workflow. **HTTP 200** on **satisfecho.de** is sanity only, not a substitute for a **success** workflow.

7. **URLs tested (numbered list)**  
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757` (run `conclusion: failure`, JSON 2026-04-27T02:13Z)  
   2. `https://satisfecho.de/api/health` (200)  
   3. `https://satisfecho.de/` (200)

8. **Relevant log excerpts (last section)**  
   - `gh run view 24773000757 --repo satisfecho/pos --json conclusion,url,updatedAt` (2026-04-27T02:13Z): **`"conclusion":"failure"`**; `updatedAt` **2026-04-22T10:18:30Z** — no change.  
   - For step text: `gh run view 24773000757 --log-failed` (marketing token / placeholder slugs) as in the implementation summary and earlier reports.

## Test report (2026-04-27T02:24Z–2026-04-27T02:27Z UTC, 020-tester)

1. **Date/time (UTC) and log window**  
   - **Window:** 2026-04-27T02:24Z–2026-04-27T02:27Z.  
   - **Commands:** `git` / `gh` / `curl` on host at `/Users/raro42/projects/pos2` after `./scripts/git-sync-development.sh` (not `docker logs` — not required by Testing instructions).

2. **Environment**  
   - **Branch (local):** `development` synced. **Remotes (after `git fetch origin`):** `origin/master` = `7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`, `origin/development` = `a560ee8a05e61ee6197f7c41cd055f59c3c392a9`.  
   - **Compose / local app:** N/A per task.

3. **What was tested (from "Testing instructions")**  
   - (1) `git rev-parse origin/master origin/development` and `git merge-base --is-ancestor origin/master origin/development`.  
   - (2) **Deploy to amvara9** — `gh run list --repo satisfecho/pos --workflow "Deploy to amvara9" --branch master --limit 10` and `gh run view 24773000757 --json conclusion,url,updatedAt,status,displayTitle`.  
   - (3) Optional after **green** — N/A (no new green **master** deploy).  
   - (4) Manual server deploy — N/A (not run).

4. **Results**

   | Criterion | Result | Evidence line |
   |---|---|---|
   | 1. Git: `origin/master` / `origin/development` and lineage | **PASS** | SHAs above; `git merge-base --is-ancestor origin/master origin/development` → exit **0**; **`origin/development`** = **`a560ee8a…`**. |
   | 2. GitHub Actions: **green** for latest **`master`** **Deploy to amvara9** | **FAIL** | `gh run list` — most recent on **`master`** is still **24773000757** (2026-04-22T10:18:20Z) **conclusion: failure**; `gh run view` JSON (2026-04-27T02:26Z) → **`"conclusion":"failure"`**, `updatedAt` **2026-04-22T10:18:30Z** (unchanged; no re-run with success). No newer **success** on **`master`** supersedes **24773000757** as the latest run. |
   | 3. Optional after **green** | **N/A** | Not applicable until (2) passes. |
   | 4. Manual fallback | **N/A** | Not run. |
   | Sanity (HTTP) | **INFO** | `curl` — `https://satisfecho.de/api/health` **200**, `https://satisfecho.de/` **200**; does not prove a green **Deploy to amvara9** run. |

5. **Overall: FAIL**  
   Criterion **2** fails. Criterion **1** passes. **Loop protection (`020-test.md`):** latest **`master`** **Deploy to amvara9** is still run **24773000757** with **`conclusion: failure`** and the same `updatedAt` as prior re-verifications; do not re-verify again with identical `gh` polling until **Actions** secrets and/or a **re-run** or new **`master` push change CI. **Task rename:** `TESTING-` → **`WIP-`**. Return to **`UNTESTED-`** when a green **Deploy to amvara9** is expected.

6. **Product owner feedback**  
   **`origin/master`** remains at **`7a2c2bd…`**; **`origin/development`** is at **`a560ee8a…`** with `master` in the ancestry. **Issue #195** is not satisfied for “success status of the deployment action on GitHub” for the current **`master`**-line list — the latest such run is still the failed 22 Apr workflow. **HTTP 200** on **satisfecho.de** is sanity only.

7. **URLs tested (numbered list)**  
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757` (run `conclusion: failure`, JSON 2026-04-27T02:26Z)  
   2. `https://satisfecho.de/api/health` (200)  
   3. `https://satisfecho.de/` (200)

8. **Relevant log excerpts (last section)**  
   - `gh run view 24773000757 --repo satisfecho/pos --json conclusion,url,updatedAt,status` (2026-04-27T02:26Z): **`"conclusion":"failure"`**, `status: completed`, `updatedAt: 2026-04-22T10:18:30Z` — unchanged vs prior re-verifications.  
   - Step text: `gh run view 24773000757 --log-failed` (marketing token / placeholder slugs) as in the implementation summary.

## Test report (2026-04-27T03:25Z–2026-04-27T03:30Z UTC, 020-tester)

1. **Date/time (UTC) and log window**  
   - **Window:** 2026-04-27T03:25Z–2026-04-27T03:30Z.  
   - **Commands:** `git` / `gh` / `curl` on host at repo root after `./scripts/git-sync-development.sh` and `git fetch origin` (not `docker logs` — not required by Testing instructions).

2. **Environment**  
   - **Branch (local):** `development` (synced before edits). **Remotes (after `git fetch origin`):** `origin/master` = `7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`, `origin/development` = `0d619d8ca5b56afb16595d10c2d5ab96f776a4a6`.  
   - **Compose / local app:** N/A per task.  
   - **Evidence:** `gh` to `satisfecho/pos` Actions; `gh run list` / `gh run view` JSON (authenticated).

3. **What was tested (from “Testing instructions”)**  
   - (1) `git rev-parse origin/master origin/development` and `git merge-base --is-ancestor origin/master origin/development`.  
   - (2) **Deploy to amvara9** — latest run on **`master`**, `gh run list` (limit 8) and `gh run view 24773000757 --json conclusion,url,updatedAt`.  
   - (3) Optional after **green** — N/A (no green **master** deploy newer than the failed latest).  
   - (4) Manual server deploy — N/A (not run).

4. **Results**

   | Criterion | Result | Evidence line |
   |---|---|---|
   | 1. Git: `origin/master` / `origin/development` and lineage | **PASS** | `git rev-parse` (SHAs above); `git merge-base --is-ancestor origin/master origin/development` → exit **0** (`origin/master` is an ancestor of `origin/development`). |
   | 2. GitHub Actions: **green** for latest **`master`** **Deploy to amvara9** | **FAIL** | `gh run list --repo satisfecho/pos --workflow "Deploy to amvara9" --branch master --limit 8` — most recent is still **24773000757** (2026-04-22T10:18:20Z) **conclusion: failure**. `gh run view 24773000757 --json conclusion,url,updatedAt` (2026-04-27T03:28Z) → **`"conclusion":"failure"`**, `updatedAt` **2026-04-22T10:18:30Z**; no newer **success** on **`master`** supersedes that run as latest. |
   | 3. Optional after **green** | **N/A** | Not applicable until (2) passes. |
   | 4. Manual fallback | **N/A** | Not run. |
   | Sanity (HTTP) | **INFO** | `curl` — `https://satisfecho.de/api/health` **200**, `https://satisfecho.de/` **200**; does not prove a green **Deploy to amvara9** run. |

5. **Overall: FAIL**  
   Criterion **2** fails. Criterion **1** passes. **Loop protection (`020-test.md`):** the latest **`master`** **Deploy to amvara9** is still run **24773000757** with unchanged **`conclusion: failure`** and the same `updatedAt` (2026-04-22) as in prior re-verifications; do not re-run identical checks until **Actions** secrets (`MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN` per `config/marketing-sites.json`) and a **re-run** or new **`master` push** change GitHub. **Task rename:** `TESTING-` → **`WIP-`**. Return to **`UNTESTED-`** when a green **Deploy to amvara9** is expected.

6. **Product owner feedback**  
   **`origin/development`** is at **`0d619d8c…`** with **`origin/master`** at **`7a2c2bd…`** and valid ancestry. **Issue #195** is still not satisfied for a **successful** deployment action on GitHub: the **latest** **`master` line** run remains the failed 22 Apr workflow. Live **HTTP 200** is sanity only, not a substitute for a **success** workflow.

7. **URLs tested (numbered list)**  
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757` (`conclusion: failure`, JSON 2026-04-27T03:28Z)  
   2. `https://satisfecho.de/api/health` (200)  
   3. `https://satisfecho.de/` (200)

8. **Relevant log excerpts (last section)**  
   - `gh run view 24773000757 --repo satisfecho/pos --json conclusion,url,updatedAt` (2026-04-27T03:28Z): **`"conclusion":"failure"`**; `updatedAt` **2026-04-22T10:18:30Z** — unchanged.  
   - Step-level: prior `--log-failed` excerpts in this file (empty marketing token / placeholder slugs) still apply; re-fetch with `gh run view 24773000757 --log-failed` if full CI log is needed.

## Test report (2026-04-27T12:45Z–2026-04-27T12:52Z UTC, 020-tester)

1. **Date/time (UTC) and log window**  
   - **Window:** 2026-04-27T12:45Z–2026-04-27T12:52Z.  
   - **Commands:** `git` / `gh` / `curl` on host at `/Users/raro42/projects/pos2` after `./scripts/git-sync-development.sh` (not `docker logs` — not required by Testing instructions).

2. **Environment**  
   - **Branch (local):** `development` synced. **Remotes (after `git fetch origin`):** `origin/master` = `7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`, `origin/development` = `cf9a0af129cf0edf5f26d38961e022f4ae8e3553`.  
   - **Compose / local app:** N/A per task.

3. **What was tested (from “Testing instructions”)**  
   - (1) `git rev-parse origin/master origin/development` and `git merge-base --is-ancestor origin/master origin/development`.  
   - (2) **Deploy to amvara9** — `gh run list --repo satisfecho/pos --workflow "Deploy to amvara9" --branch master --limit 10` and `gh run view 24773000757 --json conclusion,url,updatedAt`.  
   - (3) Optional after **green** — N/A (no new green **master** deploy as latest).  
   - (4) Manual server deploy — N/A (not run).

4. **Results**

   | Criterion | Result | Evidence line |
   |---|---|---|
   | 1. Git: `origin/master` / `origin/development` and lineage | **PASS** | SHAs above; `git merge-base --is-ancestor origin/master origin/development` → exit **0** (`origin/master` is an ancestor of `origin/development`). |
   | 2. GitHub Actions: **green** for latest **`master`** **Deploy to amvara9** | **FAIL** | `gh run list` — most recent on **`master`** is still **24773000757** (2026-04-22T10:18:20Z) **conclusion: failure**. `gh run view 24773000757 --json conclusion,updatedAt,url` (2026-04-27T12:50Z) → **`"conclusion":"failure"`**, `updatedAt` **2026-04-22T10:18:30Z** (unchanged). No newer **success** on **`master`** supersedes **24773000757** as the latest run. |
   | 3. Optional after **green** | **N/A** | Not applicable until (2) passes. |
   | 4. Manual fallback | **N/A** | Not run. |
   | Sanity (HTTP) | **INFO** | `curl` — `https://satisfecho.de/api/health` **200**, `https://satisfecho.de/` **200**; does not prove a green **Deploy to amvara9** run. |

5. **Overall: FAIL**  
   Criterion **2** fails. Criterion **1** passes. **Loop protection (`020-test.md`):** GitHub metadata for run **24773000757** is unchanged (`conclusion: failure`, same `updatedAt`); further identical polling is low value until **Actions** secrets (`MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN` per `config/marketing-sites.json`) and a **re-run** or new **`master`** push change CI. **Rename:** `TESTING-` → **`WIP-`**. Return to **`UNTESTED-`** when operators expect a green **Deploy to amvara9**.

6. **Product owner feedback**  
   **`origin/development`** is at **`cf9a0af1…`** with **`origin/master`** at **`7a2c2bd…`** and valid ancestry. **Issue #195** still requires a **successful** **Deploy to amvara9** on GitHub for the **`master`** line; the latest such run remains the failed **22 Apr** workflow **24773000757**. Live **HTTP 200** on **satisfecho.de** is sanity only, not a substitute for a **success** workflow.

7. **URLs tested (numbered list)**  
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757` (run `conclusion: failure`, JSON 2026-04-27T12:50Z)  
   2. `https://satisfecho.de/api/health` (200)  
   3. `https://satisfecho.de/` (200)

8. **Relevant log excerpts (last section)**  
   - `gh run view 24773000757 --repo satisfecho/pos --json conclusion,url,updatedAt` (2026-04-27T12:50Z): **`"conclusion":"failure"`**; `updatedAt` **2026-04-22T10:18:30Z** — unchanged from prior re-verifications.  
   - Step text: `gh run view 24773000757 --log-failed` (marketing token / placeholder slugs) as in the implementation summary.

## Test report (2026-04-27 UTC, 020-tester)

1. **Date/time (UTC) and log window**  
   - **Window:** 2026-04-27 (verification commands run immediately after `./scripts/git-sync-development.sh` at repo root; host `git` / `gh` / `curl` — not `docker logs`, not required by Testing instructions.)

2. **Environment**  
   - **Branch (local):** `development` synced (`git-sync-development.sh`: already up to date).  
   - **Remotes (after `git fetch origin`):** `origin/master` = `7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`, `origin/development` = `272a139cfd48c8caa874bdd69bd515a89b3aba80`.  
   - **Compose / local app:** N/A per task.

3. **What was tested (from “Testing instructions”)**  
   - (1) `git rev-parse origin/master origin/development` and `git merge-base --is-ancestor origin/master origin/development`.  
   - (2) **Deploy to amvara9** — `gh run list --repo satisfecho/pos --workflow "Deploy to amvara9" --branch master --limit 10` and `gh run view 24773000757 --json conclusion,url,updatedAt`.  
   - (3) Optional after **green** — N/A (no newer **success** as latest **`master`** deploy).  
   - (4) Manual server deploy — N/A (not run).

4. **Results**

   | Criterion | Result | Evidence line |
   |---|---|---|
   | 1. Git: `origin/master` / `origin/development` and lineage | **PASS** | SHAs above; `git merge-base --is-ancestor origin/master origin/development` → exit **0** (`origin/master` is an ancestor of `origin/development`). |
   | 2. GitHub Actions: **green** for latest **`master`** **Deploy to amvara9** | **FAIL** | `gh run list` — most recent on **`master`** is still **24773000757** (2026-04-22T10:18:20Z) **conclusion: failure**. `gh run view 24773000757 --json conclusion,url,updatedAt` → **`"conclusion":"failure"`**, `updatedAt` **2026-04-22T10:18:30Z** (unchanged). No newer **success** supersedes **24773000757** as the latest **`master`** run in the listed set. |
   | 3. Optional after **green** | **N/A** | Not applicable until (2) passes. |
   | 4. Manual fallback | **N/A** | Not run. |
   | Sanity (HTTP) | **INFO** | `curl` — `https://satisfecho.de/api/health` **200**, `https://satisfecho.de/` **200**; does not prove a green **Deploy to amvara9** run. |

5. **Overall: FAIL**  
   Criterion **2** fails. Criterion **1** passes. **Loop protection (`020-test.md`):** GitHub metadata for the latest **`master`** deploy in scope is unchanged (**24773000757**, `conclusion: failure`, same `updatedAt` as prior reports). Further identical polling has no value until **Actions** secrets (`MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN` per `config/marketing-sites.json`) and a **re-run** or new **`master`**-triggered deploy change CI. **Task rename:** `TESTING-` → **`WIP-`**. Return to **`UNTESTED-`** when a green **Deploy to amvara9** is expected.

6. **Product owner feedback**  
   **`origin/development`** is at **`272a139c…`** with **`origin/master`** at **`7a2c2bd…`** and valid ancestry. **Issue #195** is still not satisfied for a **successful** deployment workflow on GitHub: the latest **`master`** **Deploy to amvara9** run remains **24773000757** (**failure**). Live **HTTP 200** on **satisfecho.de** is only a sanity check.

7. **URLs tested (numbered list)**  
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757` (`conclusion: failure`)  
   2. `https://satisfecho.de/api/health` (200)  
   3. `https://satisfecho.de/` (200)

8. **Relevant log excerpts (last section)**  
   - `gh run view 24773000757 --repo satisfecho/pos --json conclusion,url,updatedAt` (this session): **`"conclusion":"failure"`**, `updatedAt` **2026-04-22T10:18:30Z**.  
   - Step-level text unchanged; use `gh run view 24773000757 --log-failed` for **Fetch marketing site artifacts** (marketing token / placeholder slugs) as in the implementation summary.

## Test report (2026-04-27T13:05Z–2026-04-27T13:15Z UTC, 020-tester)

1. **Date/time (UTC) and log window**  
   - **Window:** 2026-04-27T13:05Z–2026-04-27T13:15Z.  
   - **Commands:** `git` / `gh` / `curl` on host at repo root after `./scripts/git-sync-development.sh` and `git fetch origin` (not `docker logs` — not required by Testing instructions).

2. **Environment**  
   - **Branch (local):** `development` synced (`git-sync-development.sh`: already up to date).  
   - **Remotes (after `git fetch origin`):** `origin/master` = `7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`, `origin/development` = `6d1c059e97492b312ef7c8cbbdff291d29a2a96a`.  
   - **Compose / local app:** N/A per task.

3. **What was tested (from “Testing instructions”)**  
   - (1) `git rev-parse origin/master origin/development` and `git merge-base --is-ancestor origin/master origin/development`.  
   - (2) **Deploy to amvara9** — `gh run list --repo satisfecho/pos --workflow "Deploy to amvara9" --branch master --limit 12` and `gh run view 24773000757 --json conclusion,url,updatedAt`.  
   - (3) Optional after **green** — N/A (no newer **success** as latest **`master`** deploy after the failed tip).  
   - (4) Manual server deploy — N/A (not run).

4. **Results**

   | Criterion | Result | Evidence line |
   |---|---|---|
   | 1. Git: `origin/master` / `origin/development` and lineage | **PASS** | SHAs above; `git merge-base --is-ancestor origin/master origin/development` → exit **0** (`origin/master` is an ancestor of `origin/development`). |
   | 2. GitHub Actions: **green** for latest **`master`** **Deploy to amvara9** | **FAIL** | `gh run list` — most recent on **`master`** is still **24773000757** (2026-04-22T10:18:20Z) **`conclusion: failure`**. `gh run view 24773000757 --json conclusion,url,updatedAt` → **`"conclusion":"failure"`**, `updatedAt` **2026-04-22T10:18:30Z**. No newer **`master`** run supersedes **24773000757** as latest in the listed set. |
   | 3. Optional after **green** | **N/A** | Not applicable until (2) passes. |
   | 4. Manual fallback | **N/A** | Not run. |
   | Sanity (HTTP) | **INFO** | `curl` — `https://satisfecho.de/api/health` **200**, `https://satisfecho.de/` **200**; does not prove a green **Deploy to amvara9** run. |

5. **Overall: FAIL**  
   Criterion **2** fails. Criterion **1** passes. **Loop protection (`020-test.md`):** latest **`master`** **Deploy to amvara9** remains **24773000757** with **`conclusion: failure`** and unchanged `updatedAt`; stop re-checking until **Actions** secrets (`MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN` per `config/marketing-sites.json`) and a **re-run** or new **`master`** push produce a new workflow result. **Rename:** `TESTING-` → **`WIP-`**. Return to **`UNTESTED-`** when a green **Deploy to amvara9** is expected.

6. **Product owner feedback**  
   **`origin/development`** is at **`6d1c059e…`** with **`origin/master`** at **`7a2c2bd…`** and valid ancestry. **Issue #195** is still not satisfied for a **successful** deployment workflow on GitHub: the latest **`master`** **Deploy to amvara9** run remains **24773000757** (**failure**). Live **HTTP 200** on **satisfecho.de** is only a sanity check.

7. **URLs tested (numbered list)**  
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757` (`conclusion: failure`, JSON 2026-04-27T13:10Z)  
   2. `https://satisfecho.de/api/health` (200)  
   3. `https://satisfecho.de/` (200)

8. **Relevant log excerpts (last section)**  
   - `gh run view 24773000757 --repo satisfecho/pos --json conclusion,url,updatedAt` (2026-04-27T13:10Z): **`"conclusion":"failure"`**, `updatedAt` **2026-04-22T10:18:30Z** — unchanged from prior verifications.  
   - Step-level: `gh run view 24773000757 --log-failed` (marketing token / placeholder slugs) as in the implementation summary.

## Test report (2026-04-27T04:52Z–2026-04-27T04:56Z UTC, 020-tester)

1. **Date/time (UTC) and log window**  
   - **Window:** 2026-04-27T04:52Z–2026-04-27T04:56Z.  
   - **Commands:** `git` / `gh` / `curl` on host at repo root after `./scripts/git-sync-development.sh` and `git fetch origin` (not `docker logs` — not required by Testing instructions).

2. **Environment**  
   - **Branch (local):** `development` synced (already up to date).  
   - **Remotes (after `git fetch origin`):** `origin/master` = `7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`, `origin/development` = `2d23fa7be37c225c2ca35662e68cee92bb364483`.  
   - **Compose / local app:** N/A per task.

3. **What was tested (from “Testing instructions”)**  
   - (1) `git rev-parse origin/master origin/development` and `git merge-base --is-ancestor origin/master origin/development`.  
   - (2) **Deploy to amvara9** — `gh run list --repo satisfecho/pos --workflow "Deploy to amvara9" --branch master --limit 12` and `gh run view 24773000757 --json conclusion,url,updatedAt`.  
   - (3) Optional after **green** — N/A (no newer **success** as latest **`master`** deploy).  
   - (4) Manual server deploy — N/A (not run).

4. **Results**

   | Criterion | Result | Evidence line |
   |---|---|---|
   | 1. Git: `origin/master` / `origin/development` and lineage | **PASS** | SHAs above; `git merge-base --is-ancestor origin/master origin/development` → exit **0** (`origin/master` is an ancestor of `origin/development`). |
   | 2. GitHub Actions: **green** for latest **`master`** **Deploy to amvara9** | **FAIL** | `gh run list` — most recent on **`master`** is still **24773000757** (2026-04-22T10:18:20Z) **`conclusion: failure`**. `gh run view 24773000757 --json conclusion,url,updatedAt` (2026-04-27T04:56Z) → **`"conclusion":"failure"`**, `updatedAt` **2026-04-22T10:18:30Z** — unchanged; no newer **success** supersedes **24773000757** as latest on `master`. |
   | 3. Optional after **green** | **N/A** | Not applicable until (2) passes. |
   | 4. Manual fallback | **N/A** | Not run. |
   | Sanity (HTTP) | **INFO** | `curl` — `https://satisfecho.de/api/health` **200**, `https://satisfecho.de/` **200**; does not prove a green **Deploy to amvara9** run. |

5. **Overall: FAIL**  
   Criterion **2** fails. Criterion **1** passes. **Loop protection (`020-test.md`):** GitHub metadata for run **24773000757** is unchanged (`conclusion: failure`, same `updatedAt` as prior reports). Further identical polling has no value until **Actions** secrets (`MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN` per `config/marketing-sites.json`) and a **re-run** or new **`master`** push change CI. **Rename:** `TESTING-` → **`WIP-`**. Return to **`UNTESTED-`** when a green **Deploy to amvara9** is expected.

6. **Product owner feedback**  
   **`origin/development`** is at **`2d23fa7…`** with **`origin/master`** at **`7a2c2bd…`** and valid ancestry. **Issue #195** is still not satisfied for a **successful** deployment workflow on GitHub: the latest **`master`** **Deploy to amvara9** run remains **24773000757** (**failure**). Live **HTTP 200** on **satisfecho.de** is sanity only.

7. **URLs tested (numbered list)**  
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757` (`conclusion: failure`, JSON 2026-04-27T04:56Z)  
   2. `https://satisfecho.de/api/health` (200)  
   3. `https://satisfecho.de/` (200)

8. **Relevant log excerpts (last section)**  
   - `gh run view 24773000757 --repo satisfecho/pos --json conclusion,url,updatedAt` (2026-04-27T04:56Z): **`"conclusion":"failure"`**; `updatedAt` **2026-04-22T10:18:30Z** — unchanged from prior verifications.  
   - Step-level: `gh run view 24773000757 --log-failed` (marketing token / placeholder slugs) as in the implementation summary.

## Test report (2026-04-27T05:05Z–2026-04-27T05:12Z UTC, 020-tester)

1. **Date/time (UTC) and log window**  
   - **Window:** 2026-04-27T05:05Z–2026-04-27T05:12Z.  
   - **Commands:** `git` / `gh` / `curl` at `/Users/raro42/projects/pos2` after `./scripts/git-sync-development.sh` and `git fetch origin` (not `docker logs` — not required by Testing instructions).

2. **Environment**  
   - **Branch (local):** `development` synced (`origin/development` up to date).  
   - **Remotes:** `origin/master` = `7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`, `origin/development` = `0ee2b0c57b07914ef919e2e779f334d30532efe4`.  
   - **Compose / local app:** N/A per task.

3. **What was tested (from “Testing instructions”)**  
   - (1) `git rev-parse origin/master origin/development` and `git merge-base --is-ancestor origin/master origin/development`.  
   - (2) **Deploy to amvara9** — `gh run list --repo satisfecho/pos --workflow "Deploy to amvara9" --branch master --limit 8` and `gh run view 24773000757 --json conclusion,url,updatedAt`.  
   - (3) Optional after **green** — N/A (latest **`master`** deploy is still **failure**).  
   - (4) Manual server deploy — N/A (not run).

4. **Results**

   | Criterion | Result | Evidence line |
   |---|---|---|
   | 1. Git: `origin/master` / `origin/development` and lineage | **PASS** | SHAs above; `git merge-base --is-ancestor origin/master origin/development` → exit **0** (`origin/master` is an ancestor of `origin/development`). |
   | 2. GitHub Actions: **green** for latest **`master`** **Deploy to amvara9** | **FAIL** | `gh run list` — most recent on **`master`** is still **24773000757** (2026-04-22T10:18:20Z) **`conclusion: failure`**. `gh run view 24773000757 --json conclusion,url,updatedAt` (2026-04-27T05:11Z) → **`"conclusion":"failure"`**, `updatedAt` **2026-04-22T10:18:30Z** — unchanged; no newer **`master`** run supersedes **24773000757** as latest. |
   | 3. Optional after **green** | **N/A** | Not applicable until (2) passes. |
   | 4. Manual fallback | **N/A** | Not run. |
   | Sanity (HTTP) | **INFO** | `curl` — `https://satisfecho.de/api/health` **200**, `https://satisfecho.de/` **200**; does not prove a green **Deploy to amvara9** run. |

5. **Overall: FAIL**  
   Criterion **2** fails. Criterion **1** passes. **Loop protection (`020-test.md`):** latest **`master`** **Deploy to amvara9** remains run **24773000757** with **`conclusion: failure`** and the same `updatedAt` as prior reports — stop re-checking until **Actions** secrets (`MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN` per `config/marketing-sites.json`) and a **re-run** or new **`master`** push change CI. **Rename:** `TESTING-` → **`WIP-`**. Return to **`UNTESTED-`** when a green **Deploy to amvara9** is expected.

6. **Product owner feedback**  
   **`origin/development`** is at **`0ee2b0c5…`** with **`origin/master`** at **`7a2c2bd…`** and valid ancestry. **Issue #195** is still not satisfied for a **successful** deployment workflow on GitHub: the latest **`master`** **Deploy to amvara9** run remains **24773000757** (**failure**). Live **HTTP 200** on **satisfecho.de** is sanity only.

7. **URLs tested (numbered list)**  
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757` (`conclusion: failure`, JSON 2026-04-27T05:11Z)  
   2. `https://satisfecho.de/api/health` (200)  
   3. `https://satisfecho.de/` (200)

8. **Relevant log excerpts (last section)**  
   - `gh run view 24773000757 --repo satisfecho/pos --json conclusion,url,updatedAt` (2026-04-27T05:11Z): **`"conclusion":"failure"`**, `updatedAt` **2026-04-22T10:18:30Z**, `url` **https://github.com/satisfecho/pos/actions/runs/24773000757**.  
   - Step-level: unchanged from implementation summary (`gh run view 24773000757 --log-failed`: marketing token / placeholder slugs).

## Test report (2026-04-27T05:18Z–2026-04-27T05:19Z UTC, 020-tester)

1. **Date/time (UTC) and log window**  
   - **Window:** 2026-04-27T05:18Z–2026-04-27T05:19Z.  
   - **Commands:** `git` / `gh` / `curl` on host at `/Users/raro42/projects/pos2` after `./scripts/git-sync-development.sh` and `git fetch origin` (not `docker logs` — not required by Testing instructions).

2. **Environment**  
   - **Branch (local):** `development` synced (`git-sync-development.sh`: already up to date).  
   - **Remotes (after `git fetch origin`):** `origin/master` = `7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`, `origin/development` = `70ef992155dd2204c56de74dc6848c93827f890f`.  
   - **Compose / local app:** N/A per task.

3. **What was tested (from “Testing instructions”)**  
   - (1) `git rev-parse origin/master origin/development` and `git merge-base --is-ancestor origin/master origin/development`.  
   - (2) **Deploy to amvara9** — `gh run list --repo satisfecho/pos --workflow "Deploy to amvara9" --branch master --limit 8` and `gh run view 24773000757 --json conclusion,url,updatedAt`.  
   - (3) Optional after **green** — N/A (latest **`master`** deploy still **failure**).  
   - (4) Manual server deploy — N/A (not run).

4. **Results**

   | Criterion | Result | Evidence line |
   |---|---|---|
   | 1. Git: `origin/master` / `origin/development` and lineage | **PASS** | SHAs above; `git merge-base --is-ancestor origin/master origin/development` → exit **0** (`origin/master` is an ancestor of `origin/development`). |
   | 2. GitHub Actions: **green** for latest **`master`** **Deploy to amvara9** | **FAIL** | `gh run list` — most recent on **`master`** is still **24773000757** (2026-04-22T10:18:20Z) **`conclusion: failure`**. `gh run view 24773000757 --json conclusion,url,updatedAt` (2026-04-27T05:19Z) → **`"conclusion":"failure"`**, `updatedAt` **2026-04-22T10:18:30Z** — unchanged; no newer **`master`** run supersedes **24773000757** as latest. |
   | 3. Optional after **green** | **N/A** | Not applicable until (2) passes. |
   | 4. Manual fallback | **N/A** | Not run. |
   | Sanity (HTTP) | **INFO** | `curl` — `https://satisfecho.de/api/health` **200**, `https://satisfecho.de/` **200**; does not prove a green **Deploy to amvara9** run. |

5. **Overall: FAIL**  
   Criterion **2** fails. Criterion **1** passes. **Loop protection (`020-test.md`):** GitHub metadata for the latest **`master`** **Deploy to amvara9** run is unchanged (**24773000757**, `conclusion: failure`, same `updatedAt` as all prior reports). Stop re-verifying until **Actions** secrets (`MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN` per `config/marketing-sites.json`) and a **re-run** or new **`master`** push change CI. **Task rename:** `TESTING-` → **`WIP-`**. Return to **`UNTESTED-`** when a green **Deploy to amvara9** is expected.

6. **Product owner feedback**  
   **`origin/development`** is at **`70ef9921…`** with **`origin/master`** at **`7a2c2bd…`** and valid ancestry. **Issue #195** is still not satisfied for a **successful** deployment workflow on GitHub: the latest **`master`** **Deploy to amvara9** run remains **24773000757** (**failure**). Live **HTTP 200** on **satisfecho.de** is sanity only.

7. **URLs tested (numbered list)**  
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757` (`conclusion: failure`, JSON 2026-04-27T05:19Z)  
   2. `https://satisfecho.de/api/health` (200)  
   3. `https://satisfecho.de/` (200)

8. **Relevant log excerpts (last section)**  
   - `gh run view 24773000757 --repo satisfecho/pos --json conclusion,url,updatedAt` (2026-04-27T05:19Z): **`"conclusion":"failure"`**, `updatedAt` **2026-04-22T10:18:30Z** — unchanged from prior verifications.  
   - Step-level: `gh run view 24773000757 --log-failed` (marketing token / placeholder slugs) as in the implementation summary.

## Test report (2026-04-27T05:28Z–2026-04-27T05:34Z UTC, 020-tester)

1. **Date/time (UTC) and log window**  
   - **Window:** 2026-04-27T05:28Z–2026-04-27T05:34Z.  
   - **Commands:** `git` / `gh` / `curl` on host at repo root after `./scripts/git-sync-development.sh` and `git fetch origin` (not `docker logs` — not required by Testing instructions).

2. **Environment**  
   - **Branch (local):** `development` synced (`git-sync-development.sh`: already up to date).  
   - **Remotes (after `git fetch origin`):** `origin/master` = `7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`, `origin/development` = `5bdf9a0d50bbaff957aa8ea642d071ba0b5e2213`.  
   - **Compose / local app:** N/A per task.

3. **What was tested (from “Testing instructions”)**  
   - (1) `git rev-parse origin/master origin/development` and `git merge-base --is-ancestor origin/master origin/development`.  
   - (2) **Deploy to amvara9** — `gh run list --repo satisfecho/pos --workflow "Deploy to amvara9" --branch master --limit 15` and `gh run view 24773000757 --json conclusion,url,updatedAt,status`.  
   - (3) Optional after **green** — N/A (no newer **success** as latest **`master`** deploy).  
   - (4) Manual server deploy — N/A (not run).

4. **Results**

   | Criterion | Result | Evidence line |
   |---|---|---|
   | 1. Git: `origin/master` / `origin/development` and lineage | **PASS** | SHAs above; `git merge-base --is-ancestor origin/master origin/development` → exit **0** (`origin/master` is an ancestor of `origin/development`). |
   | 2. GitHub Actions: **green** for latest **`master`** **Deploy to amvara9** | **FAIL** | `gh run list` — most recent on **`master`** is still **24773000757** (2026-04-22T10:18:20Z) **`conclusion: failure`**. `gh run view 24773000757 --json conclusion,url,updatedAt` (2026-04-27T05:33Z) → **`"conclusion":"failure"`**, `updatedAt` **2026-04-22T10:18:30Z**, `status` **completed** — unchanged; no newer **`master`** run supersedes **24773000757** as latest. |
   | 3. Optional after **green** | **N/A** | Not applicable until (2) passes. |
   | 4. Manual fallback | **N/A** | Not run. |
   | Sanity (HTTP) | **INFO** | `curl` — `https://satisfecho.de/api/health` **200**, `https://satisfecho.de/` **200**; does not prove a green **Deploy to amvara9** run. |

5. **Overall: FAIL**  
   Criterion **2** fails. Criterion **1** passes. **Loop protection (`020-test.md`):** GitHub metadata for run **24773000757** is unchanged (`conclusion: failure`, same `updatedAt` since 2026-04-22); further identical polling has no value until **Actions** secrets (`MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN` per `config/marketing-sites.json`) and a **re-run** or new **`master`** push produce a different workflow outcome. **Rename:** `TESTING-` → **`WIP-`** (verification complete this session).

6. **Product owner feedback**  
   **`origin/development`** is at **`5bdf9a0…`** with **`origin/master`** at **`7a2c2bd…`** and valid ancestry. **Issue #195** remains unsatisfied for “deployment action succeeded on GitHub”: the latest **`master`** **Deploy to amvara9** run is still **24773000757** (**failure**). Production **HTTP 200** is sanity only.

7. **URLs tested (numbered list)**  
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757` (`conclusion: failure`, JSON 2026-04-27T05:33Z)  
   2. `https://satisfecho.de/api/health` (200)  
   3. `https://satisfecho.de/` (200)

8. **Relevant log excerpts (last section)**  
   - `gh run view 24773000757 --repo satisfecho/pos --json conclusion,url,updatedAt,status` (2026-04-27T05:33Z): **`"conclusion":"failure"`**, `updatedAt` **2026-04-22T10:18:30Z** — unchanged.  
   - Step-level: `gh run view 24773000757 --log-failed` (marketing token / placeholder slugs) as in the implementation summary.

## Test report (2026-04-27T05:47Z–2026-04-27T05:48Z UTC, 020-tester)

1. **Date/time (UTC) and log window**  
   - **Window:** 2026-04-27T05:47Z–2026-04-27T05:48Z.  
   - **Commands:** `git` / `gh` / `curl` on host at `/Users/raro42/projects/pos2` after `./scripts/git-sync-development.sh` and `git fetch origin` (not `docker logs` — not required by Testing instructions).

2. **Environment**  
   - **Branch (local):** `development` synced (`git-sync-development.sh`: already up to date).  
   - **Remotes (after `git fetch origin`):** `origin/master` = `7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`, `origin/development` = `6e10ae3f69471bb3ceaf5ca0ec2518cb1a73b7d5`.  
   - **Compose / local app:** N/A per task.

3. **What was tested (from “Testing instructions”)**  
   - (1) `git rev-parse origin/master origin/development` and `git merge-base --is-ancestor origin/master origin/development`.  
   - (2) **Deploy to amvara9** — `gh run list --repo satisfecho/pos --workflow "Deploy to amvara9" --branch master --limit 8` and `gh run view 24773000757 --json conclusion,url,updatedAt,status`.  
   - (3) Optional after **green** — N/A (latest **`master`** deploy still **failure**).  
   - (4) Manual server deploy — N/A (not run).

4. **Results**

   | Criterion | Result | Evidence line |
   |---|---|---|
   | 1. Git: `origin/master` / `origin/development` and lineage | **PASS** | SHAs above; `git merge-base --is-ancestor origin/master origin/development` → exit **0** (`origin/master` is an ancestor of `origin/development`). |
   | 2. GitHub Actions: **green** for latest **`master`** **Deploy to amvara9** | **FAIL** | `gh run list` — most recent on **`master`** is **24773000757** (2026-04-22T10:18:20Z) **`conclusion: failure`**. `gh run view 24773000757 --json conclusion,updatedAt` (2026-04-27T05:48Z) → **`"conclusion":"failure"`**, `updatedAt` **2026-04-22T10:18:30Z** — unchanged; no newer **`master`** success supersedes this as latest. |
   | 3. Optional after **green** | **N/A** | Not applicable until (2) passes. |
   | 4. Manual fallback | **N/A** | Not run. |
   | Sanity (HTTP) | **INFO** | `curl` → `https://satisfecho.de/api/health` **200**, `https://satisfecho.de/` **200**; does not prove a green **Deploy to amvara9** run. |

5. **Overall: FAIL**  
   Criterion **2** fails. Criterion **1** passes. **Loop protection (`020-test.md`):** Workflow run **24773000757** metadata unchanged since prior sessions (`conclusion: failure`, same `updatedAt`); repeated polling cannot turn CI green — requires **Actions** secrets (`MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN` per **`config/marketing-sites.json`**) and **re-run** or new **`master`** deploy. **Rename:** `TESTING-` → **`WIP-`**.

6. **Product owner feedback**  
   **`origin/development`** tip **`6e10ae3…`** contains **`origin/master`** **`7a2c2bd…`** (valid promotion ancestry). **Issue #195** is still **not** satisfied for a **successful** GitHub **Deploy to amvara9** on the latest **`master`** line: run **24773000757** remains **failure**. Live site **HTTP 200** is operational sanity only, not CI proof.

7. **URLs tested (numbered list)**  
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757` (`conclusion: failure`, JSON 2026-04-27T05:48Z)  
   2. `https://satisfecho.de/api/health` (200)  
   3. `https://satisfecho.de/` (200)

8. **Relevant log excerpts (last section)**  
   - `gh run view 24773000757 --repo satisfecho/pos --json conclusion,updatedAt` (2026-04-27T05:48Z): **`"conclusion":"failure"`**, `updatedAt` **2026-04-22T10:18:30Z**.  
   - Step-level failure cause unchanged: empty **`MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN`** and placeholder marketing bundles (see implementation summary and earlier `--log-failed` excerpts in this file).

## Test report (2026-04-27T06:01Z–2026-04-27T06:02Z UTC, 020-tester)

1. **Date/time (UTC) and log window**  
   - **Window:** 2026-04-27T06:01Z–2026-04-27T06:02Z.  
   - **Commands:** `git` / `gh` / `curl` on host at `/Users/raro42/projects/pos2` after `./scripts/git-sync-development.sh` and `git fetch origin` (not `docker logs` — not required by Testing instructions).

2. **Environment**  
   - **Branch (local):** `development` synced per `git-sync-development.sh` (already up to date with `origin/development`).  
   - **Remotes (after `git fetch origin`):** `origin/master` = `7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`, `origin/development` = `c7f2eb6cae97247a235cbe19c63895ce135de94c`.  
   - **Compose / local app:** N/A per task.

3. **What was tested (from “Testing instructions”)**  
   - (1) `git rev-parse origin/master origin/development` and `git merge-base --is-ancestor origin/master origin/development`.  
   - (2) **Deploy to amvara9** — `gh run list --repo satisfecho/pos --workflow "Deploy to amvara9" --branch master --limit 10` and `gh run view 24773000757 --json conclusion,updatedAt,status,url`.  
   - (3) Optional after **green** — N/A (latest **`master`** deploy still **failure**).  
   - (4) Manual server deploy — N/A (not run).

4. **Results**

   | Criterion | Result | Evidence line |
   |---|---|---|
   | 1. Git: `origin/master` / `origin/development` and lineage | **PASS** | SHAs above; `git merge-base --is-ancestor origin/master origin/development` → exit **0**. |
   | 2. GitHub Actions: **green** for latest **`master`** **Deploy to amvara9** | **FAIL** | `gh run list` — most recent on **`master`** is **24773000757** (2026-04-22T10:18:20Z) **conclusion: failure**. `gh run view 24773000757` (JSON 2026-04-27T06:01Z): **`"conclusion":"failure"`**, **`updatedAt`:** **2026-04-22T10:18:30Z** (unchanged); no newer **success** run on **`master`** supersedes this as latest. |
   | 3. Optional after **green** | **N/A** | Not applicable until (2) passes. |
   | 4. Manual fallback | **N/A** | Not run. |
   | Sanity (HTTP) | **INFO** | `curl` → `https://satisfecho.de/api/health` **200**, `https://satisfecho.de/` **200**; does not prove a green **Deploy to amvara9** pipeline. |

5. **Overall: FAIL**  
   Criterion **2** fails (issue requirement: successful **Deploy to amvara9** on GitHub for the **`master`** line — not met). Criterion **1** passes. **Loop protection (`020-test.md`):** repeated checks show the same failed run metadata; fixing requires **Actions** secrets and a **re-run** or new **`master`** deploy, not further identical polling alone. **Rename:** `TESTING-` → **`WIP-`**.

6. **Product owner feedback**  
   Branch state is consistent with a past promotion (**`origin/master`** is an ancestor of **`origin/development`** at **`c7f2eb6…`**). The automated **`master`** deploy workflow is still **red** at the latest listed run (**24773000757**); public **HTTP 200** does not substitute for a green workflow. Operators should resolve marketing **PAT**/**token** configuration and obtain a **success** run before treating **#195** as satisfied on the CI side.

7. **URLs tested (numbered list)**  
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757` (`conclusion: failure`, JSON 2026-04-27T06:01Z)  
   2. `https://satisfecho.de/api/health` (200)  
   3. `https://satisfecho.de/` (200)

8. **Relevant log excerpts (last section)**  
   - `gh run view 24773000757 --repo satisfecho/pos --json conclusion,updatedAt,displayTitle` (2026-04-27T06:01Z): **`"conclusion":"failure"`**, **`updatedAt`:** **2026-04-22T10:18:30Z**, **displayTitle:** Agent 001: add FEAT task for GitHub issue #195 (push to master).  
   - Step-level cause per prior reports: marketing artifact token / placeholder bundles (`--log-failed` not re-fetched this run — run id and `conclusion` unchanged).

## Test report (2026-04-27T06:06Z–2026-04-27T06:09Z UTC, 020-tester)

1. **Date/time (UTC) and log window**  
   - **Window:** 2026-04-27T06:06Z–2026-04-27T06:09Z.  
   - **Commands:** `git` / `gh` / `curl` on host at `/Users/raro42/projects/pos2` after `./scripts/git-sync-development.sh` and `git fetch origin` (not `docker logs` — out of scope for this task).

2. **Environment**  
   - **Branch (local):** `development` synced (already up to date with `origin/development`).  
   - **Remotes (after `git fetch origin`):** `origin/master` = `7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`, `origin/development` = `1a6c89268007ef63905d53277e1349d29c47eb98`.  
   - **Compose / local app:** N/A.

3. **What was tested (from “Testing instructions”)**  
   - (1) `git rev-parse origin/master origin/development` and `git merge-base --is-ancestor origin/master origin/development`.  
   - (2) **Deploy to amvara9** — `gh run list --workflow "Deploy to amvara9" --branch master` and `gh run view 24773000757 --json conclusion,updatedAt,url`.  
   - (3) Optional after **green** — N/A (latest **`master`** deploy not green).  
   - (4) Manual server deploy — N/A (not run).

4. **Results**

   | Criterion | Result | Evidence line |
   |---|---|---|
   | 1. Git: `origin/master` / `origin/development` and lineage | **PASS** | SHAs above; `git merge-base --is-ancestor origin/master origin/development` → exit **0**. |
   | 2. GitHub Actions: **green** for latest **`master`** **Deploy to amvara9** | **FAIL** | `gh run list` — most recent on **`master`** is **24773000757** (2026-04-22T10:18:20Z) **failure**; no newer **`master`** run supersedes it as latest. `gh run view 24773000757 --json conclusion,updatedAt` → **`"conclusion":"failure"`**, **`updatedAt`:** **2026-04-22T10:18:30Z** (unchanged from prior verifications). |
   | 3. Optional after **green** | **N/A** | Not applicable until (2) passes. |
   | 4. Manual fallback | **N/A** | Not run. |
   | Sanity (HTTP) | **INFO** | `curl` → `https://satisfecho.de/api/health` **200**, `https://satisfecho.de/` **200**; does not prove a green **Deploy to amvara9** pipeline. |

5. **Overall: FAIL**  
   Criterion **2** fails — the **Deploy to amvara9** workflow for the current latest **`master`** deploy is still **24773000757** with **`conclusion: failure`**; issue **#195** requirement for a **successful** deployment action on GitHub is not met. Criterion **1** passes. **Loop protection (`020-test.md`):** GitHub metadata for run **24773000757** (`conclusion`, `updatedAt`) matches all prior sessions; further identical `gh` polling cannot clear CI until **Actions** secrets (`MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN` per **`config/marketing-sites.json`**) are set and the workflow is **re-run** or a new **`master`** push triggers a fresh deploy. **Rename:** `TESTING-` → **`WIP-`**; return to **`UNTESTED-`** when a green pipeline is expected.

6. **Product owner feedback**  
   **`origin/master`** remains an ancestor of **`origin/development`** at **`1a6c892…`**, which is consistent with ongoing work on **`development`** after promotion. Public prod URLs still return **HTTP 200**, but that does not satisfy the GitHub Actions success criterion; operators still need a **green** **Deploy to amvara9** run after fixing marketing PAT/token configuration.

7. **URLs tested (numbered list)**  
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757`  
   2. `https://satisfecho.de/api/health` (200)  
   3. `https://satisfecho.de/` (200)

8. **Relevant log excerpts (last section)**  
   - `gh run view 24773000757 --repo satisfecho/pos --json conclusion,updatedAt` (2026-04-27T06:09Z): **`"conclusion":"failure"`**, **`updatedAt`:** **2026-04-22T10:18:30Z**.  
   - Step-level logs not re-fetched; root cause unchanged per implementation summary (empty marketing tokens / placeholder bundles).

## Test report (2026-04-27T06:41Z UTC — tester verification)

1. **Date/time (UTC) and log window**  
   - **Window:** 2026-04-27T06:39Z–2026-04-27T06:41Z.  
   - **Evidence:** `git`, `gh`, `curl` from `/Users/raro42/projects/pos2` after `./scripts/git-sync-development.sh` and `git fetch origin` (not `docker logs`; out of scope).

2. **Environment**  
   - **Compose / local app:** N/A.  
   - **Branch:** `development` after sync.  
   - **Remotes:** `origin/master` = `7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`, `origin/development` = `d649d8589e13468aed9db36acc0b48f665f9c627`.

3. **What was tested (from Testing instructions)**  
   - (1) `git rev-parse origin/master origin/development` and `git merge-base --is-ancestor origin/master origin/development`.  
   - (2) `gh run list --workflow "Deploy to amvara9" --branch master --limit 8`; `gh run view 24773000757 --json conclusion,status,updatedAt`.  
   - (3) Optional live check after green — N/A (no green **master** deploy).  
   - (4) Manual fallback — N/A.

4. **Results**

   | Criterion | Result | Evidence line |
   |---|---|---|
   | 1. Git: refs / lineage | **PASS** | SHAs above; `git merge-base --is-ancestor origin/master origin/development` → exit **0**. |
   | 2. GitHub Actions: **green** for latest **master** **Deploy to amvara9** | **FAIL** | `gh run list`: most recent **master** run **24773000757** (2026-04-22T10:18:20Z) **failure**; `gh run view 24773000757` → **`conclusion: failure`**, **`updatedAt`:** **2026-04-22T10:18:30Z**. No newer **success** on **master** in listed runs. |
   | 3. Optional after green | **N/A** | — |
   | 4. Manual fallback | **N/A** | — |
   | Sanity (HTTP) | **INFO** | `curl` → `https://satisfecho.de/api/health` **200**, `https://satisfecho.de/` **200**; does not prove CI deploy green. |

5. **Overall: FAIL** — Criterion **2** fails (Deploy to amvara9 not successful on GitHub for latest **master** deploy in scope).

6. **Product owner feedback**  
   **`origin/master`** remains fully contained in **`origin/development`** history, which is consistent with promotion plus continued **development** work. Public endpoints respond **200**, but **issue #195** still lacks a **green** **Deploy to amvara9** run—operators must fix **Actions** secrets (`MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN` per **`config/marketing-sites.json`**) and **re-run** or trigger a fresh **`master`** deploy before verification can **PASS**.

7. **URLs tested**  
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757`  
   2. `https://satisfecho.de/api/health`  
   3. `https://satisfecho.de/`

8. **Relevant log excerpts (last section)**  
   - `gh run list --workflow "Deploy to amvara9" --branch master --limit 8`: top row **24773000757** **completed** **failure** **2026-04-22T10:18:20Z**.  
   - `gh run view 24773000757 --repo satisfecho/pos --json conclusion` → **`"failure"`**.

## Test report (2026-04-27, tester session)

1. **Date/time (UTC) and log window**  
   - **Window:** 2026-04-27T06:45Z–2026-04-27T06:50Z.  
   - **Commands:** `git`, `gh`, `curl` on host from `/Users/raro42/projects/pos2` after `./scripts/git-sync-development.sh` and `git fetch origin` (not `docker logs` — not required by Testing instructions).

2. **Environment**  
   - **Compose / local app:** N/A.  
   - **Branch:** `development` (synced with `origin/development` before verification).  
   - **Remotes (after `git fetch origin`):** `origin/master` = `7a2c2bd59b2cfb6cbc6a55ac407993494b17256f`, `origin/development` = `83e228a4251ef1322b6a1046dca7d5175f97ff24`.  
   - **Evidence:** authenticated `gh` to `satisfecho/pos` Actions.

3. **What was tested (from Testing instructions)**  
   - (1) `git rev-parse origin/master origin/development` and `git merge-base --is-ancestor origin/master origin/development`.  
   - (2) `gh run list --workflow "Deploy to amvara9" --branch master --limit 8`; `gh run view 24773000757 --json conclusion,status,updatedAt`.  
   - (3) Optional live check after green — **N/A** (no green **master** deploy).  
   - (4) Manual fallback — **N/A** (not run).

4. **Results**

   | Criterion | Result | Evidence line |
   |---|---|---|
   | 1. Git: refs / lineage | **PASS** | SHAs above; `git merge-base --is-ancestor origin/master origin/development` → exit **0**. |
   | 2. GitHub Actions: **green** for latest **`master`** **Deploy to amvara9** | **FAIL** | `gh run list`: latest **master** run **24773000757** (2026-04-22T10:18:20Z) **failure**; `gh run view 24773000757` → **`conclusion: failure`**, **`updatedAt`:** **2026-04-22T10:18:30Z**. No newer **success** on **master** in the listed runs. |
   | 3. Optional after green | **N/A** | — |
   | 4. Manual fallback | **N/A** | — |
   | Sanity (HTTP) | **INFO** | `curl -s -o /dev/null -w "%{http_code}"` → `https://satisfecho.de/api/health` **200**, `https://satisfecho.de/` **200**; does not prove CI deploy green. |

5. **Overall: FAIL** — Criterion **2** fails (Deploy to amvara9 not successful on GitHub for the latest **`master`** deploy in scope).

6. **Product owner feedback**  
   **`origin/master`** is still an ancestor of **`origin/development`**, but the **Deploy to amvara9** workflow for **`master`** has not produced a **success** after run **24773000757**. Public URLs return **200**, which does not satisfy the issue’s requirement to confirm a **green** deployment on GitHub. Configure **Actions** secrets (**`MARKETING_ARTIFACT_TOKEN`** / **`GH_TOKEN`** per **`config/marketing-sites.json`**) and re-run or re-trigger **`master`** deploy, then return the task as **UNTESTED-** for another pass.

7. **URLs tested**  
   1. `https://github.com/satisfecho/pos/actions/runs/24773000757`  
   2. `https://satisfecho.de/api/health`  
   3. `https://satisfecho.de/`

8. **Relevant log excerpts (last section)**  
   - `gh run list --repo satisfecho/pos --workflow "Deploy to amvara9" --branch master --limit 8` — first row: **24773000757** **completed** **failure** **2026-04-22T10:18:20Z**.  
   - `gh run view 24773000757 --repo satisfecho/pos --json conclusion` → **`"failure"`**.

**Loop protection:** Same underlying blocker as prior reports (failed run **24773000757** unchanged); this pass is a scheduled re-check, not a fourth automated retry of one broken change.

## Testing instructions

(Required for **UNTESTED-** handoff: keep this as the last section. Historical test reports and duplicate blocks appear above; follow these four steps for the next verification run.)

1. **Git:** Confirm **`origin/master`** and **`origin/development`** are at the expected points for the promotion under test:  
   `git fetch origin && git rev-parse origin/master origin/development`  
2. **GitHub Actions:** Open **Actions** → **Deploy to amvara9** and check the latest **`master`** run (e.g. **`24773000757`**, or newer after a re-run). After **Actions** secrets (`MARKETING_ARTIFACT_TOKEN` / `GH_TOKEN` with PAT scope from **`config/marketing-sites.json`**) are configured, **Re-run failed jobs** or trigger a new deploy from **`master`**. Expect **green** through **Fetch marketing site artifacts**, **Set up SSH**, **Build and restart stack on amvara9**, and **Smoke test**.  
3. **Optional live check:** After a **green** deploy, verify **`https://satisfecho.de/`** (or documented prod URL) and API health per **`docs/0001-ci-cd-amvara9.md`** / smoke output.  
4. **Manual fallback:** If CI cannot be fixed immediately, an operator may run **`scripts/deploy-amvara9.sh`** on the server per **`README.md`** / **`AGENTS.md`** (marketing bundles may still be required for full parity with CI).  

