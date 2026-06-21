# Deploy to production

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/272
- **272**

## Problem / goal

Promote tested work from **`development`** to **`master`** and deploy to **amvara9** (production / **satisfecho.de**). The issue author requests shipping the latest changes to production.

Follow **`.cursor/rules/git-development-branch-workflow.mdc`** — this is an explicit production-promotion request (issue opened 2026-06-21).

**Context (2026-06-21):** After sync, **`origin/development`** is ahead of **`origin/master`** (last **`master`** tip **`632de10d`**, 2026-06-17). Notable product commits on **`development`** not yet on **`master`** include **#271** (schedule write authorization for non-owner staff), **#270** (courier role / delivery driver portal), and **#269** (pricing helper garnish costs). Local dev stack responds **200** on port 4202; no Angular compile errors in **`pos-front`** logs in the last 7 days.

## High-level instructions for coder

- Confirm **`development`** is green locally: `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/` → 200; run relevant Puppeteer smoke tests for recently merged features (#269 pricing helper, #270 courier portal, #271 schedule auth) if credentials are available.
- Review **`CHANGELOG.md`** / version in **`front/package.json`** — bump and release notes if user-visible changes warrant it (see **`.cursor/rules/commit-changelog-version.mdc`**).
- Merge **`development` → `master`** (merge commit or team-preferred fast-forward), push **`origin/master`**.
- Watch **Deploy to amvara9** GitHub Actions for the pushed **`master`** commit; document run URL and conclusion in the task file.
- Verify production: `curl -sf https://www.satisfecho.de/api/health`; optional `LANDING_VERSION_ONLY=1 BASE_URL=https://www.satisfecho.de npm run test:landing-version` from `front/`.
- If deploy fails, check Actions logs and **`docs/0001-ci-cd-amvara9.md`** (migrations, dirty tree, marketing artifacts) before retrying.
- Append **Testing instructions** when ready for tester; follow **wip → untested** flow per **`TASKS-README.md`**.
