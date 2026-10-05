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
