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
