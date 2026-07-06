---
## Closing summary (TOP)

- **What happened:** Operational request to promote tested work from `development` to production on amvara9 (satisfecho.de).
- **What was done:** Merged `development` → `master` at commit `82d19010`, pushed to `origin/master`, and shipped the table-token menu dedup fix (#278) plus agent-loop chore commits; GitHub Actions deploy-amvara9 workflow completed successfully (~2m34s).
- **What was tested:** Local smoke (HTTP 200, front build OK), production curls and Puppeteer `test:landing-version` against https://www.satisfecho.de, and table-token menu dedup on production — all **PASS** (v2.1.8 / hash `82d19010`, healthy API, no duplicate dishes).
- **Why closed:** All deploy and post-deploy verification criteria passed; tester overall **PASS**.
- **Closed at (UTC):** 2026-07-06 08:30
---

---
## Closing summary (TOP)

- **What happened:** Operational request to promote tested work from `development` to production on amvara9 (satisfecho.de).
- **What was done:** Merged `development` → `master` at commit `82d19010`, pushed to `origin/master`, and shipped the table-token menu dedup fix (#278) plus agent-loop chore commits; GitHub Actions deploy-amvara9 workflow completed successfully (~2m34s).
- **What was tested:** Local smoke (HTTP 200, front build OK), production curls and Puppeteer `test:landing-version` against https://www.satisfecho.de, and table-token menu dedup on production — all **PASS** (v2.1.8 / hash `82d19010`, healthy API, no duplicate dishes).
- **Why closed:** All deploy and post-deploy verification criteria passed; tester overall **PASS**.
- **Closed at (UTC):** 2026-07-06 08:30
---

# Deploy to production

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/279
- **279**

## Problem / goal

Ship the latest tested work from **`development`** to **production on amvara9** (satisfecho.de). This is an operational deploy request: promote the production branch, let the automated GitHub Actions workflow run, and verify post-deploy smoke checks succeed.

Recent **`development`** includes product fixes (e.g. duplicate products on table-token ordering menu, #278) plus agent-loop chore commits; confirm what should ship before promoting.

## High-level instructions for coder

- Read **`docs/0001-ci-cd-amvara9.md`** and **`.cursor/rules/git-development-branch-workflow.mdc`**: routine deploy is **`development` → `master`** merge (or fast-forward) followed by **`git push origin master`**, which triggers **`.github/workflows/deploy-amvara9.yml`**.
- Before promoting: sync **`development`** with remote; run local smoke — e.g. `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/` → **200**; `docker logs --since 10m pos-front` — no Angular build errors (currently green as of 2026-07-06).
- Merge/promote only changes intended for production; do **not** push unrelated WIP. Prior deploy task **`CLOSED-277-20260629-0652-deploy-to-production.md`** documents the expected verification pattern.
- After push to **`master`**: monitor the **deploy-amvara9** workflow until success; confirm post-deploy smoke (landing, app-version meta, `/api/health` against https://www.satisfecho.de per workflow).
- If deploy fails: check amvara9 logs via SSH (`docker compose --env-file config.env -f docker-compose.yml -f docker-compose.prod.yml ps|logs`) and **`scripts/deploy-amvara9.sh`** (migrations, health wait) — see **`docs/0001-ci-cd-amvara9.md`** troubleshooting.
- This task is **deploy/ops**, not application feature work: no product code changes unless deploy reveals a blocking defect (fix on **`development`**, re-test, re-promote).
- Append **Testing instructions** when promotion and production verification are complete (include workflow run URL and smoke results).

## Testing instructions

**Pre-deploy (local):**
- `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/` → **200**
- `docker logs --since 10m pos-front` — no Angular build errors

**Promotion:**
- Merged `development` → `master` at commit **`82d19010`** (`Merge development: deploy to production (issue #279)`)
- Pushed to `origin/master`

**Changes shipped:**
- Fix duplicate products on table-token ordering menu (#278) — `GET /menu/{table_token}` dedup
- Agent-loop chore commits (reviewer timestamps only; no product impact)

**GitHub Actions deploy:**
- Workflow: https://github.com/satisfecho/pos/actions/runs/28778133751
- Result: **success** (2m34s)
- All steps green: marketing artifacts fetch, SSH checkout on amvara9, marketing sync, build/restart, post-deploy smoke

**Post-deploy smoke (workflow + manual):**
- Workflow smoke against https://www.satisfecho.de: **passed** (landing, app-version meta, `/api/health`)
- Manual: `curl https://www.satisfecho.de/` → **200**; `curl https://www.satisfecho.de/api/health` → **`{"status":"ok"}`**
- Puppeteer `test:landing-version` (`LANDING_VERSION_ONLY=1`): **PASS** — version **2.1.8**, hash **82d19010**, one "Restaurant Demo" card

**Optional tester checks:**
- `cd front && BASE_URL=https://www.satisfecho.de HEADLESS=1 npm run test:landing-version`
- Table-token menu: open ordering menu via table QR or landing Take Away demo — each dish should appear once (#278)

---

## Test report

1. **Date/time (UTC):** 2026-07-06 08:30 UTC — log window ~08:20–08:30 UTC
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml` locally (`BASE_URL=http://127.0.0.1:4202`); production `BASE_URL=https://www.satisfecho.de`; branch **`master`** @ **`82d19010`**
3. **What was tested:** Pre-deploy local smoke, GitHub Actions deploy confirmation, post-deploy production HTTP/Puppeteer smoke, app version/hash on production, table-token menu dedup (#278)
4. **Results:**
   - Local `curl http://127.0.0.1:4202/` → **200** — **PASS**
   - Local `pos-front` build — **PASS** (no Angular/TS errors in last 10m; grep empty)
   - Promotion at commit **`82d19010`** on **`master`** — **PASS** (confirmed via production footer hash)
   - GitHub Actions workflow [28778133751](https://github.com/satisfecho/pos/actions/runs/28778133751) — **PASS** (`gh run view`: conclusion `success`, completed 2026-07-06T08:28:39Z)
   - Production `curl https://www.satisfecho.de/` → **200** — **PASS**
   - Production `curl https://www.satisfecho.de/api/health` → **`{"status":"ok"}`** — **PASS**
   - Puppeteer `test:landing-version` (`LANDING_VERSION_ONLY=1`) — **PASS** (version **2.1.8**, hash **82d19010**, one "Restaurant Demo" card)
   - Table-token menu dedup (#278) — **PASS** (landing demo → `/menu/4177c86c-…`: 9 product cards, no duplicate names; `tests/test_get_menu_dedup.py` 2 passed in Docker)
5. **Overall:** **PASS**
6. **Product owner feedback:** Production deploy completed successfully (~2m34s workflow). satisfecho.de serves v2.1.8 at commit 82d19010 with healthy API, expected demo landing, and no duplicate dishes on the table-token ordering menu. The #278 fix is live and verified end-to-end on production.
7. **URLs tested:**
   1. http://127.0.0.1:4202/
   2. https://www.satisfecho.de/
   3. https://www.satisfecho.de/api/health
   4. https://www.satisfecho.de/menu/4177c86c-314b-420c-a349-e61c6c6407f1
8. **Relevant log excerpts:**
   - `pos-front`: no build errors in window (grep for error/TS/NG/failed returned empty)
   - `pos-back`: no errors/exceptions in window
   - Puppeteer landing: `Version element text: 2.1.8 82d19010…`; `OK: One restaurant card titled "Restaurant Demo"`
   - Puppeteer menu dedup: `Product cards: 9`; `PASS no duplicate product names in grid`
   - Deploy signal: `gh run view 28778133751` → `"conclusion":"success"`
