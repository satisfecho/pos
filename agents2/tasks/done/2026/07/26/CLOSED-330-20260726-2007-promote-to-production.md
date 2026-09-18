---
## Closing summary (TOP)

- **What happened:** Production promotion for today’s tested batch: merge `development` → `master`, deploy to amvara9, and publish release **v2.1.138**.
- **What was done:** Merged at **f39127d7** (no new semver bump; `[Unreleased]` was meta-only), pushed `master`, published GitHub release **v2.1.138**, Deploy to amvara9 run **30218369187** succeeded; prod shows **2.1.138 f39127d7**.
- **What was tested:** Tester **PASS** — release notes, `origin/master` tip, GHA deploy success, production `/` + `/api/health` 200, landing version/hash, amvara9 HEAD and package version all match.
- **Why closed:** All promote/smoke criteria passed; production is live on **2.1.138**.
- **Closed at (UTC):** 2026-07-26 20:14
---

# Promote to production

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/330
- **330**

## Problem / goal

Promote today’s tested work from **`development`** to **production** (amvara9 / satisfecho.de): merge **`development` → `master`**, push **`master`** (triggers Deploy to amvara9), **bump version / cut a release** if `[Unreleased]` has material items, and publish a GitHub release when appropriate.

At planning time (**2026-07-26T20:07Z**): **`front/package.json`** is **2.1.138**; latest changelog cut **`## [2.1.138] - 2026-07-26`**; **`origin/development`** @ **`15e283d9`** is **~60 commits** ahead of **`origin/master`** @ **`f2c58558`**. Issue body asks that all changes from today be promoted and a release created. Explicit production request under **`.cursor/rules/git-development-branch-workflow.mdc`**.

See **`docs/0001-ci-cd-amvara9.md`**, **`.cursor/rules/commit-changelog-version.mdc`**. Prior similar work: **#311**, **#295**.

## High-level instructions for coder

- Sync **`development`** (`./scripts/git-sync-development.sh`). Confirm local smoke: landing HTTP **200** on HAProxy port; `docker logs --since 10m pos-front` — no standing Angular build failures (mid-day loyalty/front heuristic noise from earlier today is already resolved — **CLOSED-327** / live loyalty **200**).
- **Changelog / version:** Review **`CHANGELOG.md` `[Unreleased]`**. If it has material user-facing items since **2.1.138**, cut a new semver section, bump **`front/package.json`** + lockfile, run **`node front/scripts/get-commit-hash.js`**, and commit **`commit-hash.ts`** with the bump on **`development`**. If nothing unreleased remains, promote the latest cut already on **`development`** (currently **2.1.138**) — do not invent empty churn bumps.
- Merge **`development` → `master`** (fast-forward or merge commit) and **`git push origin master`**. Do not force-push.
- Monitor **Deploy to amvara9** (`.github/workflows/deploy-amvara9.yml`). If GHA fails, fall back per **`docs/0001-ci-cd-amvara9.md`** (manual `the production host` + **`scripts/deploy-amvara9.sh`**); do not claim success until production is updated.
- Publish a GitHub release tag matching the shipped semver with notes from the matching **`CHANGELOG.md`** section(s) for today’s promoted cuts if a release is missing.
- Post-deploy smoke on **https://www.satisfecho.de**: `/` and `/api/health` **200**; landing **app-version** / footer semver + short hash match the promoted commit.
- This is **release/ops**, not feature coding — fix only blockers that prevent a safe promote; append **Testing instructions** with merge SHA, workflow run URL (or manual deploy evidence), release URL, and smoke results.

## Implementation notes (coder)

