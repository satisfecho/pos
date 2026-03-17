# Deploy / CSS fix for amvara9 (satisfecho.de)

## Problem

- **Symptom**: CSS styling is wrong on the deployment (e.g. Settings > Opening hours).
- **Observation**: The deployment log shows the deploy runs and smoke tests pass, but the live site serves an **older front build** than the one that should come from the latest commit.

## Root cause

1. **Front image not rebuilt on deploy**  
   The deploy script:
   - Builds **back** explicitly: `docker compose ... build back`
   - Then runs `docker compose ... up --build -d` for all services.

   With `up --build`, Docker rebuilds the **front** image only if it considers the build context changed. Because of **layer caching**, the front image can be reused from a previous run (e.g. March 16). So after a push that only changes frontend (e.g. 2.0.2), the server can still be serving the previous front build.

   **Evidence**: Live site returns `index.html` with `last-modified: Mon, 16 Mar 2026 16:08:06 GMT` and the `pos-front` image on the server has `CreatedAt: 2026-03-16 16:07:57 UTC`, while the deployed commit is 1d90356 (Release 2.0.2, March 17). So the front container content is from the day before the latest deploy.

2. **index.html caching (secondary)**  
   Nginx in the front container does not set a short or no-cache policy for `index.html`. Hashed assets (e.g. `styles-*.css`, `main-*.js`) are cached 1y, which is correct. If `index.html` is cached by a browser or proxy, after a new deploy users can keep receiving an old index that references old hashed filenames; those assets no longer exist, so CSS/JS can 404 and styling breaks. Sending `Cache-Control: no-cache` (or short max-age) for the document avoids that.

## What to change (for your confirmation)

### 1. Force rebuild of the front image on every deploy

**File**: `scripts/deploy-amvara9.sh`

- After building the back image, **explicitly build the front image with `--no-cache`** so every deploy produces a fresh front bundle from the current repo.
- Then start services with `up -d` (no need for `--build` for the front, since we just built it).

Concretely:

- Keep: `docker compose ... build back`
- Add: `docker compose ... build front --no-cache`
- Change: `docker compose ... up --build -d` → `docker compose ... up -d` (so we don’t rely on `--build` to refresh the front).

This ensures the front container always serves the assets built from the code that was just pulled (e.g. 1d90356).

### 2. Avoid long caching of index.html

**File**: `front/nginx.conf`

- Add a location that matches the document (e.g. `index.html` or the SPA fallback `/`) and set `Cache-Control: no-cache` (or a short max-age) for the HTML document.
- Keep the existing long-lived cache for hashed static assets (`.js`, `.css`, etc.).

This way, after a deploy, clients get the new `index.html` and thus the new hashed asset URLs; no mix of old index + new backend.

### 3. Node.js 20 deprecation warning in Actions

The log shows:

```text
Warning: Node.js 20 actions are deprecated...
```

You asked **not to fix this yet**. So we only document it: when you’re ready, you can switch to Node 24 (e.g. by setting `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` or using updated action versions). No change in the proposed deploy or nginx fixes.

## Summary

| Item | Action |
|------|--------|
| Front image not updated on deploy | In `deploy-amvara9.sh`: add `build front --no-cache` and use `up -d` |
| index.html cached too long | In `front/nginx.conf`: add `Cache-Control: no-cache` for the HTML document |
| Node.js 20 deprecation | No change; fix later when you’re ready |

After applying (1) and (2), the next deploy to amvara9 will rebuild the front from the current code and serve it with correct cache headers, which should fix the wrong CSS (e.g. on Settings > Opening hours) and prevent stale-index issues in the future.
