# Deploy / CSS fix for amvara9 (satisfecho.de)

**Status (shipped):** Stale front builds on amvara9 are addressed in-repo. `scripts/deploy-amvara9.sh` builds the front image with `--no-cache` (after removing any existing front image), and `front/nginx.conf` sets `Cache-Control: no-cache, no-store, must-revalidate` on the SPA document (`location /`). The sections below keep the original incident narrative and proposed diffs as historical context.

## Problem (historical)

- **Symptom**: CSS styling is wrong on the deployment (e.g. Settings > Opening hours).
- **Observation**: The deployment log shows the deploy runs and smoke tests pass, but the live site serves an **older front build** than the one that should come from the latest commit.

## Root cause (historical)

1. **Front image not rebuilt on deploy**  
   The deploy script used to:
   - Build **back** explicitly: `docker compose ... build back`
   - Then run `docker compose ... up --build -d` for all services.

   With `up --build`, Docker rebuilds the **front** image only if it considers the build context changed. Because of **layer caching**, the front image can be reused from a previous run (e.g. March 16). So after a push that only changes frontend (e.g. 2.0.2), the server can still be serving the previous front build.

   **Evidence (at the time):** Live site returned `index.html` with `last-modified: Mon, 16 Mar 2026 16:08:06 GMT` and the `pos-front` image on the server had `CreatedAt: 2026-03-16 16:07:57 UTC`, while the deployed commit was 1d90356 (Release 2.0.2, March 17). So the front container content was from the day before the latest deploy.

2. **index.html caching (secondary)**  
   Nginx in the front container did not set a short or no-cache policy for `index.html`. Hashed assets (e.g. `styles-*.css`, `main-*.js`) are cached 1y, which is correct. If `index.html` is cached by a browser or proxy, after a new deploy users can keep receiving an old index that references old hashed filenames; those assets no longer exist, so CSS/JS can 404 and styling breaks. Sending `Cache-Control: no-cache` (or short max-age) for the document avoids that.

## What was changed (now in repo)

### 1. Force rebuild of the front image on every deploy

**File**: `scripts/deploy-amvara9.sh`

Current behaviour (see script):

- Build back: `docker compose ... build back`
- Remove existing front image ids, then `docker compose ... build --no-cache front` (with `COMMIT_HASH` for the landing footer)
- Start services with `up -d` after migrations (front is already rebuilt; do not rely on `up --build` alone for a fresh front)

### 2. Avoid long caching of index.html

**File**: `front/nginx.conf`

- `location /` uses `try_files` SPA fallback and sets `Cache-Control: no-cache, no-store, must-revalidate` on the HTML document.
- Hashed static assets (`.js`, `.css`, images) keep long-lived cache (`expires 1y`).

### 3. Node.js 20 deprecation warning in Actions

The log showed:

```text
Warning: Node.js 20 actions are deprecated...
```

That warning was **out of scope** for this fix. When ready, switch to Node 24 (e.g. `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` or updated action versions). No change required for the deploy/nginx CSS fix.

## Summary

| Item | Status |
|------|--------|
| Front image not updated on deploy | **Shipped** - `deploy-amvara9.sh` builds front with `--no-cache` |
| index.html cached too long | **Shipped** - `front/nginx.conf` no-cache headers on SPA document |
| Node.js 20 deprecation | Unrelated; fix later when ready |

Operators hitting wrong CSS after a deploy should first confirm the latest deploy ran `build --no-cache front` and that browsers are not holding an old `index.html`; see also [0001-ci-cd-amvara9.md](0001-ci-cd-amvara9.md) and [0004-deployment.md](0004-deployment.md).