- Synced `development`; local landing HTTP **200** on `:4202`; no standing Angular build failures in front logs.
- No version bump: `[Unreleased]` only had agents2 archive/meta notes (features already cut in **2.1.133–2.1.138**); promoted existing cut **2.1.138** (`15e283d9` tip at merge).
- Merged `development` → `master` with merge commit **`f39127d7`** and pushed `master` (no force).
- GitHub release **[v2.1.138](https://github.com/satisfecho/pos/releases/tag/v2.1.138)** published (target `master`; notes include 2.1.138 + highlights since 2.1.97 / #312).
- GHA **Deploy to amvara9** run [30218369187](https://github.com/satisfecho/pos/actions/runs/30218369187) **success** (~2m50s) — marketing artifact fetch, build/restart, and workflow smoke all green (no SSH fallback needed).
- Post-deploy: `/` **200**, `/api/health` **200** `{"status":"ok"}`, landing meta/footer **`2.1.138 f39127d7`**; amvara9 `git rev-parse --short HEAD` → **`f39127d7`**, `front/package.json` → **2.1.138**.

## Testing instructions

1. Confirm **https://github.com/satisfecho/pos/releases/tag/v2.1.138** exists and notes match changelog **2.1.138** (plus highlights since 2.1.97).
2. Confirm `origin/master` tip is merge **`f39127d7`** (`Merge development: release through 2.1.138…`).
3. Confirm Deploy run **https://github.com/satisfecho/pos/actions/runs/30218369187** conclusion **success** (Fetch marketing → build → smoke all green).
4. Production smoke (already run by coder; re-check):
   - `curl -sS -o /dev/null -w "%{http_code}\n" https://www.satisfecho.de/` → **200**
   - `curl -sS https://www.satisfecho.de/api/health` → `{"status":"ok"}` **200**
   - Landing meta `app-version` content **`2.1.138`**; footer short hash **`f39127d7`**
5. On amvara9: `cd the deploy directory && git rev-parse --short HEAD` → **`f39127d7`**; `front/package.json` version **2.1.138**.

## Test report

1. **Date/time (UTC):** start **2026-07-26T20:13:23Z**, end **2026-07-26T20:13:54Z**. Log window: amvara9 containers ~**2026-07-26T20:13:40Z–20:13:53Z**.
2. **Environment:** production **https://www.satisfecho.de** (amvara9); local branch **`development`** @ **`7bc1bbfe`** (synced before test). Deploy readiness: GHA run **30218369187** already **success** (updatedAt 2026-07-26T20:12:05Z) before re-smoke — no sleep-based wait.
3. **What was tested:** GitHub release **v2.1.138** notes vs CHANGELOG; `origin/master` tip **f39127d7**; Deploy to amvara9 run success; production `/` + `/api/health`; landing **app-version** + footer short hash; amvara9 HEAD + `front/package.json` version.
4. **Results:**
   - Release **v2.1.138** exists; body matches CHANGELOG **2.1.138** Fixed/Changed (loyalty SlowAPI) and includes highlights since 2.1.97 / #312 — **PASS** (`gh release view`; URL https://github.com/satisfecho/pos/releases/tag/v2.1.138).
   - `origin/master` tip **f39127d7** — **PASS** (`git fetch` + `git log -1 --oneline origin/master` → `Merge development: release through 2.1.138…`).
   - Deploy run **30218369187** conclusion **success** — **PASS** (`gh run view` status completed / conclusion success).
   - `GET https://www.satisfecho.de/` → **200** — **PASS** (`curl` HTTP code).
   - `GET https://www.satisfecho.de/api/health` → `{"status":"ok"}` **200** — **PASS**.
   - Landing meta `app-version` **2.1.138**; footer **`2.1.138 f39127d7`** — **PASS** (meta via curl; footer via `BASE_URL=https://www.satisfecho.de npm run test:landing-version` version element text).
   - amvara9 `git rev-parse --short HEAD` → **f39127d7**; `front/package.json` → **2.1.138** — **PASS** (`the production host`).
5. **Overall:** **PASS**
6. **Product owner feedback:** Production is on **2.1.138** at merge **f39127d7** with a published GitHub release and a green Deploy to amvara9 run. Public landing and health look healthy; today’s batch (loyalty SlowAPI fix through TSE / split bill / promos and related cuts) is live. Optional Puppeteer login after landing version check got **401** (credentials/env), outside this task’s promote smoke criteria.
7. **URLs tested:**
   1. https://github.com/satisfecho/pos/releases/tag/v2.1.138
   2. https://github.com/satisfecho/pos/actions/runs/30218369187
   3. https://www.satisfecho.de/
   4. https://www.satisfecho.de/api/health
   5. https://www.satisfecho.de/login?tenant=1 (incidental from landing-version script after footer check)
8. **Relevant log excerpts (last section):**
   - amvara9 `pos-haproxy`: `GET / HTTP/1.1` **200**; `GET …/api/health` path via back health **200** in same window.
   - amvara9 `pos-front`: `GET /` **200** (landing assets + Puppeteer).
   - amvara9 `pos-back`: `GET /health` **200 OK** (repeated); incidental `POST /token?tenant_id=1` **401** from optional login step — not a promote criterion.

