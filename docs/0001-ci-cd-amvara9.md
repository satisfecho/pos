# CI/CD: Deploy to amvara9 on push to master

When code is pushed to the **production branch** (**`master`**) of **https://github.com/satisfecho/pos**, GitHub Actions deploys to **amvara9** (167.235.138.59). Pushes to **`development`** do **not** trigger deploy (merge **`development` → `master`** to ship). Rename **`master` → `main`** on GitHub if your policy uses **`main`**; then update `.github/workflows/deploy-amvara9.yml` **`push.branches`** accordingly.

**Daily promote (agent loop):** **`agents2/pos-cursor-loop.sh`** step **009** runs **`scripts/promote-development-to-master.sh`** after the committer when **`development`** is ahead of **`master`** and the last master tip is at least **`AGENT_PROMOTE_INTERVAL_HOURS`** old (default **24**). That merge+push to **`master`** is what triggers this workflow. Manual: `AGENT_PROMOTE_FORCE=1 ./scripts/promote-development-to-master.sh` (optional **`AGENT_PROMOTE_WAIT_DEPLOY=1`** to poll the Actions run).

## Server setup (already done)

- **amvara9**: SSH key pair generated at `/root/.ssh/github_deploy`; public key added to `/root/.ssh/authorized_keys`.
- Repo at `/development/pos` with **`origin`** pointing to **https://github.com/satisfecho/pos** so that `git pull origin master` pulls from satisfecho/pos. If the server was previously cloned from or pointed at raro42/pos2, run on amvara9: `cd /development/pos && git remote set-url origin https://github.com/satisfecho/pos.git`.
- `config.env` created from `config.env.example`. Use **relative URLs** so registration and API work from any host (IP or domain): `API_URL=/api`, `WS_URL=` (empty; frontend then uses same-origin `/ws`). Edit SECRET_KEY, REFRESH_SECRET_KEY, **CORS_ORIGINS** (exact production origin(s) such as `https://satisfecho.de` — not `*`), etc. as needed (virgin deploy via `deploy-amvara9.sh` generates non-placeholder secrets). If `CORS_ORIGINS` is empty or still `*`, **`deploy-amvara9.sh`** rewrites it to `https://satisfecho.de,https://www.satisfecho.de` (override with **`PRODUCTION_CORS_ORIGINS`**) before migrate/boot. **`PRODUCTION=true`** for the backend is set by **`docker-compose.prod.yml`** (Secure cookies, production rate limits, reject `CHANGE_THIS…` secrets, reject CORS `*`); you do not need to add `PRODUCTION` to `config.env`.
- Optional **`.secrets`** (gitignored; see **`.secrets.example`**) for values that must not live in git — e.g. **`GOOGLE_ANALYTICS_MEASUREMENT_ID`** for GA4 ([0073-google-analytics.md](0073-google-analytics.md)). `deploy-amvara9.sh` and `./run.sh` pass `--env-file .secrets` when present.
- Docker and Docker Compose must be installed on amvara9 for the deploy to run containers.

## What you need to do: add the private key to GitHub

The workflow accepts **either** the raw private key (with `-----BEGIN ... END-----` lines) **or** its base64 encoding. Prefer the raw key so newlines are preserved.

