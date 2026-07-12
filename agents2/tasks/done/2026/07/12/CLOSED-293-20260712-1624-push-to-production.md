---
## Closing summary (TOP)

- **What happened:** Production promotion of **37 commits** from `development` to `master`, deploying **v2.1.14** to amvara9 (satisfecho.de).
- **What was done:** Synced `development`, bumped version/changelog to 2.1.14, merged `development` → `master` at `0923c654`, and ran manual `deploy-amvara9.sh` after GHA SSH failure (#289).
- **What was tested:** Production smoke — landing app-version 2.1.14, `/api/health` 200, `/platform/login`, `/waitlist/1`, `/register`, and staff sidebar **Customers (Invoice)** under Operations (#290) — all **PASS**.
- **Why closed:** All promotion and post-deploy verification criteria passed; production is live at v2.1.14.
- **Closed at (UTC):** 2026-07-12 16:33
---

# Push to production

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/293
- **293**

## Problem / goal

Promote the latest tested work from **`development`** to **production on amvara9** (https://www.satisfecho.de). **`development`** is **37 commits ahead** of **`master`** (tip **`a8bfe7f9`**, v**2.1.13** from #289). Notable product work since the last promotion includes **#290** (left menu enhancement), **#291** (auto-enhance-and-review), **#292** (platform operator portal), and related agent/changelog tasks. Production still serves **v2.1.13** until this promotion lands.

## High-level instructions for coder

- Read **`docs/0001-ci-cd-amvara9.md`** and **`.cursor/rules/git-development-branch-workflow.mdc`**: promote via **`development` → `master`** merge (or fast-forward) + **`git push origin master`**, which triggers **`.github/workflows/deploy-amvara9.yml`**.
- Sync **`development`** with remote before promoting; confirm local smoke — `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/` → **200**; `docker logs --since 10m pos-front` — expect **`Application bundle generation complete`** with no standing TS/build errors.
- Review **`CHANGELOG.md`** `[Unreleased]` and bump **`front/package.json`** version if user-facing changes ship (platform operator, menu changes, etc.).
- Merge/promote only production-ready changes; if **deploy-amvara9** GHA fails on SSH (see **#289**), fall back to manual deploy: `ssh amvara9 'cd /development/pos && git fetch origin && git checkout -f master && git reset --hard origin/master && bash scripts/deploy-amvara9.sh'`.
- Post-deploy smoke: landing **app-version** meta (expect version beyond **2.1.13**), **`/api/health`** 200, spot-check **#292** `/platform/login`, **#290** grouped sidebar, and public routes (`/waitlist/1`, `/register`).
- This is **deploy/ops**, not feature coding — fix blocking defects on **`development`** only if deploy reveals them, then re-test and re-promote.
- Append **Testing instructions** when promotion and production verification are complete (include workflow run URL and smoke results).

## Testing instructions

### Promotion

- Synced **`development`**; local smoke **`curl http://127.0.0.1:4202/`** → **200**; front logs show **`Application bundle generation complete`** (transient TS errors from platform login work were resolved before final build).
- Bumped **`front/package.json`** / **`package-lock.json`** and **`CHANGELOG.md`** to **2.1.14** (commit **`4233b43d`** on **`development`**).
- Merged **`development` → `master`** and pushed **`origin/master`** at **`0923c654`**.

### Deploy

- **GitHub Actions:** [Deploy to amvara9 run #29200152615](https://github.com/satisfecho/pos/actions/runs/29200152615) — **failed** at SSH checkout (`Connection refused` from runners to **167.235.138.59:22**, same as #289).
- **Manual fallback:** `ssh amvara9 'cd /development/pos && git fetch origin && git checkout -f master && git reset --hard origin/master && bash scripts/deploy-amvara9.sh'` — **exit 0**, server at **`0923c654`**.

### Post-deploy smoke (https://www.satisfecho.de)

| Check | Result |
|-------|--------|
| Landing **`app-version`** meta | **2.1.14** |
| **`/api/health`** | **200** |
| **`/platform/login`** (#292) | **200** |
| **`/waitlist/1`** | **200** |
| **`/register`** | **200** |

### Follow-up for tester

- Log in as staff and confirm **Customers (Invoice)** appears under **Operations** in the grouped sidebar (#290).
- Optional: `BASE_URL=https://www.satisfecho.de node front/scripts/test-platform-operator.mjs` with platform operator credentials from server **`config.env`** (`PLATFORM_OPERATOR_EMAIL` / `PLATFORM_OPERATOR_PASSWORD`).
- GHA SSH from GitHub runners remains blocked; production deploys may need manual **`ssh amvara9`** until firewall/key access is fixed (#289).

---

## Test report

**Date/time (UTC):** 2026-07-12 16:32 UTC (log window ~16:00–16:32 UTC)

**Environment:** Production `https://www.satisfecho.de` (amvara9 @ `0923c654`, v**2.1.14**); local compose for cross-check; branch `development` @ `4233b43d`.

**What was tested:** Coder promotion/deploy evidence; production HTTP smoke; staff grouped sidebar #290 (Customers under Operations); deploy readiness signals per `020-test.md`.

**Results:**

| Criterion | Result | Evidence |
|-----------|--------|----------|
| Production at v2.1.14 | **PASS** | `curl` landing HTML: `app-version" content="2.1.14"` |
| `/api/health` 200 | **PASS** | `curl https://www.satisfecho.de/api/health` → 200 |
| Public routes (`/waitlist/1`, `/register`) | **PASS** | Both → HTTP 200 |
| `/platform/login` (#292) | **PASS** | HTTP 200 |
| Deploy on amvara9 @ `0923c654` | **PASS** | `ssh amvara9 git rev-parse --short HEAD` → `0923c654` (matches promoted `master`) |
| GHA deploy-amvara9 | **PASS** (manual fallback) | [Run #29200152615](https://github.com/satisfecho/pos/actions/runs/29200152615) failed SSH (known #289); manual `deploy-amvara9.sh` exit 0 per coder notes |
| Staff sidebar — **Customers (Invoice)** under **Operations** (#290) | **PASS** | Puppeteer on production: logged in as tenant-1 owner; expanded Operations → sublinks include `Customers (Invoice)` alongside Tables, Kitchen display, Beverages display |
| Optional platform-operator script | **SKIP** | No `platform-test@amvara.de` user on production DB; `/platform/login` page loads (200) — full operator login not seeded on prod |

**Overall:** **PASS**

**Product owner feedback:** Release **2.1.14** is live on satisfecho.de with health and public routes responding. The grouped left menu (#290) is visible in production: **Customers (Invoice)** sits under **Operations** as intended. CI SSH deploy remains broken (#289); manual amvara9 deploy succeeded. Consider seeding a platform-operator test account on production if ongoing operator smoke is needed.

**URLs tested:**

1. https://www.satisfecho.de/
2. https://www.satisfecho.de/api/health
3. https://www.satisfecho.de/login (staff sidebar verification)
4. https://www.satisfecho.de/platform/login
5. https://www.satisfecho.de/waitlist/1
6. https://www.satisfecho.de/register

**Relevant log excerpts:**

```
Deploy signal: amvara9 HEAD=0923c654, app-version=2.1.14, health=200
GHA run #29200152615: conclusion=failure (SSH Connection refused — manual deploy used)
Production Operations sublinks: Tables, Kitchen display, Beverages display, Customers (Invoice)
```
