---
## Closing summary (TOP)

- **What happened:** **Deploy to amvara9** failed at SSH because the workflow still used port **22** after amvara9 moved SSH to **60022**; marketing rsync and post-deploy smoke were skipped.
- **What was done:** Added job-level **`DEPLOY_SSH_PORT`** (default **60022**) and **`-p $DEPLOY_SSH_PORT`** on all **`ssh-keyscan`**, **`ssh`**, and **`rsync -e ssh`** steps in **`.github/workflows/deploy-amvara9.yml`**; updated **`docs/0001-ci-cd-amvara9.md`**. Fix landed on **`master`** via **#295** promotion (**`59bd1dec`**, release **2.1.15**).
- **What was tested:** GHA run **29255611539** — **success** (SSH checkout, marketing rsync, deploy, smoke). Production: landing **`200`**, **`/api/health`** **`200`**, **`app-version`** **2.1.15**; **`https://www.satisfecho.de/bosskebabypizzeria/`** serves the SPA (no placeholder).
- **Why closed:** **#294** closed; deploy-blocker resolved after **`development` → `master`** merge. Follow-up promotion tracking continues on **#295** (**`UNTESTED-295-…`**).
- **Closed at (UTC):** 2026-07-13 13:53
---

# Fix GHA deploy: use SSH port 60022 for amvara9 (was 22)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/294
- **294**

## Problem / goal

