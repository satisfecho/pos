---
## Closing summary (TOP)

- **What happened:** Operational deploy request (#281) to promote tested work from `development` to production on amvara9 (satisfecho.de).
- **What was done:** `development` → `master` promoted twice (`6ec55710` with #280 Take Away fix + v2.1.10, then `f0433b5a` hotfix clearing stale demo product backfills); both deploy-amvara9 workflows succeeded.
- **What was tested:** Local smoke, production health/landing (v2.1.10 / `f0433b5a`), Puppeteer landing-version, Take Away menu API and browser flow (#280), and pytest `test_link_demo_products_to_catalog.py` — all **PASS**.
- **Why closed:** Tester report **PASS**; all deploy and production verification criteria met.
- **Closed at (UTC):** 2026-07-06 22:47
---

# Deploy to production

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/281
- **281**

## Problem / goal

Ship the latest tested work from **`development`** to **production on amvara9** (satisfecho.de). This is an operational deploy request: promote the production branch, let the automated GitHub Actions workflow run, and verify post-deploy smoke checks succeed.

**`development`** was ahead of **`master`** (previously **`82d19010`** on production) and included the demo Take Away catalog-image fix (**#280**, commit **`503efa2d`**) plus agent-loop chore commits.

## High-level instructions for coder

- Read **`docs/0001-ci-cd-amvara9.md`** and **`.cursor/rules/git-development-branch-workflow.mdc`**: routine deploy is **`development` → `master`** merge (or fast-forward) followed by **`git push origin master`**, which triggers **`.github/workflows/deploy-amvara9.yml`**.
- Before promoting: sync **`development`** with remote; run local smoke — e.g. `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/` → **200**; `docker logs --since 10m pos-front` — no Angular build errors (green as of 2026-07-06).
- Merge/promote only changes intended for production; do **not** push unrelated WIP. Prior deploy task **`CLOSED-279-20260706-0825-deploy-to-production.md`** documents the expected verification pattern.
- After push to **`master`**: monitor the **deploy-amvara9** workflow until success; confirm post-deploy smoke (landing, app-version meta, `/api/health` against https://www.satisfecho.de per workflow).
- Verify **#280** on production after deploy: Landing → **Probar demo: Take Away** → **Coca Cola** should not show beer catalog image/description.
- If deploy fails: check amvara9 logs via SSH (`docker compose --env-file config.env -f docker-compose.yml -f docker-compose.prod.yml ps|logs`) and **`scripts/deploy-amvara9.sh`** — see **`docs/0001-ci-cd-amvara9.md`** troubleshooting.
- This task is **deploy/ops**, not application feature work: no product code changes unless deploy reveals a blocking defect (fix on **`development`**, re-test, re-promote).
- Append **Testing instructions** when promotion and production verification are complete (include workflow run URL and smoke results).

## Implementation notes

- First promotion at **`6ec55710`** shipped #280 but production still had stale `Product` image/description from prior round-robin `/products` backfill (orphaned after link repair).
- Blocking fix on **`development`** (`9cad6648`): `repair_stale_product_backfills()` in `link_demo_products_to_catalog.py` clears catalog-like backfills when no `TenantProduct` link remains.
- Second promotion at **`f0433b5a`** (merge of fix) redeployed; production Take Away beverages now show no beer catalog content.

## Testing instructions

**Pre-deploy (local):**
- `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/` → **200**
- `docker logs --since 10m pos-front` — no Angular build errors

**Promotion (two pushes to `master`):**
1. `6ec55710` — `Merge development: deploy to production (issue #281)` (#280 + v2.1.10)
2. `f0433b5a` — `Merge development: clear stale demo product backfills (#281)` (production data repair)

**Changes shipped:**
- Fix demo Take Away beverages showing wrong catalog images (#280) — name-match-only linking
- Clear stale `Product` backfill after bad catalog links removed (`9cad6648`)
- Version **2.1.10** (from #280 changelog bump)
- Agent-loop chore commits (reviewer timestamps only; no product impact)

**GitHub Actions deploy:**
- Initial: https://github.com/satisfecho/pos/actions/runs/28827977150 — **success** (~2m29s)
- Hotfix redeploy: https://github.com/satisfecho/pos/actions/runs/28828238305 — **success** (~2m29s)
- All steps green: marketing artifacts, SSH checkout, build/restart, post-deploy smoke

**Post-deploy smoke (workflow + manual):**
- Workflow smoke against https://www.satisfecho.de: **passed** (landing, app-version meta, `/api/health`)
- Manual: `curl https://www.satisfecho.de/` → **200**; `curl https://www.satisfecho.de/api/health` → **`{"status":"ok"}`**
- Puppeteer `test:landing-version` (`LANDING_VERSION_ONLY=1`): **PASS** — version **2.1.10**, hash **f0433b5a**, one "Restaurant Demo" card

**#280 production verification (Take Away menu API):**
- Token `4177c86c-314b-420c-a349-e61c6c6407f1`
- `GET /api/menu/{token}` — **Coca Cola** and **Café americano**: `image_filename: null`, `description: null` (no beer catalog content)

**Optional tester checks:**
- `cd front && BASE_URL=https://www.satisfecho.de HEADLESS=1 npm run test:landing-version`
- Landing → **Probar demo: Take Away** → open **Coca Cola** — no beer photo or beer description
- `docker exec -w /app pos-back python3 -m pytest tests/test_link_demo_products_to_catalog.py -q` (5 passed locally)

---

## Test report

1. **Date/time (UTC):** 2026-07-06T22:45:24Z – 2026-07-06T22:47:09Z. Log window: last 10 minutes (`pos-front`, `pos-back`).

2. **Environment:** Branch **`development`** (synced); local compose `docker-compose.yml` + `docker-compose.dev.yml`; production **`BASE_URL=https://www.satisfecho.de`**. Deploy confirmed via GitHub Actions run https://github.com/satisfecho/pos/actions/runs/28828238305 (**success**, completed 2026-07-06T22:44:21Z) — production already live at **`f0433b5a`** / **v2.1.10** before tester run (no new deploy this cycle).

3. **What was tested:** Pre-deploy local smoke; production health/landing; landing-version Puppeteer; Take Away menu API (#280); browser flow Landing → Take Away demo → Coca Cola detail; pytest `test_link_demo_products_to_catalog.py`.

4. **Results:**
   - Local landing `curl http://127.0.0.1:4202/` → **200** — **PASS**
   - `pos-front` logs (10m): no Angular/TS build errors — **PASS**
   - Production `/api/health` → `{"status":"ok"}`; landing **200** — **PASS**
   - Puppeteer `test:landing-version` (production): version **2.1.10**, hash **f0433b5a**, one "Restaurant Demo" card — **PASS**
   - Menu API token `4177c86c-314b-420c-a349-e61c6c6407f1`: Coca Cola & Café americano `image_filename: null`, `description: null` — **PASS**
   - Browser: Landing → Try demo Take Away → select Demo Restaurant → Coca Cola detail sheet: no product image, no beer text — **PASS**
   - `pytest tests/test_link_demo_products_to_catalog.py`: 5 passed — **PASS**

5. **Overall:** **PASS** (all criteria passed).

6. **Product owner feedback:** Production deploy for #281 is verified end-to-end. The #280 Take Away fix is live: beverages no longer show stale beer catalog images or descriptions. v2.1.10 is serving on satisfecho.de with commit hash matching the hotfix promotion.

7. **URLs tested:**
   1. https://www.satisfecho.de/
   2. https://www.satisfecho.de/api/health
   3. https://www.satisfecho.de/api/menu/4177c86c-314b-420c-a349-e61c6c6407f1
   4. https://www.satisfecho.de/menu/4177c86c-314b-420c-a349-e61c6c6407f1

8. **Relevant log excerpts:**
   - `pos-front`: `Application bundle generation complete. [0.203 seconds] - 2026-07-06T22:36:11.510Z` (no errors in 10m window)
   - Puppeteer landing: `Version element text: 2.1.10 f0433b5a…` / `OK: One restaurant card titled "Restaurant Demo"`
   - Take Away UI: `Coca Cola detail text: Coca Cola€3.00 Add to cart · €3.00`; `Visible images: 0 []`
   - pytest: `5 passed in 0.90s`
