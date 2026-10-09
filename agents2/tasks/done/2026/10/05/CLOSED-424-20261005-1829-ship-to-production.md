---
## Closing summary (TOP)

- **What happened:** Human requested immediate ship to production (amvara9 / satisfecho.de) with diverged development/master trees.
- **What was done:** Merged master into development, promoted through **2.1.179** then CORS hotfix **2.1.180** to master tip **6eb40dc95**; Deploy to amvara9 run 37357259854 succeeded; releases v2.1.179 and v2.1.180 published.
- **What was tested:** Production landing and /api/health returned 200 with app-version 2.1.180; master tip, releases, and deploy run verified — overall PASS.
- **Why closed:** All ship/deploy criteria passed; production is on 2.1.180.
- **Closed at (UTC):** 2026-10-05 18:42
---

# Ship to Production (#424)

## Status
- **Implemented** — promoted to **master** and deploy green on amvara9. Shipped **2.1.179** then hotfix **2.1.180** (CORS rewrite). Production smoke OK.

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/424
- **424**

## Problem / goal
Human asks to **ship now** to production (amvara9 / satisfecho.de): promote tested work from **`development`** to **`master`** and confirm deploy. Explicit production request under **`.cursor/rules/git-development-branch-workflow.mdc`** and **`docs/agent-loop.md`** (urgent / deploy-now path).

At planning time (**2026-10-05** UTC): `origin/development` and `origin/master` are **diverged** (not a simple fast-forward). Confirm tip SHAs and ahead/behind counts before merge; do not force-push.

See **`docs/0001-ci-cd-amvara9.md`**, **`scripts/promote-development-to-master.sh`**, **`.cursor/rules/commit-changelog-version.mdc`**. Prior similar work: **#308**, **#277**.

## High-level instructions for coder
- Sync **`development`** (`./scripts/git-sync-development.sh`). Confirm local smoke: landing HTTP **200** on HAProxy port; `docker logs --since 10m pos-front` — no Angular build failures.
- **Changelog / version:** If `[Unreleased]` has material user-facing items, cut a new semver section, bump **`front/package.json`** + lockfile, run **`node front/scripts/get-commit-hash.js`**, and commit **`commit-hash.ts`** with the bump on **`development`**. Skip empty churn bumps.
- Because the issue says **ship now**, promote is allowed outside the daily 24h window: use **`AGENT_PROMOTE_FORCE=1 ./scripts/promote-development-to-master.sh`** (or equivalent merge **`development` → `master`** + **`git push origin master`**). Resolve divergence safely; **never** force-push **`master`**.
- Monitor **Deploy to amvara9**. If GHA fails, use documented manual deploy fallback; do not claim success until production reflects the promoted tip.
- Optional: publish a GitHub release matching the shipped semver from **`CHANGELOG.md`** if a version was cut.
- Post-deploy smoke on production: `/` and `/api/health` **200**; landing version/footer hash match the promoted commit.
- This is **release/ops**, not feature coding — fix only blockers that prevent a safe promote. Append **Testing instructions** with merge SHA, workflow/manual deploy evidence, and smoke results.
- Comment on issue **#424** when promote + deploy are done (or if blocked by divergence/conflicts).

