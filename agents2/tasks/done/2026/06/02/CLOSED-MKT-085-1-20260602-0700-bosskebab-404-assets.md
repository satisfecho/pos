---
## Closing summary (TOP)

- **What happened:** Production `/bosskebabypizzeria/` was blank because built `index.html` used `<base href="/boss-kebab/es/">`, so Angular chunks resolved under the wrong path and returned 404.
- **What was done:** In `satisfecho/085_Bosskebabypizzeria` (`23c3c92` on `main`), aligned `baseHref`, `deployPathPrefix`, CI artifact layout, and docs to `bosskebabypizzeria`; **Deploy to amvara9** run 26804705034 synced the fixed bundle to satisfecho.de (no POS `marketing-sites.json` change).
- **What was tested:** Re-test on production after deploy (2026-06-02 ~07:22 UTC): marketing CI green, correct base href, chunk assets HTTP 200, Chrome shows styled site and locale switch — **PASS** on criteria 1–5.
- **Why closed:** Tester overall **PASS** after redeploy; live site restored for visitors.
- **Closed at (UTC):** 2026-06-02 07:25
---

# 404 Error on page load: Failed to load JS and CSS resources (Broken/Outdated Assets)

## GitHub
- **Issue:** https://github.com/satisfecho/085_Bosskebabypizzeria/issues/1
- **Marketing repo:** satisfecho/085_Bosskebabypizzeria
- **MKT-085-1**
- **Live path:** https://www.satisfecho.de/bosskebabypizzeria/

## Problem / goal
Production page at `/bosskebabypizzeria/` is blank or unstyled. Browser console shows **404** for the built Angular chunks (`polyfills-2NJIWUID.js`, `main-RHJGHSPU.js`, `styles-VKX3FXJW.css`). High urgency — site does not render.

**Likely cause (005 scan):** Deployed `index.html` uses `<base href="/boss-kebab/es/">` while POS serves the SPA at **`/bosskebabypizzeria/`**, so relative script/style URLs resolve under `/boss-kebab/es/` instead of the live slug path.

## Implementation (feature coder)

**Marketing repo** `satisfecho/085_Bosskebabypizzeria` commit `23c3c92` on `main`:

- `angular.json`: all locale `baseHref` values `/boss-kebab/…` → `/bosskebabypizzeria/…`
- `environment.ts` / `environment.prod.ts`: `deployPathPrefix` → `bosskebabypizzeria`
- `src/index.html`: dev base-rewrite script `deploy` segment updated
- `.github/workflows/build.yml`: artifact layout aligned with Wimpi (`index.html` redirect + `es/` subtree) for `front/sites/bosskebabypizzeria/`
- `deploy/README.md` updated for live slug path

**POS repo:** no `config/marketing-sites.json` change (slug and artifact name unchanged).

**CI:** GitHub Actions Build on `main` — **success**; artifact `boss-kebab-satisfecho-deploy` uploaded.

Production on satisfecho.de updates after POS **Deploy to amvara9** (or manual `sync-all-marketing-sites` on server) pulls the new artifact.

## Handoff log

- **Handoff (`012-feature-coder-handoff.md`, 2026-06-02, user `012` pass — Cursor):** `./scripts/git-sync-development.sh` (OK). Marketing repo **`085_Bosskebabypizzeria`** @ **`23c3c92`**: `baseHref` / `deployPathPrefix` aligned to **`bosskebabypizzeria`**, CI green (Build run 26804039764). Prior **Test report** **FAIL** on criteria **(2–5)** (prod bundle stale) resolved — **Deploy to amvara9** run 26804705034 **success** @ `2026-06-02T07:18:31Z` (after marketing Build). Production now serves `<base href="/bosskebabypizzeria/es/">`; **`main-6KBVB2HY.js`**, **`polyfills-2NJIWUID.js`**, **`styles-VKX3FXJW.css`** → **200** under `/bosskebabypizzeria/es/`. **Testing instructions** present. Per **TASKS-README.md**, implementation **complete**. **`WIP-MKT-085-1-…` → `UNTESTED-MKT-085-1-20260602-0700-bosskebab-404-assets.md`**; **`gh issue edit 1 --repo satisfecho/085_Bosskebabypizzeria --add-label "agent:untested"`**.

## Testing instructions

