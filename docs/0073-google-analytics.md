# Google Analytics 4 (gtag)

Satisfecho loads the standard Google tag (**gtag.js**) in the Angular shell (`front/src/index.html`) when a **measurement ID** is provided at container start. The real ID is **not** committed to git.

## Where the ID lives

| Location | Purpose |
|----------|---------|
| **`.secrets`** (gitignored) | Preferred for the real `GOOGLE_ANALYTICS_MEASUREMENT_ID=G-…` on laptops and amvara9 |
| **`.secrets.example`** | Documented placeholder only - no real ID |
| **`config.env`** | Also works if you set the same variable (also gitignored); prefer `.secrets` for tokens/IDs |

`./run.sh` and **`scripts/deploy-amvara9.sh`** pass `--env-file .secrets` when the file exists (after `config.env`). Manual compose:

```bash
docker compose $(./scripts/compose-env-file-args.sh) -f docker-compose.yml -f docker-compose.dev.yml up -d front
```

## How injection works

1. Committed `index.html` loads **`/runtime-config.js`** then only loads gtag when `window.__GA_MEASUREMENT_ID__` looks like `G-…`.
2. **`front/docker-entrypoint.sh`** (dev) and **`front/docker-entrypoint-prod.sh`** (prod) write **`runtime-config.js`** from env **`GOOGLE_ANALYTICS_MEASUREMENT_ID`** (shape-validated). The file is **gitignored** under `front/public/` so bind mounts never leave the ID in a tracked path.
3. Compose maps the env into the **front** service (`docker-compose.yml` / `docker-compose.prod.yml`).

Template: **`front/public/runtime-config.js.example`**. After changing `.secrets`, recreate the front container so the entrypoint runs again:

```bash
docker compose $(./scripts/compose-env-file-args.sh) -f docker-compose.yml -f docker-compose.dev.yml up -d --force-recreate front
```
## Production (amvara9)

Add the line to **`/development/pos/.secrets`** on the server (file is gitignored, survives `git pull`). Redeploy or recreate **front** so prod entrypoint injects into the built nginx `index.html`.

## Privacy note

Once enabled, the measurement ID appears in the **served** HTML (required for gtag). Keeping it out of the **repo** avoids leaking a prod property ID in PRs/history; it is still client-visible in the browser.
