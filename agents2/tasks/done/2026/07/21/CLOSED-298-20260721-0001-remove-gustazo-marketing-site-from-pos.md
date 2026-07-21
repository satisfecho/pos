---
## Closing summary (TOP)

- **What happened:** POS-side Gustazo removal is complete on **`development`** @ **`5787c385`** (manifest `excludedSlugs`, tree/workflow/sync cleanup). Tester criteria **1–5 PASS**; criterion **#6** (production `/gustazo/` gone) **FAIL** because **`5787c385` is not on `origin/master`** and latest **Deploy to amvara9** predates this task (run **29359569253**, 2026-07-14).
- **Why not UNTESTED:** Deploy-blocker per **`012-feature-coder-handoff.md`** / **`docs/agent-loop.md`** — production verification cannot pass until **`development` → `master`** + green deploy.
- **Why archived:** Second handoff pass with unchanged git/Actions/issue state; archive to stop no-op **WIP → handoff** cycling. Not a code failure.
- **Resume verification:** After promote + green **Deploy to amvara9**, recreate **`UNTESTED-298-…`** (or re-test instruction **#6** only): `curl -sI https://www.satisfecho.de/gustazo/` must not serve the Gustazo marketing SPA; spot-check another slug (e.g. `/wimpi/`).
- **Closed at (UTC):** 2026-07-21 04:08 UTC
---

# Remove Gustazo marketing site from POS

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/298
- **298**

## Problem / goal

Stop serving and syncing the Gustazo marketing SPA from the POS repo so production (amvara9 / satisfecho.de) no longer fetches or deploys that bundle. Live path today: `https://www.satisfecho.de/gustazo/`. Source repo `satisfecho/040_gustazo` (artifact `gustazo-dist`) stays as an org concern; this task is **POS-side removal only**.

Marketing integration context: `config/marketing-sites.json`, `front/sites/<slug>/`, `scripts/sync-all-marketing-sites.sh`, agent **005** marketing repos reviewer (`docs/agent-loop.md`), deploy workflow Gustazo-specific checks/env.

## High-level instructions for coder

- Remove the `gustazo` entry from `config/marketing-sites.json`.
- Delete `front/sites/gustazo/` (placeholder / synced bundle tree) so build/deploy no longer depends on it.
- Clean Gustazo-only deploy smoke, env vars, and docs that treat Gustazo as a required marketing site (`GUSTAZO_*` in `.github/workflows/deploy-amvara9.yml`, `config.env.example`, legacy wrappers such as `fetch-gustazo-artifact.sh` / `sync-gustazo-for-dev.sh` if unused after generic marketing sync).
- Keep other marketing slugs in the manifest working (sync + nginx locations).
- Do **not** delete GitHub repo `satisfecho/040_gustazo` or Gustazo restaurant/tenant POS data unless product explicitly asks later.
- After deploy (or document verification steps): confirm `/gustazo/` is gone or returns the expected non-marketing response (404 / redirect), and remaining marketing sites still sync.
- Append **Testing instructions** when implementation is complete.

## Acceptance (from issue)

- [x] No `gustazo` entry in `config/marketing-sites.json`
- [x] No `front/sites/gustazo/` content required for build/deploy
- [ ] Deploy to amvara9 succeeds without fetching `gustazo-dist` (verify after merge to `master` / deploy)
- [x] Other marketing sites in the manifest still deploy correctly (manifest intact; sync script unchanged for remaining slugs)
- [ ] Production no longer serves the Gustazo marketing SPA at `/gustazo/` (verify after deploy)

## Implementation notes (2026-07-21)

- Removed `gustazo` from `config/marketing-sites.json` `sites[]`; added `excludedSlugs: ["gustazo"]` so sibling auto-discovery cannot re-add it.
- Deleted `front/sites/gustazo/` and legacy wrappers `scripts/fetch-gustazo-artifact.sh`, `scripts/sync-gustazo-for-dev.sh`.
- Deploy workflow: dropped `GUSTAZO_*` job env and `/gustazo/` smoke; prefer `MARKETING_ARTIFACT_TOKEN` with legacy `GUSTAZO_ARTIFACT_TOKEN` fallback; marketing `rsync` uses `--delete`.
- Cleaned Gustazo-specific comments/env in `config.env.example`, `docker-compose.yml`, `docker-compose.dev.yml`, `front/Dockerfile`, sync/fetch scripts; updated 005 reviewer placeholder reference.
- CHANGELOG `[Unreleased]` entry for #298.

## Handoff log

- **Handoff (`012-feature-coder-handoff.md`, 2026-07-21 04:08 UTC, Cursor):** `./scripts/git-sync-development.sh` (OK). **#298** **OPEN**, label **`agent:wip`**. State unchanged vs prior handoff: **`5787c385` still not on `origin/master`**; amvara9 deploy still predates task; prod `/gustazo/` still live. **Archive WIP → CLOSED** (deploy-blocker) — **no** `WIP-298-…` → `UNTESTED-*`; **no** `gh issue edit 298 --add-label "agent:untested"`. Resume after promotion + green deploy.

- **Handoff (`012-feature-coder-handoff.md`, 2026-07-21 00:19 UTC, Cursor):** `./scripts/git-sync-development.sh` (OK). **#298** **OPEN**, label **`agent:wip`**. POS-side removal is on **`development`** @ **`5787c385`** (manifest/`excludedSlugs`, tree cleanup, workflow, sync). **`5787c385` not on `origin/master`**; latest amvara9 deploy predates this task; production still serves Gustazo SPA (tester criterion **#6** **FAIL**). **Remain WIP** — **no** `WIP-298-…` → `UNTESTED-*`; **no** `gh issue edit 298 --add-label "agent:untested"`. Deploy-blocker per **012** / **`docs/agent-loop.md`**: feature coder must promote **`development` → `master`** + green **Deploy to amvara9**, then re-hand off (or archive per Deploy-blocker archive if cycling continues).

## Testing instructions

1. **Manifest:** `jq -e '.sites | map(.slug) | index("gustazo") == null' config/marketing-sites.json` and `jq -e '.excludedSlugs | index("gustazo") != null' config/marketing-sites.json` both succeed.
2. **Tree:** `test ! -e front/sites/gustazo` and `test ! -e scripts/fetch-gustazo-artifact.sh` and `test ! -e scripts/sync-gustazo-for-dev.sh`.
3. **Local sync:** From repo root, `SYNC_MARKETING_ON_START=1 bash scripts/sync-all-marketing-sites.sh` (token optional). Confirm log may skip/exclude gustazo and **`front/sites/gustazo` is not recreated**. Other manifest placeholders remain under `front/sites/<slug>/`.
4. **App smoke:** `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4202/` → `200`. Optional: `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front`.
5. **Deploy workflow:** In `.github/workflows/deploy-amvara9.yml`, confirm no `/gustazo/` smoke block and no `GUSTAZO_REPO` / `GUSTAZO_BRANCH` / `GUSTAZO_ARTIFACT_NAME` job env.
6. **After promote to `master` + Deploy to amvara9:** `curl -sI https://www.satisfecho.de/gustazo/` should **not** return a marketing SPA (expect **404** or Angular app shell / non-Gustazo HTML — must not contain Gustazo marketing title or prior bundle assets). Spot-check another slug still works, e.g. `curl -sf -o /dev/null -w "%{http_code}\n" https://www.satisfecho.de/wimpi/` → `200` and HTML must not contain `bundle not loaded`.

## Test report

1. **Date/time (UTC):** 2026-07-21 00:08:50 – 00:11:24 UTC. Log window: `docker logs --since 15m` for pos-front / pos-back.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` (local working tree includes #298 changes; **not committed / not on `origin/master`**). Last amvara9 deploy: workflow run [29359569253](https://github.com/satisfecho/pos/actions/runs/29359569253) (2026-07-14, success, release 2.1.16) — predates this task.
3. **What was tested:** Testing instructions 1–6 (manifest, tree, local sync, app smoke, deploy workflow YAML, production `/gustazo/` + `/wimpi/`).
4. **Results:**
   - **1 Manifest:** **PASS** — `jq` both checks exit 0; `sites[]` has no `gustazo`; `excludedSlugs` includes `gustazo`.
   - **2 Tree:** **PASS** — `front/sites/gustazo`, `scripts/fetch-gustazo-artifact.sh`, `scripts/sync-gustazo-for-dev.sh` all absent.
   - **3 Local sync:** **PASS** — `SYNC_MARKETING_ON_START=1 bash scripts/sync-all-marketing-sites.sh` completed; log had no `gustazo` mentions; `front/sites/gustazo` not recreated; other slugs present (amigo-kebab, antillana, …, wimpi).
   - **4 App smoke:** **PASS** — `curl http://127.0.0.1:4202/` → `200`. Optional landing-version: failed unrelated semver mismatch (`2.1.8` vs package `2.1.17`); not treated as #298 regression.
   - **5 Deploy workflow:** **PASS** — no `/gustazo/` smoke; no `GUSTAZO_REPO` / `GUSTAZO_BRANCH` / `GUSTAZO_ARTIFACT_NAME`. Legacy `secrets.GUSTAZO_ARTIFACT_TOKEN` fallback only (as designed).
   - **6 Production after deploy:** **FAIL** — `https://www.satisfecho.de/gustazo/` still HTTP 200 with title `Gustazo — Bistro · Wine Lounge · Pizzería | El Masnou` (marketing SPA still live; `last-modified: Tue, 14 Jul 2026`). `/wimpi/` → 200, title `Wimpi Street Food`, no `bundle not loaded`. Deploy of #298 never ran: changes still local/unmerged to `master`.
5. **Overall:** **FAIL** — failed criterion: **6** (production still serves Gustazo marketing SPA; #298 not promoted/deployed).
6. **Product owner feedback:** POS-side removal looks correct locally (manifest exclusion, tree cleanup, sync does not recreate gustazo, workflow cleaned). Production still serves the old bundle until this lands on `master` and Deploy to amvara9 succeeds. Re-test instruction 6 after commit → push `development` → promote → green deploy.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/`
   2. `http://127.0.0.1:4202/` (landing-version Puppeteer)
   3. `https://www.satisfecho.de/gustazo/`
   4. `https://www.satisfecho.de/wimpi/`
8. **Relevant log excerpts:**
   - Sync: `[marketing-sync] done.` / `PASS: gustazo not recreated` / `(no gustazo mentions in log)`.
   - Prod: `HTTP/2 200` + `<title>Gustazo — Bistro · Wine Lounge · Pizzería | El Masnou</title>`.
   - pos-front / pos-back (15m): no errors tied to this change.
