# Sync stale landing footer semver (commit-hash.ts)

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`front/src/environments/commit-hash.ts` still exports **`version = '2.1.8'`** while **`front/package.json`** is **`2.1.29`**. The landing footer prefers the commit-hash export over package.json when non-zero, so **`npm run test:landing-version`** fails strict semver on localhost. Testers keep papering over this with `SKIP_LANDING_PACKAGE_VERSION_CHECK=1` (noted again when closing the Jul `/features` refresh).

## Evidence (008 preflight / review)

- SIGNAL `changelog_sparse` after **2.1.29** cut (owned elsewhere); adjacent finding from closed **`CLOSED-0-20260723-1903-refresh-public-features-page-jul-capabilities`**: landing smoke FAIL on footer **2.1.8** vs package **2.1.28+**
- `front/src/environments/commit-hash.ts`: `version = '2.1.8'`; `front/package.json`: `"version": "2.1.29"`
- `environment.ts` uses commit-hash `version` whenever it is not `'0.0.0'`
- Entrypoint runs `get-commit-hash.js` on container start, but a long-lived bind-mount without restart (or a bump that never regenerates the tracked file) leaves git/source stale

## High-level instructions for coder

- From repo root (host, with `.git`): run **`node front/scripts/get-commit-hash.js`** so `commit-hash.ts` matches current `package.json` version and short HEAD hash
- Commit the regenerated **`front/src/environments/commit-hash.ts`** (do not hand-edit)
- Optionally restart **`pos-front`** so the running app picks up the file if it was already serving
- Pass/fail: `commit-hash.ts` `version` equals `front/package.json` `version`; `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` passes **without** `SKIP_LANDING_PACKAGE_VERSION_CHECK`
- Do **not** broaden into committer process changes — sibling task owns that
