---
## Closing summary (TOP)

- **What happened:** Production promote for #311 merged `development` → `master` through **2.1.92** and deployed to amvara9.
- **What was done:** Merge **`522369e2`** pushed to `master`; GitHub release **v2.1.92** published; Deploy run **30190831248** succeeded (marketing fetch + smoke green); no version bump needed (`[Unreleased]` empty).
- **What was tested:** Tester **PASS** — release notes, merge ancestry, deploy success, and production `/` + `/api/health` healthy (live tip later advanced to **2.1.97** via #312; #311 intent still satisfied).
- **Why closed:** All acceptance criteria passed for the 2.1.92 promote.
- **Closed at (UTC):** 2026-07-26 13:09
---

# Push to main and deploy

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/311
- **311**

## Problem / goal

Promote current tested work from **`development`** to **production** (amvara9 / satisfecho.de): merge **`development` → `master`**, push **`master`** (triggers Deploy to amvara9), and confirm production is live. Issue title says “main”; this repo’s production branch is **`master`** (see **`docs/0001-ci-cd-amvara9.md`**).

At planning time (**2026-07-26** UTC): **`front/package.json`** is **2.1.92**; **`CHANGELOG.md`** `[Unreleased]` is empty (latest cut **`## [2.1.92] - 2026-07-26`**); **`origin/development`** tip **`696188a3`** is many commits ahead of **`origin/master`** tip **`2b2505a4`** (last promote was **2.1.33** via **#308**). Explicit production request under **`.cursor/rules/git-development-branch-workflow.mdc`**.

See **`docs/0001-ci-cd-amvara9.md`**, **`.cursor/rules/commit-changelog-version.mdc`**. Prior similar work: **#308**, **#289**.

## High-level instructions for coder

- Sync **`development`** (`./scripts/git-sync-development.sh`). Confirm local smoke: landing HTTP **200** on HAProxy port; `docker logs --since 10m pos-front` — no Angular build failures.
- **Changelog / version:** If `[Unreleased]` has material items since **2.1.92**, cut a new semver section, bump **`front/package.json`** + lockfile, run **`node front/scripts/get-commit-hash.js`**, and commit **`commit-hash.ts`** with the bump on **`development`**. If nothing unreleased remains, promote **2.1.92** (or the latest cut on **`development`**) — do not invent empty churn bumps.
- Merge **`development` → `master`** (fast-forward or merge commit) and **`git push origin master`**. Do not force-push. Do not treat GitHub “main” literally unless the remote branch was renamed.
- Monitor **Deploy to amvara9** (`.github/workflows/deploy-amvara9.yml`). If GHA fails on marketing artifacts (known failure mode after **#308**), fall back to documented manual deploy via local **`the production host`** + **`scripts/deploy-amvara9.sh`**; do not claim success until production is updated.
- Optionally publish a GitHub release tag matching the shipped semver with notes from the matching **`CHANGELOG.md`** section if a release is missing for that version.
- Post-deploy smoke on **https://www.satisfecho.de**: `/` and `/api/health` **200**; landing **app-version** / footer semver + short hash match the promoted commit.
- This is **release/ops**, not feature coding — fix only blockers that prevent a safe promote; append **Testing instructions** with merge SHA, workflow run URL (or manual deploy evidence), and smoke results.

## Implementation notes (coder)

- Synced `development`; local landing HTTP **200** on `:4202`; front logs had only NG8107 warnings (no build failures); `npm run test:landing-version` against local HAProxy **PASS**.
- No version bump: `[Unreleased]` empty; promoted existing cut **2.1.92** (`696188a3`).
- Merged `development` → `master` with merge commit **`522369e2`** and pushed `master` (no force).
- GitHub release **[v2.1.92](https://github.com/satisfecho/pos/releases/tag/v2.1.92)** published (target `master`).
- GHA **Deploy to amvara9** run [30190831248](https://github.com/satisfecho/pos/actions/runs/30190831248) **success** (~2m6s) — marketing artifact fetch green (no SSH fallback needed).
- Post-deploy: `/` **200**, `/api/health` **200** `{"status":"ok"}`, landing meta/footer **`2.1.92 522369e2`**; amvara9 `git rev-parse --short HEAD` → **`522369e2`**.

## Testing instructions

1. Confirm **https://github.com/satisfecho/pos/releases/tag/v2.1.92** exists and notes match changelog **2.1.92**.
2. Confirm `origin/master` tip is merge **`522369e2`** (`Merge development: release through 2.1.92…`).
3. Confirm Deploy run **https://github.com/satisfecho/pos/actions/runs/30190831248** conclusion **success** (Fetch marketing → build → smoke all green).
4. Production smoke (already run by coder; re-check):
   - `curl -sS -o /dev/null -w "%{http_code}\n" https://www.satisfecho.de/` → **200**
   - `curl -sS https://www.satisfecho.de/api/health` → `{"status":"ok"}` **200**
   - Landing meta `app-version` content **`2.1.92`**; footer short hash **`522369e2`**
5. On amvara9: `cd the deploy directory && git rev-parse --short HEAD` → **`522369e2`**; `front/package.json` version **2.1.92**.

## Test report

- **Date/time (UTC):** 2026-07-26T13:07:35Z start → 2026-07-26T13:08:30Z end (log/evidence window ≈ that interval).
- **Environment:** branch `development` (local tip `0a40073d`); verification target production / `origin/master` / amvara9; `BASE_URL=https://www.satisfecho.de`. No local compose product changes (release/ops task).
- **What was tested:** GitHub release `v2.1.92`, merge commit `522369e2` on `master`, Deploy run 30190831248, production `/` + `/api/health` + landing version, amvara9 HEAD + `front/package.json`.

### Results

1. **Release v2.1.92 notes match changelog 2.1.92 — PASS.** Tag points at `522369e26707f7610a6a93d8ce3974b1df79ddc7`; release body includes WhatsApp reminder docs (0024) bullet and merge SHA `522369e2` (matches `CHANGELOG.md` `## [2.1.92] - 2026-07-26`). URL: https://github.com/satisfecho/pos/releases/tag/v2.1.92
2. **Merge `522369e2` on `master` — PASS (tip superseded).** `git merge-base --is-ancestor 522369e2 origin/master` succeeds; commit subject `Merge development: release through 2.1.92 docs and Jul feature updates.` Current `origin/master` tip is later merge `f2c58558` (`… through 2.1.97`, #312) — expected after subsequent promotes; does not undo #311.
3. **Deploy run 30190831248 — PASS.** `conclusion=success`, `headSha=522369e2…`; steps including Fetch marketing, Build/restart, Smoke test all green. https://github.com/satisfecho/pos/actions/runs/30190831248
4. **Production smoke — PASS (version superseded).** `/` HTTP 200; `/api/health` `{"status":"ok"}` HTTP 200; meta `app-version` = `2.1.97`; Puppeteer landing footer text `2.1.97 f2c58558` (live stack advanced past `2.1.92` / `522369e2` via later deploy; health + version surface OK).
5. **amvara9 checkout — PASS (version superseded).** `git rev-parse --short HEAD` → `f2c58558`; `front/package.json` → `2.1.97` (contains #311 history; current checkout matches later 2.1.97 promote).

### Overall: **PASS**

No failed criteria for the #311 promote intent. Literal tip/version pins to `522369e2` / `2.1.92` no longer match live tip because a later successful promote (#312 / 2.1.97) replaced them; release, ancestry, and historical deploy remain valid.

### Product owner feedback

Production received the 2.1.92 promote as intended: release published, merge on `master`, and Deploy to amvara9 succeeded with green marketing fetch and smoke. Live satisfecho.de is healthy on a newer cut (2.1.97), so operators should treat #311 as done rather than expecting the old footer hash forever.

### URLs tested

1. https://github.com/satisfecho/pos/releases/tag/v2.1.92
2. https://github.com/satisfecho/pos/actions/runs/30190831248
3. https://www.satisfecho.de/
4. https://www.satisfecho.de/api/health

### Relevant log excerpts (last section)

```text
# gh release view v2.1.92 → tagName=v2.1.92, object sha=522369e2…
# gh run view 30190831248 → conclusion=success, headSha=522369e2…
# curl https://www.satisfecho.de/ → HTTP 200; meta app-version=2.1.97
# curl https://www.satisfecho.de/api/health → {"status":"ok"} HTTP 200
# npm run test:landing-version BASE_URL=https://www.satisfecho.de
#   Version element text: 2.1.97 f2c58558 …
# the production host: SHORT=f2c58558 PKG=2.1.97
```
