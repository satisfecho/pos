# Ship to Production (#428)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/428
- **428**

## Status
- **WIP** — Agent 010 started **2026-10-09T01:56:04Z** UTC. Preflight: actionable.
- Local smoke: `http://127.0.0.1:14202/` and `/api/health` → **200**. Front logs (10m): no Angular build failures.
- Version on development: **2.1.182** (guest confirm-payment StripeObject fix already in changelog); `[Unreleased]` empty — no bump.
- Divergence at start: `origin/development` **8a80f9121** ahead **3** / behind **3** vs `origin/master` **a2c3dcf5b**. Will merge `master` into `development` then promote with `AGENT_PROMOTE_FORCE=1`.

## Problem / goal
Human asks to **ship now** to production (amvara9 / satisfecho.de): promote tested work from **`development`** to **`master`** and confirm deploy. Explicit production request under **`.cursor/rules/git-development-branch-workflow.mdc`** and **`docs/agent-loop.md`** (urgent / deploy-now path).

At planning time (**2026-10-09** UTC): `origin/development` (**8a80f9121**) and `origin/master` (**a2c3dcf5b**) are **diverged** (about **3** commits each side — not a simple fast-forward). Confirm tip SHAs and ahead/behind counts before merge; do not force-push.

See **`docs/0001-ci-cd-amvara9.md`**, **`scripts/promote-development-to-master.sh`**, **`.cursor/rules/commit-changelog-version.mdc`**. Prior similar work: **#424**, **#308**, **#277**.

## High-level instructions for coder
- Sync **`development`** (`./scripts/git-sync-development.sh`). Confirm local smoke: landing HTTP **200** on HAProxy port; `docker logs --since 10m pos-front` — no Angular build failures.
- **Changelog / version:** If `[Unreleased]` has material user-facing items, cut a new semver section, bump **`front/package.json`** + lockfile, run **`node front/scripts/get-commit-hash.js`**, and commit **`commit-hash.ts`** with the bump on **`development`**. Skip empty churn bumps.
- Because the issue says **ship now**, promote is allowed outside the daily 24h window: use **`AGENT_PROMOTE_FORCE=1 ./scripts/promote-development-to-master.sh`** (or equivalent merge **`development` → `master`** + **`git push origin master`**). Resolve divergence safely (merge **`master` into `development`** first if needed); **never** force-push **`master`**.
- Monitor **Deploy to amvara9**. If GHA fails, use documented manual deploy fallback; do not claim success until production reflects the promoted tip. Watch for CORS/`PRODUCTION=true` pitfalls from the **#424** / **2.1.180** hotfix path.
- Optional: publish a GitHub release matching the shipped semver from **`CHANGELOG.md`** if a version was cut.
- Post-deploy smoke on production: `/` and `/api/health` **200**; landing version/footer hash match the promoted commit.
- This is **release/ops**, not feature coding — fix only blockers that prevent a safe promote. Append **Testing instructions** with merge SHA, workflow/manual deploy evidence, and smoke results.
- Comment on issue **#428** when promote + deploy are done (or if blocked by divergence/conflicts).