1. **Get the private key** from amvara9 (one-time). SSH in and run:
   ```bash
   ssh amvara9 "cat /root/.ssh/github_deploy"
   ```
   Copy the **entire** output (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----` and all lines between).

2. **Add it as a repository secret** in GitHub:
   - Repository **satisfecho/pos** → **Settings** → **Secrets and variables** → **Actions**
   - Create or update secret **`SSH_PRIVATE_KEY_AMVARA9`**
   - Value: paste the full private key (raw PEM, all lines) or the **single-line base64** from `ssh amvara9 "base64 -w 0 /root/.ssh/github_deploy"` (base64 often works better in GitHub’s secret field)
   - Save

3. **(Optional)** Remove the private key from the server so only GitHub has it:
   ```bash
   ssh amvara9 "rm /root/.ssh/github_deploy"
   ```
   The public key stays in `authorized_keys`; only the private key is removed.

## Optional secrets

You can override defaults with these repository secrets:

| Secret / variable | Default          | Use when |
|-------------------|------------------|----------|
| `DEPLOY_HOST`     | `167.235.138.59` | Override if the server IP or hostname changes |
| `DEPLOY_USER`     | `root`           | Deploy runs as another user |
| `DEPLOY_PATH`     | `/development/pos` | Project is in a different directory |
| `DEPLOY_SSH_PORT` | `60022`          | SSH port on amvara9 (repository **Variable**; not port 22) |
| `MARKETING_ARTIFACT_TOKEN` | (required for marketing) | PAT (or fine-grained token) with **Actions: Read** on every repo listed in **`config/marketing-sites.json`**. Legacy fallback: `GUSTAZO_ARTIFACT_TOKEN` / `GH_TOKEN`. |

## Marketing site artifacts (Deploy step 1)

Before SSH, **Deploy to amvara9** runs **`scripts/sync-all-marketing-sites.sh`** with **`MARKETING_SYNC_FORCE=1`** and **`MARKETING_VERIFY_NO_PLACEHOLDERS=1`**. That downloads each site’s latest **non-expired** GitHub Actions artifact into **`front/sites/<slug>/`** (or **`<slug>/<deploySubpath>/`**). If any manifest site still has a placeholder (`bundle not loaded`) or is missing `index.html`, the job **fails** and never reaches amvara9.

**Common failure: expired artifacts.** GitHub keeps Actions artifacts for a limited retention (often ~90 days). Older marketing repos (e.g. `010_antillana`, `020_dilruba`, `030_flamanapolitana`, `050_hakone`) that only publish `dist` and are not rebuilt often will fail download with HTTP 410 / “Artifact download failed”. Newer repos that rebuild more frequently stay green.

**Fix / refresh cadence:**

```bash
# List which sites need a new Build (DRY_RUN=1), then dispatch:
DRY_RUN=1 bash scripts/refresh-expired-marketing-artifacts.sh
bash scripts/refresh-expired-marketing-artifacts.sh
# Optional: WAIT=1 bash scripts/refresh-expired-marketing-artifacts.sh

# After Builds are green, re-run Deploy (Actions → Deploy to amvara9 → Run workflow)
# or locally (token required):
MARKETING_SYNC_FORCE=1 MARKETING_VERIFY_NO_PLACEHOLDERS=1 bash scripts/sync-all-marketing-sites.sh
```

**`scripts/fetch-marketing-artifact.sh`** skips expired artifacts and walks recent successful runs; if all are expired it prints a clear error with the `gh workflow run Build --repo …` command. Prefer keeping marketing CI green (push or `workflow_dispatch` on **Build**) rather than shipping placeholders.

## Workflow

- **File:** `.github/workflows/deploy-amvara9.yml`
- **Trigger:** Push to **`master`** only (not **`development`**); **`workflow_dispatch`** for manual deploy
- **Concurrency:** A single **`deploy-amvara9`** group queues jobs so two pushes cannot overlap on the same server checkout.
- **Steps:** Fetch marketing artifacts (see above) → SSH to amvara9 (port **`DEPLOY_SSH_PORT`**, default **60022**) → `git fetch` → **`git checkout` + `reset --hard` to the pushed branch** (`${{ github.ref_name }}`, e.g. `master`) → marketing rsync → **`bash scripts/deploy-amvara9.sh`**
- **Deploy script behaviour (GitHub #49):**
  - **`docker compose build`** for **back** and **front** runs **before** stopping app containers; a failed build leaves the previous stack running.
  - By default, **`docker compose down` is not used**; only **front**, **haproxy**, **ws-bridge**, and **back** are stopped so **db** and **redis** stay up. Override with **`DEPLOY_FULL_DOWN=1`** on the server for a full teardown.
  - **`git remote get-url origin`** must contain **`satisfecho/pos`** unless **`SKIP_ORIGIN_CHECK=1`** (forks/mirrors).
  - Migrations run with **strict failure** (script exits if migrate or sync-idempotent fails).
  - After **`up -d`**, the script waits for **`http://127.0.0.1:8020/health`** inside the **back** container (retries) instead of a fixed long sleep.
  - After **back** and **front** images build successfully, **`docker buildx prune -f`** runs to drop **unused** BuildKit cache and limit disk growth on the server ([issue #73](https://github.com/satisfecho/pos/issues/73)). It is non-interactive (`-f`). Override with **`SKIP_BUILDX_PRUNE=1`** on the server if you need to skip it. Failures are logged as a warning and do not abort deploy.
- **Post-deploy smoke:** The workflow retries **landing**, **app-version** meta, and **`/api/health`** against **`SMOKE_TEST_BASE_URL`** (default **https://www.satisfecho.de**).

## First deploy

1. Ensure **Docker** and **Docker Compose** are installed on amvara9.
2. Edit `/development/pos/config.env` on amvara9 with production values (`API_URL`, `WS_URL`, `CORS_ORIGINS=https://satisfecho.de` or your real front-end origin — never `*`, `SECRET_KEY`, etc.). See [0004-deployment.md](0004-deployment.md).
3. Add `SSH_PRIVATE_KEY_AMVARA9` in GitHub as above.
4. Push to `master` (or re-run the workflow from the Actions tab) to trigger the first deploy.

## Login / register returning 500

If **login** or **create account** returns 500 on amvara9, the database is likely missing columns or enum values that the app expects. Deploy runs **migrations** automatically; ensure the latest code (and thus migration files) is deployed so that:

- **Migration `20260314000000_add_user_provider_id.sql`** runs: it adds `user.provider_id` and the `user_role` value `'provider'`. Without it, any request that selects or inserts a `User` (login, register) can 500.
- **Migration `20260315100000_add_provider_company_fields.sql`** runs: it adds provider company/bank columns. Needed for provider portal.

After a normal deploy (`git pull` + `deploy-amvara9.sh`), migrations run via `docker compose exec back python -m app.migrate`. If you previously deployed without these migrations, run deploy again (or on the server run `cd /development/pos && docker compose --env-file config.env exec -T back python -m app.migrate`).

## Demo login (ralf@roeber.de) on amvara9

The **deploy script does not delete users**. It only runs migrations, demo tables/products seeds, and catalog imports.

If the demo account **ralf@roeber.de** no longer works on amvara9, it was almost certainly removed when **`remove_extra_tenants`** was run manually at some point. That seed keeps only the tenant "Cobalto" and deletes all other tenants and **all their users** (including ralf@roeber.de if that user belonged to another tenant).

**To restore a working demo login:**

1. **Option A – Use the remaining Cobalto user**  
   If there is still an owner user for tenant "Cobalto" (tenant id 1), set their password to match dev:
   ```bash
   cd /development/pos
   USER_EMAIL=<that_user@email> NEW_PASSWORD='WbRS%2026!' docker compose --env-file config.env exec -T back python -m app.seeds.set_user_password
   ```
   Log in with that email and the password above. You can change the user’s email to ralf@roeber.de later in Settings or via DB if needed.

2. **Option B – Re-register**  
   Open `https://<amvara9-domain>/register` and register again with ralf@roeber.de (and the desired password). This creates a new tenant. Use this if you want a separate "Roeber" tenant again.

**Do not run `remove_extra_tenants`** on amvara9 unless you intentionally want a single-tenant (Cobalto-only) server and accept that all other tenants and their users will be deleted.

## Daily demo data reset (tenant 1)

Demo restaurant **tenant 1** accumulates orders, reservations, and waiting-list entries from sales demos. To keep Informes and demo flows fresh, reset and re-seed **orders** (including Satisfecho Delivery samples), **reservations**, and **waiting-list entries** for tenant 1 only (tables, products, and users are untouched) with the idempotent wrapper:

```bash
cd /development/pos
./scripts/reset-demo-data-on-server.sh
```

That script runs `python -m app.seeds.reset_demo_data` inside the production `back` container. It is safe while the stack is up and does **not** touch other tenants.

**Host cron (preferred, UTC daily at 04:00):** on amvara9, install once as root (or the user that can run docker compose):

```bash
crontab -l 2>/dev/null | grep -q 'reset-demo-data-on-server.sh' || (
  crontab -l 2>/dev/null
  echo '0 4 * * * cd /development/pos && ./scripts/reset-demo-data-on-server.sh >>/var/log/pos-demo-reset.log 2>&1'
) | crontab -
```

Or add the line manually with `crontab -e`:

```cron
0 4 * * * cd /development/pos && ./scripts/reset-demo-data-on-server.sh >>/var/log/pos-demo-reset.log 2>&1
```

Ensure the script is executable (`chmod +x scripts/reset-demo-data-on-server.sh`; it is committed executable in the repo). If `check_demo_tables` fails (missing T01–T10), repair tables first (`python -m app.seeds.seed_demo_tables`) before relying on the daily reset.

## Unpaid public Satisfecho Delivery cleanup (all tenants)

Abandoned unpaid **public** Satisfecho Delivery checkouts can accumulate on **any** tenant (kitchen was never notified). The idempotent CLI cancels rows past the default **2h** TTL; it does **not** touch staff-created delivery orders. Demo reset (tenant 1 only) does **not** replace this job — keep both crons.

Manual (from `/development/pos` on amvara9):

```bash
cd /development/pos
./scripts/cleanup-unpaid-public-delivery-on-server.sh
# Preview only:
./scripts/cleanup-unpaid-public-delivery-on-server.sh --dry-run
```

That wrapper runs `python -m app.seeds.cleanup_unpaid_public_delivery` inside the production `back` container (extra args are passed through). Details: **`docs/0053-satisfecho-delivery-order-channel.md`** § Unpaid public checkout cleanup.

**Host cron (preferred, UTC hourly at :15):** on amvara9, install once as root (or the user that can run docker compose):

```bash
crontab -l 2>/dev/null | grep -q 'cleanup-unpaid-public-delivery-on-server.sh' || (
  crontab -l 2>/dev/null
  echo '15 * * * * cd /development/pos && ./scripts/cleanup-unpaid-public-delivery-on-server.sh >>/var/log/pos-unpaid-public-delivery-cleanup.log 2>&1'
) | crontab -
```

Or add the line manually with `crontab -e`:

```cron
15 * * * * cd /development/pos && ./scripts/cleanup-unpaid-public-delivery-on-server.sh >>/var/log/pos-unpaid-public-delivery-cleanup.log 2>&1
```

Ensure the script is executable (`chmod +x scripts/cleanup-unpaid-public-delivery-on-server.sh`; it is committed executable in the repo). This cron is **separate** from the tenant-1 demo reset above — do not merge them.

## Virgin / fresh install (fully automatic)

On a clean clone to `/development/pos` with no `config.env`, the deploy script creates `config.env` from `config.env.example` (with generated secrets) and uses relative `API_URL=/api` so registration works from any host. After migrations, **bootstrap_demo** runs: if no tenants exist, it creates tenant 1 "Demo Restaurant" and seeds T01–T10, demo products, and demo orders (paid + active over ±90 days) so Reports show data. Then **beer, pizza, wine** catalog imports run; **link_demo_products_to_catalog** runs so tenant products without images are linked to catalog provider products — when staff open `/products`, images are backfilled. The **first user to register** is assigned as owner of that tenant and gets the demo data immediately (no manual seed step). The app listens on port 80; reach it at **http://167.235.138.59** or your domain.

## SaaS paywall (keep off until ready)

Platform signup monetization (`SAAS_PAYWALL_ENABLED`) defaults to **false** on amvara9. Do **not** enable it in `config.env` until Stripe Price ID, platform `STRIPE_*` keys, and a signed Dashboard webhook to **`/api/saas/webhook`** are in place. Full ordered checklist (grandfather check, compose recreate, `GET /saas/config`, dry-run register → `/paywall` → trial, `npm run test:paywall`): **[0052-saas-signup-paywall.md](0052-saas-signup-paywall.md)** § Production enablement. Deploy alone does not flip the flag.

## Smoke test after deploy

Once the GitHub Actions deploy job has finished, run smoke tests from a machine that can reach the production URL (e.g. your laptop, or a runner with network access to amvara9 / satisfecho.de).

**1. Landing (no credentials):**
```bash
cd pos/front
BASE_URL=http://167.235.138.59 HEADLESS=1 npm run test:landing-version
# Or when DNS/SSL is set: BASE_URL=https://satisfecho.de HEADLESS=1 npm run test:landing-version
```

**2. Reports (owner/admin credentials required; create first user at /register after fresh install):**
```bash
cd pos/front
BASE_URL=http://167.235.138.59 HEADLESS=1 LOGIN_EMAIL=your-owner@amvara.de LOGIN_PASSWORD=yourpassword npm run test:reports
# Or BASE_URL=https://satisfecho.de when DNS is set
```

**3. Optional – full reservation tests:**
```bash
# From repo root
STAFF_TEST=1 BASE_URLS="https://satisfecho.de" HEADLESS=1 ./scripts/run-reservation-tests.sh
# Set LOGIN_EMAIL / LOGIN_PASSWORD in env or .env (DEMO_LOGIN_EMAIL / DEMO_LOGIN_PASSWORD) for staff test
```

If the production URL is not satisfecho.de, set `BASE_URL` (or `BASE_URLS`) to the actual app URL. See [AGENTS.md](../AGENTS.md) (Smoke tests required) and [testing.md](testing.md).
