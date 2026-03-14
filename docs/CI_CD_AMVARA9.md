# CI/CD: Deploy to amvara9 on push to master

When code is pushed to the **master** (or **main**) branch, GitHub Actions deploys to **amvara9** (167.235.138.59).

## Server setup (already done)

- **amvara9**: SSH key pair generated at `/root/.ssh/github_deploy`; public key added to `/root/.ssh/authorized_keys`.
- Repo cloned at `/development/pos2`; `config.env` created from `config.env.example` (edit with real values for API_URL, WS_URL, CORS_ORIGINS, secrets).
- Docker and Docker Compose must be installed on amvara9 for the deploy to run containers.

## What you need to do: add the private key to GitHub

The workflow accepts **either** the raw private key (with `-----BEGIN ... END-----` lines) **or** its base64 encoding. Prefer the raw key so newlines are preserved.

1. **Get the private key** from amvara9 (one-time). SSH in and run:
   ```bash
   ssh amvara9 "cat /root/.ssh/github_deploy"
   ```
   Copy the **entire** output (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----` and all lines between).

2. **Add it as a repository secret** in GitHub:
   - Repo **pos2** → **Settings** → **Secrets and variables** → **Actions**
   - Create or update secret **`SSH_PRIVATE_KEY`**
   - Value: paste the full private key (raw PEM) or, alternatively, the single-line base64 from `base64 -w 0 /root/.ssh/github_deploy`
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
| `DEPLOY_PATH`  | `/development/pos2` | Project is in a different directory |

## Workflow

- **File:** `.github/workflows/deploy-amvara9.yml`
- **Trigger:** Push to `master` or `main`
- **Steps:** SSH to amvara9 → `git pull origin master` → `docker compose up --build -d` → run migrations

## First deploy

1. Ensure **Docker** and **Docker Compose** are installed on amvara9.
2. Edit `/development/pos2/config.env` on amvara9 with production values (API_URL, WS_URL, CORS_ORIGINS, SECRET_KEY, etc.). See [DEPLOYMENT.md](DEPLOYMENT.md).
3. Add `SSH_PRIVATE_KEY` in GitHub as above.
4. Push to `master` (or re-run the workflow from the Actions tab) to trigger the first deploy.
