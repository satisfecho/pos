# Surface commit-hash regen result in front docker-entrypoint

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`front/docker-entrypoint.sh`** runs **`get-commit-hash.js`** on start but swallows failures with **`|| true`**. **`commit-hash.ts`** can stay at an old semver (today **2.1.8** vs package **2.1.29**) across long-lived containers with no log line saying regen ran or what version was written. Agents then rely on **`SKIP_LANDING_PACKAGE_VERSION_CHECK`** and miss that a restart/regen would have fixed the footer.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T19:33Z: adjacent to owned sync/process work — **`NEW-0-20260723-1918-sync-landing-commit-hash-semver`** (one-shot regen+commit) and closed **`CLOSED-0-20260723-1918-committer-regen-commit-hash-on-version-bump`** (040/docs). This task is **entrypoint observability only**
- `front/docker-entrypoint.sh` ~L28–31: `node …/get-commit-hash.js || true`
- `get-commit-hash.js` already prints `✓` / `⚠` lines when run interactively; entrypoint discards non-zero exits
- Tracked file still `version = '2.1.8'` while `front/package.json` is `2.1.29`

## High-level instructions for coder

- After calling **`get-commit-hash.js`**, log the written **`version`** / **`commitHash`** (or the script’s stdout) so `docker logs pos-front` shows regen on start
- Prefer **not** hiding failures: if node/script fails, log a clear warning (keep container startable if that is existing policy, but do not stay silent)
- Optional: if written `version` ≠ `package.json` version after a successful run, print a loud warning
- Do not replace the sibling one-shot sync task; do not change landing UI
- Pass/fail: restarting **`pos-front`** emits a log line with the regenerated semver; a forced script failure is visible in logs
