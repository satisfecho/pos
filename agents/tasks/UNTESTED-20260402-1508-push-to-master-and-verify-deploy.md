# Push to master (promote `development`, verify deployment)

## GitHub Issues

- [github.com/satisfecho/pos/issues](https://github.com/satisfecho/pos/issues)
- **Issue:** https://github.com/satisfecho/pos/issues/152

## Problem / goal

The team wants **tested work on `development`** promoted to **`master`** and deployed so production reflects recent changes. If deployment targets **amvara9**, the GitHub deployment/action status should be reviewed for success.

## High-level instructions for coder / release owner

- Read **`.cursor/rules/git-development-branch-workflow.mdc`** and **`AGENTS.md`**: routine work stays on **`development`**; merging **`development` → `master`** is allowed on the **~2-hour batch cadence**, for **material production-impacting** changes, or when an issue explicitly requests production promotion—align this promotion with those rules.
- Ensure **`development`** is green (tests/smoke as appropriate for the scope of changes) before merging.
- Perform the merge **`development` → `master`** per team practice (fast-forward or merge commit), push **`origin master`** when appropriate, and document anything operators need to know.
- If **amvara9** deploy is in scope: follow **`docs/`** deployment docs (e.g. `docs/0001-ci-cd-amvara9.md` or related) and **verify the relevant GitHub Actions / deployment run succeeded** before considering the rollout complete.

## Implementation (feature coder)

- **Promotion:** Fast-forward **`master`** to **`development`** at `357990b` (includes recent product work through my-shift QR #151 and agent task housekeeping).
- **Push:** `git push origin master` — completed.
- **GitHub Actions:** Workflow **Deploy to amvara9** (`deploy-amvara9.yml`) run **23907796006** — **success** (~2m23s). Steps **Deploy on amvara9** and **Smoke test (landing, version, API health)** passed.
- **Align `origin/development`:** Local **`development`** had the FEAT→WIP commit; after this task file update, push **`origin development`** so remote matches.

## Testing instructions

1. **GitHub Actions:** Open https://github.com/satisfecho/pos/actions — confirm the latest **Deploy to amvara9** run for the push to **`master`** is **green** (run id **23907796006** or newer on the same commit).
2. **Production smoke (optional spot-check):** From a browser or `curl`, verify **https://www.satisfecho.de/** returns **200**, **`/api/health`** returns healthy JSON, and landing **app version** / meta matches expectations (workflow already hit these URLs).
3. **Branches:** Confirm **`origin/master`** and **`origin/development`** both include commit **`357990b`** (or the merge tip after any follow-up commits) so promotion is not one-sided.

**Expected:** All checks pass; production reflects the promoted **`development`** history.
