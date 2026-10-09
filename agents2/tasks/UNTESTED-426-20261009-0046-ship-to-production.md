# Ship to Production (#426)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/426
- **426**

## Status
- **UNTESTED** — Agent 010 promote + deploy completed **2026-10-09T00:53:27Z**.
- Preflight: actionable. Local smoke: `http://127.0.0.1:14202/` and `/api/health` → 200. Version on development: **2.1.181** (Stripe guest checkout fix already in changelog); `[Unreleased]` empty — no bump.
- Divergence at start: `origin/development` **894e3be22** ahead **3** / behind **2** vs `origin/master` **6eb40dc95**. After WIP commit tip **46a37d202** (ahead **4**). Promote with `AGENT_PROMOTE=1 AGENT_PROMOTE_FORCE=1` (env had `AGENT_PROMOTE=0`).
- **Merge SHA:** `a2c3dcf5b` (`origin/master`). **Release:** https://github.com/satisfecho/pos/releases/tag/v2.1.181
- **Deploy:** https://github.com/satisfecho/pos/actions/runs/37866696584 — success.

## Problem / goal
Human asks to **ship now** to production (amvara9 / satisfecho.de): promote tested work from **`development`** to **`master`** and confirm deploy. Explicit production request under **`.cursor/rules/git-development-branch-workflow.mdc`** and **`docs/agent-loop.md`** (urgent / deploy-now path).

At planning time (**2026-10-09** UTC): `origin/development` tip **894e3be22** and `origin/master` tip **6eb40dc95** are **diverged** (rev-list left-right ≈ **2** / **3**). Confirm tip SHAs and ahead/behind counts before merge; do not force-push.

See **`docs/0001-ci-cd-amvara9.md`**, **`scripts/promote-development-to-master.sh`**, **`.cursor/rules/commit-changelog-version.mdc`**. Prior similar work: **#424**, **#308**, **#277**.

## High-level instructions for coder
- Sync **`development`** (`./scripts/git-sync-development.sh`). Confirm local smoke: landing HTTP **200** on HAProxy port; `docker logs --since 10m pos-front` — no Angular build failures.
- **Changelog / version:** If `[Unreleased]` has material user-facing items, cut a new semver section, bump **`front/package.json`** + lockfile, run **`node front/scripts/get-commit-hash.js`**, and commit **`commit-hash.ts`** with the bump on **`development`**. Skip empty churn bumps.
- Because the issue says **ship now**, promote is allowed outside the daily 24h window: use **`AGENT_PROMOTE_FORCE=1 ./scripts/promote-development-to-master.sh`** (or equivalent merge **`development` → `master`** + **`git push origin master`**). Resolve divergence safely (merge **`master`** into **`development`** first if needed); **never** force-push **`master`**.
- Monitor **Deploy to amvara9**. If GHA fails, use documented manual deploy fallback; do not claim success until production reflects the promoted tip. Watch for prior CORS / migrate blockers (see **#424** / **2.1.180**).
- Optional: publish a GitHub release matching the shipped semver from **`CHANGELOG.md`** if a version was cut.
- Post-deploy smoke on production: `/` and `/api/health` **200**; landing version/footer hash match the promoted commit.
- This is **release/ops**, not feature coding — fix only blockers that prevent a safe promote. Append **Testing instructions** with merge SHA, workflow/manual deploy evidence, and smoke results.
- Comment on issue **#426** when promote + deploy are done (or if blocked by divergence/conflicts).

## Testing instructions

1. Confirm `origin/master` tip is merge **`a2c3dcf5b`** (subject includes release through **2.1.181**).
2. Confirm GitHub Actions run **37866696584** (“Deploy to amvara9”) conclusion **success**: https://github.com/satisfecho/pos/actions/runs/37866696584
3. Confirm release **v2.1.181**: https://github.com/satisfecho/pos/releases/tag/v2.1.181
4. Production smoke (already run by coder):
   - `curl -s -o /dev/null -w "%{http_code}" https://satisfecho.de/` → **200**
   - `curl -s -o /dev/null -w "%{http_code}" https://satisfecho.de/api/health` → **200**; body `{"status":"ok"}`
   - Landing HTML includes `<meta name="app-version" content="2.1.181">`
5. Optional: open https://satisfecho.de/ and check footer shows **2.1.181** (commit-hash.ts baked hash **f08f00b81** from the version bump commit).