1. Confirm marketing CI green: `gh run list --repo satisfecho/085_Bosskebabypizzeria --limit 1` → `completed success`.
2. After amvara9 deploy / marketing sync, verify HTML base:
   - `curl -sfL https://www.satisfecho.de/bosskebabypizzeria/es/ | grep -o '<base href="[^"]*"'` → must be `<base href="/bosskebabypizzeria/es/">` (not `/boss-kebab/`).
3. Root redirect: `curl -sfL https://www.satisfecho.de/bosskebabypizzeria/` → redirect or meta refresh to `es/`.
4. Assets load (no 404):
   - `curl -sfI https://www.satisfecho.de/bosskebabypizzeria/es/main-PMOEUUCU.js` (hash may differ after rebuild) → `200`
   - Same for `polyfills-*.js` and `styles-*.css` paths under `/bosskebabypizzeria/es/`.
5. Browser: open https://www.satisfecho.de/bosskebabypizzeria/ — styled Boss Kebab page, no console 404 on chunks; language switcher navigates under `/bosskebabypizzeria/{locale}/`.
6. Optional local: clone repo, `npm ci --ignore-scripts && npm run build:satisfecho`, inspect `dist/boss-kebab-y-pizzeria/browser/es/index.html` for correct `<base href>`.

---

## Test report

**Date/time (UTC):** 2026-06-02 07:05:03 – 07:10:26 (poll window through timeout)  
**Log window:** N/A — production static site; no local Docker containers exercised for this task.

### Environment

- **Branch:** `development` (synced, up to date)
- **Target:** Production `https://www.satisfecho.de/bosskebabypizzeria/`
- **Marketing CI:** https://github.com/satisfecho/085_Bosskebabypizzeria/actions/runs/26804039764 (`completed` / `success`, commit `23c3c92`, 2026-06-02T07:02:50Z)
- **POS deploy:** https://github.com/satisfecho/pos/actions/runs/26803925488 (`completed` / `success`, 2026-06-02T07:00:11Z) — finished **before** marketing Build uploaded the fixed artifact (~07:03:30Z)

### What was tested

Marketing repo path fix (baseHref / deploy slug) and production delivery via amvara9 marketing sync.

### Results

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | Marketing CI green | **PASS** | `gh run list --repo satisfecho/085_Bosskebabypizzeria --limit 1` → `completed success` (run 26804039764) |
| 2 | HTML `<base href="/bosskebabypizzeria/es/">` | **FAIL** | `curl -sfL …/bosskebabypizzeria/es/` → `<base href="/boss-kebab/es/">` at 07:05–07:10 UTC (15× poll, 20s interval, 5 min timeout) |
| 3 | Root redirect to `es/` | **FAIL** | `GET /bosskebabypizzeria/` → HTTP 200 with same broken `index.html` (no redirect); client script only rewrites URL bar |
| 4 | Chunk assets HTTP 200 under `/bosskebabypizzeria/es/` | **FAIL** | `main-RHJGHSPU.js`, `polyfills-2NJIWUID.js`, `styles-VKX3FXJW.css` → **404** on both `/bosskebabypizzeria/es/` and `/boss-kebab/es/` paths |
| 5 | Browser: styled page, no console 404 | **FAIL** | Chrome: blank/unstyled shell; network 404 for `/boss-kebab/es/{polyfills,main,styles}-*.js/css` |
| 6 | Optional local build inspect | **SKIP** | Production gate failed; redeploy required first |

### Overall: **FAIL**

Failed criteria: **2, 3, 4, 5**. Marketing fix is built and artifact uploaded, but **production still serves the pre-fix bundle** because the last **Deploy to amvara9** (07:00:11Z) completed before the fixed marketing artifact existed. **Action:** re-run **Deploy to amvara9** (or `sync-all-marketing-sites.sh` on amvara9) so `front/sites/bosskebabypizzeria/` picks up artifact from run 26804039764, then return task to **UNTESTED-**.

### Product owner feedback

The code change in the marketing repo looks correct and CI is green, but the live site is still broken for visitors. Until a deploy/sync runs **after** the successful Build, `/bosskebabypizzeria/` will keep loading scripts from `/boss-kebab/es/` and show a blank page. Please trigger deploy and re-queue verification.

### URLs tested

1. https://www.satisfecho.de/bosskebabypizzeria/
2. https://www.satisfecho.de/bosskebabypizzeria/es/
3. https://www.satisfecho.de/boss-kebab/es/main-RHJGHSPU.js (browser-resolved path, 404)
4. https://www.satisfecho.de/boss-kebab/es/polyfills-2NJIWUID.js (404)
5. https://www.satisfecho.de/boss-kebab/es/styles-VKX3FXJW.css (404)