## What was done
1. Merged **`origin/master`** into **`development`** (diverged trees; resolved `CHANGELOG.md` conflict). Pushed **`development`**.
2. First promote: **master** merge **ad47e6531** (version **2.1.179**). Release [v2.1.179](https://github.com/satisfecho/pos/releases/tag/v2.1.179). Deploy run [37356733992](https://github.com/satisfecho/pos/actions/runs/37356733992) **failed**: migrate/Settings refused `CORS_ORIGINS=*` under new `PRODUCTION=true`. App tier was briefly down.
3. Hotfix **2.1.180**: `scripts/deploy-amvara9.sh` rewrites empty/`*` CORS to `https://satisfecho.de,https://www.satisfecho.de` (override `PRODUCTION_CORS_ORIGINS`). Docs updated.
4. Second promote: **master** tip **6eb40dc95** (from development **f971c025f**). Release [v2.1.180](https://github.com/satisfecho/pos/releases/tag/v2.1.180). Deploy run [37357259854](https://github.com/satisfecho/pos/actions/runs/37357259854) **success**.

## Testing instructions

1. Confirm GitHub: **master** tip is **6eb40dc95** (or descendant containing **2.1.180** deploy CORS rewrite). Releases **v2.1.179** and **v2.1.180** exist.
2. Confirm Actions: **Deploy to amvara9** run **37357259854** conclusion **success** for headSha **6eb40dc959d060a1bfba83c92c08b90712a8ea6c**.
3. Production smoke:
   - `curl -s -o /dev/null -w "%{http_code}\n" https://www.satisfecho.de/` → **200**
   - `curl -s -o /dev/null -w "%{http_code}\n" https://www.satisfecho.de/api/health` → **200**
   - Landing meta `app-version` is **2.1.180** (`curl -s https://www.satisfecho.de/ | grep app-version`)
4. Optional: `BASE_URL=https://www.satisfecho.de npm run test:landing-version --prefix front`
5. Optional: confirm server `config.env` no longer has `CORS_ORIGINS=*` (deploy log should show the rewrite line if it was unsafe).

**Coder verification (2026-10-05 UTC):** steps 2–3 passed (landing/health **200**, meta **2.1.180**). Deploy green.

## Test report

1. **Date/time (UTC):** start **2026-10-05T18:41:12Z**, end **2026-10-05T18:41:45Z**. Log window N/A (production HTTP/GitHub verification; no local compose exercise).
2. **Environment:** production `https://www.satisfecho.de`; GitHub `origin/master` / Actions; tester on local branch **development** @ `2f4c5bdb5` (sync before rename). Compose files not used for this release smoke.
3. **What was tested:** master tip + releases v2.1.179/v2.1.180; Deploy to amvara9 run 37357259854; production `/`, `/api/health`, landing `app-version` meta; optional landing-version Puppeteer attempted.
4. **Results:**
   - Master tip **6eb40dc95** (`6eb40dc959d060a1bfba83c92c08b90712a8ea6c`) — **PASS** — `git rev-parse origin/master`; ancestor check yes; message “Merge development: release through 2.1.180”.
   - Releases **v2.1.179** and **v2.1.180** exist (not draft) — **PASS** — `gh release view`.
   - Deploy run **37357259854** conclusion **success**, headSha **6eb40dc959d060a1bfba83c92c08b90712a8ea6c** — **PASS** — `gh run view` (updatedAt 2026-10-05T18:39:37Z). Deploy readiness via Actions success + live health/version, not a fixed sleep.
   - `https://www.satisfecho.de/` HTTP **200** — **PASS** — curl.
   - `https://www.satisfecho.de/api/health` HTTP **200**, body `{"status":"ok"}` — **PASS** — curl.
   - Landing meta `app-version` **2.1.180** — **PASS** — `name="app-version" content="2.1.180"`.
   - Optional `test:landing-version` — **SKIP** — host has no npm; `docker exec pos-front` fails: Chrome path `/Applications/Google Chrome.app/...` missing in container. Curl meta already covers version.
   - Optional CORS `config.env` rewrite on server — **SKIP** — no SSH to host this run; deploy already green with rewrite in **2.1.180**.
5. **Overall:** **PASS**
6. **Product owner feedback:** Production is on **2.1.180** after the CORS hotfix promote. Landing and API health respond; GitHub master, releases, and Deploy to amvara9 match the shipped tip. Safe to treat #424 as shipped for closing.
7. **URLs tested:**
   1. https://www.satisfecho.de/
   2. https://www.satisfecho.de/api/health
   3. https://github.com/satisfecho/pos/actions/runs/37357259854
   4. https://github.com/satisfecho/pos/releases/tag/v2.1.179
   5. https://github.com/satisfecho/pos/releases/tag/v2.1.180
8. **Relevant log excerpts (last section):** N/A — no local container logs for this production/git verification. Evidence: `curl` HTTP codes, `{"status":"ok"}`, meta `content="2.1.180"`; `gh run view` conclusion=success headSha=6eb40dc959d060a1bfba83c92c08b90712a8ea6c.
