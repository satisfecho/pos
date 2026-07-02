---
## Closing summary (TOP)

- **What happened:** Operational request to promote tested work from `development` to production on amvara9 (satisfecho.de).
- **What was done:** Merged `development` → `master` at commit `34e1eed4`, pushed to `origin/master`, and shipped courier order list/detail (#275), landing tenant filter (#276), and v2.1.7; GitHub Actions deploy-amvara9 workflow completed successfully.
- **What was tested:** Local smoke (HTTP 200, front build OK), production curls and Puppeteer `test:landing-version` against https://www.satisfecho.de — all **PASS** (v2.1.7 / hash `34e1eed4`, single "Restaurant Demo" card); courier UI not browser-tested (no prod credentials).
- **Why closed:** All deploy and post-deploy verification criteria passed; tester overall **PASS**.
- **Closed at (UTC):** 2026-06-29 06:59
---

# Deploy to production

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/277
- **277**

## Problem / goal

Ship the latest tested work from **`development`** to **production on amvara9** (satisfecho.de). The request is operational: promote the production branch and verify the automated deploy and post-deploy smoke checks succeed.

## High-level instructions for coder

- Read **`docs/0001-ci-cd-amvara9.md`** and **`.cursor/rules/git-development-branch-workflow.mdc`**: routine deploy is **`development` → `master`** merge (or fast-forward) followed by **`git push origin master`**, which triggers **`.github/workflows/deploy-amvara9.yml`**.
- Before promoting: ensure **`development`** is synced with remote and local smoke is green (e.g. `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/` → 200; `docker logs --since 10m pos-front` — no Angular build errors).
- Merge/promote only when **`development`** contains the changes intended for production; do **not** push unrelated WIP.
- After push to **`master`**: monitor the GitHub Actions **deploy-amvara9** workflow until it completes; confirm post-deploy smoke (landing, app-version meta, `/api/health` against https://www.satisfecho.de per workflow).
- If deploy fails: check amvara9 logs via SSH (`docker compose --env-file config.env -f docker-compose.yml -f docker-compose.prod.yml ps|logs`) and **`scripts/deploy-amvara9.sh`** behaviour (migrations, health wait) — see **`docs/0001-ci-cd-amvara9.md`** troubleshooting sections.
- This task is **deploy/ops**, not application feature work: no product code changes unless deploy reveals a blocking defect (then fix on **`development`**, re-test, and re-promote).
- Append **Testing instructions** when promotion and production verification are complete (include workflow run URL and smoke results).

## Testing instructions

**Pre-deploy (local):**
- `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/` → **200**
- `docker logs --since 10m pos-front` — no Angular build errors

**Promotion:**
- Merged `development` → `master` at commit **`34e1eed4`** (`Merge development: deploy to production (issue #277)`)
- Pushed to `origin/master`

**Changes shipped:**
- Courier delivery order list and detail view (Phase 2, #275)
- Public landing shows only Restaurant Demo tenant (#276)
- Version bump and i18n for courier flows

**GitHub Actions deploy:**
- Workflow: https://github.com/satisfecho/pos/actions/runs/28354143046
- Result: **success** (2m54s)
- All steps green: marketing artifacts fetch, SSH checkout on amvara9, marketing sync, build/restart, post-deploy smoke

**Post-deploy smoke (workflow + manual):**
- Workflow smoke against https://www.satisfecho.de: **passed** (landing, app-version meta, `/api/health`)
- Manual: `curl https://www.satisfecho.de/` → **200**; `curl https://www.satisfecho.de/api/health` → **200**

**Optional tester checks:**
- `cd front && BASE_URL=https://www.satisfecho.de HEADLESS=1 npm run test:landing-version`
- Confirm landing lists only "Restaurant Demo" tenant card
- Courier role: verify order list and detail at `/courier` (if test credentials available)

---

## Test report

1. **Date/time (UTC):** 2026-06-29 06:58 UTC — log window ~06:48–06:58 UTC
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml` locally (`BASE_URL=http://127.0.0.1:4202`); production `BASE_URL=https://www.satisfecho.de`; branch **`master`** @ **`34e1eed4`**
3. **What was tested:** Pre-deploy local smoke, GitHub Actions deploy confirmation, post-deploy production HTTP/Puppeteer smoke, landing tenant filter (#276), app version/hash on production
4. **Results:**
   - Local `curl http://127.0.0.1:4202/` → **200** — **PASS** (`curl -s -o /dev/null -w "%{http_code}"` returned 200)
   - Local `pos-front` build — **PASS** (transient TS2307 errors at 06:53:55–06:53:56 during hot-reload; recovered with `Application bundle generation complete` at 06:53:58)
   - Promotion at commit **`34e1eed4`** on **`master`** — **PASS** (confirmed via production footer hash)
   - GitHub Actions workflow [28354143046](https://github.com/satisfecho/pos/actions/runs/28354143046) — **PASS** (`gh run view`: conclusion `success`, completed 06:56:56 UTC)
   - Production `curl https://www.satisfecho.de/` → **200** — **PASS**
   - Production `curl https://www.satisfecho.de/api/health` → **`{"status":"ok"}`** — **PASS**
   - Puppeteer `test:landing-version` (`LANDING_VERSION_ONLY=1`) — **PASS** (version **2.1.7**, hash **34e1eed4**, one "Restaurant Demo" card)
   - Landing lists only Restaurant Demo tenant — **PASS** (Puppeteer step 1b + version element text)
   - Courier `/courier` flow — **N/A** (no production courier test credentials in env)
5. **Overall:** **PASS**
6. **Product owner feedback:** Production deploy completed successfully in under 3 minutes. satisfecho.de serves v2.1.7 at commit 34e1eed4 with healthy API and the expected single demo tenant on the public landing. Courier UI was not browser-tested here; consider adding prod-safe courier smoke credentials if ongoing deploy verification should cover that route.
7. **URLs tested:**
   1. http://127.0.0.1:4202/
   2. https://www.satisfecho.de/
   3. https://www.satisfecho.de/api/health
8. **Relevant log excerpts:**
   - `pos-front` (06:53:58 UTC): `Application bundle generation complete. [1.030 seconds]`
   - `pos-back`: no errors in window; `/docs` 200 OK
   - Puppeteer: `Version element text: 2.1.7 34e1eed4…`; `OK: One restaurant card titled "Restaurant Demo"`
   - Deploy signal: `gh run view 28354143046` → `"conclusion":"success"`