### Relevant log excerpts

Browser network (2026-06-02 ~07:05 UTC):

```
GET https://www.satisfecho.de/bosskebabypizzeria/ → 200
GET https://www.satisfecho.de/boss-kebab/es/polyfills-2NJIWUID.js → 404
GET https://www.satisfecho.de/boss-kebab/es/main-RHJGHSPU.js → 404
GET https://www.satisfecho.de/boss-kebab/es/styles-VKX3FXJW.css → 404
```

Console: `Failed to load resource: the server responded with a status of 404` (×3).

Production HTML snippet (`/bosskebabypizzeria/es/`, Last-Modified: Tue, 02 Jun 2026 07:02:13 GMT):

```html
<base href="/boss-kebab/es/">
```

---

## Test report (re-test after deploy 26804705034)

**Date/time (UTC):** 2026-06-02 07:22:52 – 07:24:10  
**Log window:** N/A — production static site; no local Docker containers exercised.

### Environment

- **Branch:** `development` (synced via `./scripts/git-sync-development.sh`, up to date)
- **Target:** Production `https://www.satisfecho.de/bosskebabypizzeria/`
- **Marketing CI:** https://github.com/satisfecho/085_Bosskebabypizzeria/actions/runs/26804039764 (`completed` / `success`, commit `23c3c92`, 2026-06-02T07:02:50Z)
- **POS deploy (readiness):** https://github.com/satisfecho/pos/actions/runs/26804705034 (`completed` / `success`, 2026-06-02T07:18:31Z) — marketing sync after marketing Build; production `Last-Modified` on `/bosskebabypizzeria/es/` → `Tue, 02 Jun 2026 07:20:57 GMT`

### What was tested

Re-verification of marketing path fix and amvara9 delivery after handoff deploy (criteria 1–5).

### Results

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | Marketing CI green | **PASS** | `gh run list --repo satisfecho/085_Bosskebabypizzeria --limit 1` → `completed success` (run 26804039764) |
| 2 | HTML `<base href="/bosskebabypizzeria/es/">` | **PASS** | `curl -sfL …/bosskebabypizzeria/es/` → `<base href="/bosskebabypizzeria/es/">` |
| 3 | Root redirect to `es/` | **PASS** | `GET /bosskebabypizzeria/` → HTTP 200; `meta refresh` + `location.replace('es/…')` in root `index.html` |
| 4 | Chunk assets HTTP 200 under `/bosskebabypizzeria/es/` | **PASS** | `main-6KBVB2HY.js`, `polyfills-2NJIWUID.js`, `styles-VKX3FXJW.css` → **HTTP/2 200** |
| 5 | Browser: styled page, no console 404 | **PASS** | Chrome: full Boss Kebab layout; chunks **200** under `/bosskebabypizzeria/es/`; language switch → `/bosskebabypizzeria/en`; no console errors |
| 6 | Optional local build inspect | **SKIP** | Production criteria satisfied |

### Overall: **PASS**

All required criteria **PASS**. Prior **FAIL** (07:05 UTC) resolved by **Deploy to amvara9** run 26804705034 after marketing artifact upload.

### Product owner feedback

The live Boss Kebab site at `/bosskebabypizzeria/` is restored: styles and scripts load, the page renders with navigation and content, and locale switching stays under the correct slug. No further deploy action needed for this fix.

### URLs tested

1. https://www.satisfecho.de/bosskebabypizzeria/
2. https://www.satisfecho.de/bosskebabypizzeria/es/
3. https://www.satisfecho.de/bosskebabypizzeria/es/main-6KBVB2HY.js
4. https://www.satisfecho.de/bosskebabypizzeria/es/polyfills-2NJIWUID.js
5. https://www.satisfecho.de/bosskebabypizzeria/es/styles-VKX3FXJW.css
6. https://www.satisfecho.de/bosskebabypizzeria/en

### Relevant log excerpts

`curl` base href (2026-06-02 ~07:22 UTC):

```
<base href="/bosskebabypizzeria/es/"
```

Asset checks:

```
main-6KBVB2HY.js: HTTP/2 200
polyfills-2NJIWUID.js: HTTP/2 200
styles-VKX3FXJW.css: HTTP/2 200
```

Browser network (2026-06-02 ~07:23 UTC): all Angular chunks **200** on `/bosskebabypizzeria/es/`; console errors: none.
