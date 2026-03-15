# CI/CD: Deploy to amvara9 on push to master

When code is pushed to the **master** (or **main**) branch of **https://github.com/satisfecho/pos**, GitHub Actions deploys to **amvara9** (167.235.138.59).

## Server setup (already done)

- **amvara9**: SSH key pair generated at `/root/.ssh/github_deploy`; public key added to `/root/.ssh/authorized_keys`.
- Repo at `/development/pos` with **`origin`** pointing to **https://github.com/satisfecho/pos** so that `git pull origin master` pulls from satisfecho/pos. If the server was previously cloned from or pointed at raro42/pos2, run on amvara9: `cd /development/pos && git remote set-url origin https://github.com/satisfecho/pos.git`.
- `config.env` created from `config.env.example`. Use **relative URLs** so registration and API work from any host (IP or domain): `API_URL=/api`, `WS_URL=` (empty; frontend then uses same-origin `/ws`). Edit SECRET_KEY, REFRESH_SECRET_KEY, CORS_ORIGINS, etc. as needed.
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

| Secret         | Default          | Use when |
|----------------|------------------|----------|
| `DEPLOY_HOST`  | `167.235.138.59` | Override if the server IP or hostname changes |
| `DEPLOY_USER`  | `root`           | Deploy runs as another user |
| `DEPLOY_PATH`  | `/development/pos` | Project is in a different directory |

## Workflow

- **File:** `.github/workflows/deploy-amvara9.yml`
- **Trigger:** Push to `master` or `main`
- **Steps:** SSH to amvara9 → `git pull origin master` → `docker compose up --build -d` → run migrations

## First deploy

1. Ensure **Docker** and **Docker Compose** are installed on amvara9.
2. Edit `/development/pos/config.env` on amvara9 with production values (API_URL, WS_URL, CORS_ORIGINS, SECRET_KEY, etc.). See [0004-deployment.md](0004-deployment.md).
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

## Virgin / fresh install (fully automatic)

On a clean clone to `/development/pos` with no `config.env`, the deploy script creates `config.env` from `config.env.example` (with generated secrets) and uses relative `API_URL=/api` so registration works from any host. After migrations, **bootstrap_demo** runs: if no tenants exist, it creates tenant 1 "Demo Restaurant" and seeds T01–T10 + demo products. Then **beer, pizza, wine** catalog imports run; **link_demo_products_to_catalog** runs so tenant products without images are linked to catalog provider products — when staff open `/products`, images are backfilled. The **first user to register** is assigned as owner of that tenant and gets the demo data immediately (no manual seed step). The app listens on port 80; reach it at **http://167.235.138.59** or your domain.

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
BASE_URL=http://167.235.138.59 HEADLESS=1 LOGIN_EMAIL=your-owner@example.com LOGIN_PASSWORD=yourpassword npm run test:reports
# Or BASE_URL=https://satisfecho.de when DNS is set
```

**3. Optional – full reservation tests:**
```bash
# From repo root
STAFF_TEST=1 BASE_URLS="https://satisfecho.de" HEADLESS=1 ./scripts/run-reservation-tests.sh
# Set LOGIN_EMAIL / LOGIN_PASSWORD in env or .env (DEMO_LOGIN_EMAIL / DEMO_LOGIN_PASSWORD) for staff test
```

If the production URL is not satisfecho.de, set `BASE_URL` (or `BASE_URLS`) to the actual app URL. See [AGENTS.md](../AGENTS.md) (Smoke tests required) and [testing.md](testing.md).
