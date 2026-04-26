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

1. **Date/time (UTC)** and log window: **2026-04-26 15:35:28 UTC**; verification used repo **`git fetch`** / **`gh run`** / **`curl`**; no new **`docker logs`** for this task (CI/deploy evidence from GitHub Actions, not local stack for full pipeline).

2. **Environment:** Repo **pos**; **`./scripts/git-sync-development.sh`** run before edits; **development** at **`d527dae7`**; **`gh`** to **`satisfecho/pos`**. **BASE_URL (optional smoke):** `https://satisfecho.de`.

3. **What was tested:** “What to verify” from **Testing instructions** (git tips, **Deploy to amvara9** run **24773000757** / latest master deploy, optional live HTTP).

4. **Results:**
   - **Git (master vs development at 7a2c2bd or same later tip):** **PARTIAL** — `git rev-parse origin/master origin/development` → **master** = **`7a2c2bd`**, **development** = **`d527dae7`** (development has **additional commits** after promotion, including task handoff; tips are not identical). **Master** is at the promoted **7a2c2bd** as in the implementation summary. Evidence: one line each from `rev-parse` above in tester notes.
   - **GitHub Actions (Deploy to amvara9) green through marketing fetch + deploy + smoke:** **FAIL** — run **`https://github.com/satisfecho/pos/actions/runs/24773000757`** (ID **24773000757**) is still **failure**; job fails at **Fetch marketing site artifacts**; subsequent steps (SSH, **Build and restart stack on amvara9**, **Smoke test**) **did not run**. `gh run list` for this workflow on **master** shows no newer **success** after that failed push; latest relevant rows remain **failure** (2026-04-22).
   - **Optional live check (after green deploy):** **N/A** — not applied as an acceptance gate because deploy did not succeed in CI; separate smoke: `curl -sS -o /dev/null -w "%{http_code}\n" https://satisfecho.de/` → **200**; `https://satisfecho.de/api/health` → **200**, body `{"status":"ok"}` (proves current prod responds; does **not** prove **7a2c2bd** is deployed via this workflow).
   - **Manual deploy fallback on server:** Not executed by this tester; still blocked on marketing bundle/secret parity per implementation summary if CI is the source of truth.

5. **Overall:** **FAIL** (failed: **full GitHub deploy pipeline** for the **master** push; optional post-green live check not satisfied).

6. **Product owner feedback:** The push to **master** at **7a2c2bd** and the failed workflow match the task’s own implementation note. **Production** still **answers HTTP 200** on the landing page and **API health**, but **amvara9 deploy via GitHub Actions** is **not verified** because the run failed before server steps. **Next:** add/fix **Actions** secrets (PAT for marketing artifact repos as documented), then **re-run** run **24773000757** or trigger a new **master** deploy and re-test for **green**.

7. **URLs tested (numbered list):** **1** `https://satisfecho.de/` (HTTP status only) **2** `https://satisfecho.de/api/health` (JSON body) **3** `https://github.com/satisfecho/pos/actions/runs/24773000757` (run status: failure) **4** (CLI) `origin/master`, `origin/development` via `git` — not browser.

8. **Relevant log excerpts (last section):** From **`gh run view 24773000757`**: `X master Deploy to amvara9` · `X deploy` · `X Fetch marketing site artifacts (curl + GitHub API)`; job completed **failure** (~10s). `curl` prod: **200** / **200** for URLs (1)–(2) above; response snippet `{"status":"ok"}` for health.