The **Deploy to amvara9** GitHub Actions workflow fails at the SSH step with `ssh: connect to host 167.235.138.59 port 22: Connection refused` (example run: https://github.com/satisfecho/pos/actions/runs/29200152615). On the production server, SSH was moved from port **22** to **60022**; manual access works with `Port 60022` in `~/.ssh/config`, but **`.github/workflows/deploy-amvara9.yml`** still uses the default port.

Because SSH never connects, later steps are skipped: marketing-site rsync, `scripts/deploy-amvara9.sh`, and post-deploy smoke. Marketing bundles may be fetched in CI but never land on the server — e.g. **https://satisfecho.de/bosskebabypizzeria/** still shows the placeholder (“Static files are missing”).

## High-level instructions for coder

- Read **`docs/0001-ci-cd-amvara9.md`** and inspect **`.github/workflows/deploy-amvara9.yml`** — every **`ssh`**, **`ssh-keyscan`**, and **`rsync -e "ssh …"`** invocation must target port **60022** (not 22).
- Prefer a single workflow-level env such as **`DEPLOY_SSH_PORT: 60022`** (or optional secret **`DEPLOY_SSH_PORT`** defaulting to 60022) and pass **`-p $DEPLOY_SSH_PORT`** consistently to all SSH/rsync commands, including the **Set up SSH** `ssh-keyscan` step.
- Do **not** change application code under **`back/`** or **`front/`** unless smoke tests reveal a separate defect; this is CI/deploy wiring only.
- After the workflow change, verify locally that the YAML is valid and that no SSH call still omits the port (grep the workflow for bare `ssh` without `-p`).
- Trigger or document a **`workflow_dispatch`** run on **`master`** (or merge a minimal fix to **`master`** per **`.cursor/rules/git-development-branch-workflow.mdc`**) and confirm the run passes: checkout on server, marketing rsync, **`deploy-amvara9.sh`**, smoke test (landing, app-version, **`/api/health`**).
- Confirm at least one marketing site under **`https://www.satisfecho.de/<slug>/`** no longer serves the placeholder after a green deploy.
- Update **`docs/0001-ci-cd-amvara9.md`** (optional secrets table) if the port is configurable via secret/variable.
- Append **Testing instructions** when the workflow run is green and production smoke passes.

## Implementation (feature coder)

- Added job-level **`DEPLOY_SSH_PORT`** env (default **`60022`**, overridable via repository Variable **`DEPLOY_SSH_PORT`**).
- All **`ssh-keyscan`**, **`ssh`**, and **`rsync -e "ssh …"`** invocations in **`.github/workflows/deploy-amvara9.yml`** now pass **`-p $DEPLOY_SSH_PORT`**.
- Updated **`docs/0001-ci-cd-amvara9.md`** optional secrets/variables table and workflow steps summary.
- Local YAML parse check passed (`python3 -c "import yaml; yaml.safe_load(...)"`).

## Handoff log

- **Handoff (`012-feature-coder-handoff.md`, 2026-07-13, user `012` pass — Cursor):** `./scripts/git-sync-development.sh` (OK). **`origin/development`** @ **`2dd5cb6a`**: workflow + docs committed (**`DEPLOY_SSH_PORT`** / **`-p`** on all SSH/rsync paths). Resolves embedded **Test report** “uncommitted” **FAIL**. **`origin/master`** @ **`0923c654`** still lacks the fix; latest **Deploy to amvara9** run **`29200152615`** still **failure** (port 22 `Connection refused`); **`https://www.satisfecho.de/bosskebabypizzeria/`** still placeholder. **`gh issue view 294`**: **OPEN**, **`agent:wip`**. Per **012-feature-coder-handoff.md** deploy-blocker: criterion **(2)** **FAIL** — **no** **`WIP-294-…` → `UNTESTED-*`**; **no** `gh issue edit 294 --add-label "agent:untested"`. Feature coder / committer must merge **`development` → `master`** and confirm green deploy before handoff.
- **Handoff (`012-feature-coder-handoff.md`, 2026-07-13, Cursor):** `./scripts/git-sync-development.sh` (OK). **#294** **CLOSED**; fix on **`origin/master`** @ **`59bd1dec`**; **Deploy to amvara9** **`29255611539`** **success**; production smoke **PASS** (landing **`200`**, health **`200`**, **`app-version`** **2.1.15**, marketing **bosskebabypizzeria** no placeholder). Successor **#295** → **`UNTESTED-295-…`**. Per **012** closed-issue rule: archive **`WIP-294-…` → `CLOSED-294-…`** → **`done/2026/07/13/`** — **not** **`UNTESTED`**, **no** `agent:untested` on **#294**.

## Testing instructions

1. **Merge to `master`** (deploy workflow only runs on **`master`** push or **`workflow_dispatch`**).
2. **Trigger deploy:** push to **`master`** or run **Actions → Deploy to amvara9 → Run workflow** on **`master`**.
3. **Verify GHA job** (all steps green):
   - Set up SSH (no `Connection refused` on port 22)
   - Checkout latest code on amvara9
   - Sync marketing sites to server
   - Build and restart stack on amvara9
   - Smoke test (landing, version, API health)
4. **Production smoke (manual):**
   ```bash
   curl -sf -o /dev/null -w "%{http_code}\n" https://www.satisfecho.de/
   curl -sf -o /dev/null -w "%{http_code}\n" https://www.satisfecho.de/api/health
   curl -sfL "https://www.satisfecho.de/bosskebabypizzeria/" | head -c 500
   ```
   Expect HTTP **200** for landing and health; marketing page should **not** contain “Static files are missing” / placeholder title.
5. **Optional:** `cd front && BASE_URL=https://www.satisfecho.de HEADLESS=1 npm run test:landing-version`

**Note:** Tester must confirm a green **`master`** workflow run before closing; this fix is CI-only and was not exercised against live GHA from **`development`**.

---

## Test report

**Date/time (UTC):** 2026-07-13 09:32–09:33 UTC  
**Log window:** N/A — production checks only (no local Docker compose for this CI/deploy task).

### Environment

- **Branch checked:** `development` (synced with `origin/development`); deploy workflow runs from **`master`** only.
- **BASE_URL:** `https://www.satisfecho.de`
- **Compose:** N/A — CI/deploy wiring verification.

### What was tested

Per **Testing instructions**: green `deploy-amvara9` on `master`, production HTTP smoke, marketing bundle no longer placeholder, optional landing-version Puppeteer.

### Results

| Criterion | Result | Evidence |
|-----------|--------|----------|
| Fix committed and on `master` | **FAIL** | `git show master:.github/workflows/deploy-amvara9.yml` still has `ssh-keyscan` / `ssh` **without** `-p`; `DEPLOY_SSH_PORT` absent. Local working tree has the fix but **uncommitted** (`git status`: modified `.github/workflows/deploy-amvara9.yml`, `docs/0001-ci-cd-amvara9.md`). |
| Green GHA `deploy-amvara9` on `master` | **FAIL** | Latest run https://github.com/satisfecho/pos/actions/runs/29200152615 (2026-07-12, `master` @ `0923c654`) — **failure** at “Checkout latest code on amvara9”: `ssh: connect to host 167.235.138.59 port 22: Connection refused`. No newer successful run after the port fix. |
| Local workflow YAML valid | **PASS** | `python3 -c "import yaml; yaml.safe_load(...)"` on working-tree file → `YAML OK`. All `ssh` / `ssh-keyscan` / `rsync -e ssh` use `-p $DEPLOY_SSH_PORT` in working tree. |
| Production landing HTTP 200 | **PASS** | `curl -sf -o /dev/null -w "%{http_code}" https://www.satisfecho.de/` → `200`. |
| Production `/api/health` HTTP 200 | **PASS** | `curl` → `200`. |
| Marketing `bosskebabypizzeria` not placeholder | **FAIL** | `curl -sfL https://www.satisfecho.de/bosskebabypizzeria/` → title `Boss Kebab y Pizzeria — bundle not loaded`, body contains “Static files are m”. Deploy/rsync never completed since SSH failure. |
| Optional `test:landing-version` | **PARTIAL** | Landing + version meta **PASS** (`2.1.14`, hash `0923c654`). Login step **FAIL** (401, credentials) — out of scope for SSH port fix. |

### Overall

**FAIL** — failed criteria: fix not on `master`, no green deploy run, marketing placeholder still served.

### Product owner feedback

The workflow edit in the working tree looks correct (single `DEPLOY_SSH_PORT` env, `-p` on every SSH/rsync path), but it was never committed, pushed, or merged to `master`, so GHA still connects on port 22 and production marketing bundles were not refreshed. Commit the workflow + doc changes on `development`, merge to `master` (production-urgent), confirm a green `deploy-amvara9` run, then re-queue for test.

### URLs tested

1. https://www.satisfecho.de/
2. https://www.satisfecho.de/api/health
3. https://www.satisfecho.de/bosskebabypizzeria/

### Relevant log excerpts

**GHA failed step (run 29200152615):**
```
ssh: connect to host 167.235.138.59 port 22: Connection refused
##[error]Process completed with exit code 255.
```

**Production marketing curl (2026-07-13 09:33 UTC):**
```
<title>Boss Kebab y Pizzeria — bundle not loaded</title>
...
Static files are m
```
