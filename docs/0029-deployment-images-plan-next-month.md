# Deployment: Images & stability — plan for next month

**Status:** Todo plan (next month)  
**Related:** [0004-deployment.md](0004-deployment.md), [0001-ci-cd-amvara9.md](0001-ci-cd-amvara9.md), [0024-deploy-css-fix-amvara9.md](0024-deploy-css-fix-amvara9.md)

---

## Goal

- **More secure, stable production deploys** (fewer failures, no “containers not running”).
- **Production stays up** during deploy (build new stack, then switch traffic, then stop old).
- **Catch build errors before deploy** (e.g. TS/production build in CI).
- **Use container images** (build in CI, push to registry, server only pulls and runs).

---

## 1. Use images (registry-based deploy)

**Current:** Build front/back on amvara9 during deploy → slow, OOM risk, failure leaves prod down.

**Target:** Build in GitHub Actions → push to registry (GHCR) → on amvara9 only **pull** and run.

**Needs:**

- **Registry:** GitHub Container Registry (ghcr.io). Confirm org/repo for image names, e.g. `ghcr.io/satisfecho/pos-front`, `pos-back`.
- **Image visibility:** Private (recommended) or public. If private, server must log in to pull.
- **Credentials:**
  - **CI:** Use `GITHUB_TOKEN` with `packages: write` to push (no extra secret in config.env).
  - **Server:** Not in `config.env`. Either (a) run `docker login ghcr.io` once on amvara9, or (b) use a separate file (e.g. `.env.registry` with `REGISTRY_USER` / `REGISTRY_PASSWORD`), gitignored, only for deploy script `docker login`.

---

## 2. Production stays up (two-slot / blue-green)

**Current:** Deploy script does `down` then build then `up` → if build/up fails, prod is down.

**Target:** Build new stack **while current one runs**, then switch traffic, then stop old.

**Options:**

- **Two directories on amvara9:** e.g. `/development/pos` (live) and `/development/pos-next` (build + next). Deploy in `pos-next`, start new stack on different host ports (e.g. 4201, 8022, 8023), health-check, point HAProxy at new ports, reload, then stop old stack in `pos`. Next deploy alternate (deploy into the directory that was just stopped).
- **Same directory, two compose project names:** e.g. `pos-blue` and `pos-green`, alternate ports, same idea: start “next” slot, switch proxy, stop “live” slot.

**Implementation:** Deploy script (and optionally compose overrides) for two slots + HAProxy config that can point to either set of ports.

---

## 3. Catch errors before deploy (CI)

**Current:** Production front build only runs on the server; TS errors (e.g. `Permission` type) can reach prod.

**Target:** Run the **same production front build** in CI; deploy only if it passes.

**Implementation:**

- Add a CI job (e.g. `build-front`) that runs `npm ci --ignore-scripts` in `front/` then `npm run build -- --configuration production-static` (Node version matching Dockerfile.prod, e.g. 20).
- Run on push to master/main (and optionally on PRs to that branch).
- Deploy job has `needs: [build-front]` (and later `needs: [build-front, push-images]` when using images).

---

## 4. What you (maintainer) need to do

**Decisions:**

- [ ] Confirm registry: GHCR with image names e.g. `ghcr.io/satisfecho/pos-front`, `pos-back`.
- [ ] Confirm image visibility: private (recommended) or public.

**One-time on GitHub:**

- [ ] Ensure GitHub Packages / Container registry is enabled for the repo (or org).
- [ ] If private images: create a PAT with `read:packages` for use on the server (store safely).

**One-time on amvara9:**

- [ ] If private images: run `docker login ghcr.io -u <USER> -p <PAT>` once (or create `.env.registry` and add it to `.gitignore` if deploy script will do login from file).

---

## 5. What gets implemented (repo/CI)

- [ ] **CI:** Job to build front (production config); deploy job depends on it.
- [ ] **CI:** Job to build front + back images, tag (e.g. `latest` + commit SHA), push to GHCR.
- [ ] **Compose:** Production override (or env) to use `image:` for front/back instead of `build:`, with `IMAGE_TAG` (or similar).
- [ ] **Deploy script:** No build on server; optional `docker login` from `.env.registry`; `docker compose pull` then `up` (with two-slot strategy if implemented).
- [ ] **Two-slot deploy:** Second directory or second compose project, alternate ports, HAProxy switch, then stop old stack.
- [ ] **Docs:** Update deployment docs (0004, 0001) with registry, image names, and “production stays up” flow.

---

## 6. Out of scope (for this plan)

- **Kubernetes:** Not planned; Compose + images is enough for single-server.
- **config.env:** No registry password in config.env; app config stays as is.

---

## Summary checklist (next month)

| Item | Owner | Done |
|------|--------|------|
| Decide registry + visibility | You | |
| One-time GHCR + PAT (if private) | You | |
| One-time docker login on amvara9 (or .env.registry) | You | |
| CI: production front build job | Repo | |
| CI: build & push images to GHCR | Repo | |
| Compose: use image for front/back in prod | Repo | |
| Deploy script: pull only, no build | Repo | |
| Two-slot (dirs or project names) + HAProxy switch | Repo | |
| Update deployment docs | Repo | |
