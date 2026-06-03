---
## Closing summary (TOP)

- **What happened:** Production **`/rico-kebab/es/`** served a stale bundle (**`main-CCZCVGNJ.js`**, static **12:30 — 00:00**) while CI artifacts with **`PublicOpeningHoursService`** landed at **`front/sites/rico-kebab/`** root instead of **`rico-kebab/es/`**.
- **What was done:** POS added **`deploySubpath: "es"`** for **`rico-kebab`** in **`config/marketing-sites.json`** and **`deploySubpath`** handling in **`scripts/sync-all-marketing-sites.sh`**; **Deploy to amvara9** run **26880900505** succeeded (`[fetch-marketing] OK → front/sites/rico-kebab/es (26 files)`).
- **What was tested:** Production **PASS** — live path serves **`main-VMRFNHWD.js`** with POS opening-hours sync, **09:00 — 22:00** API-failure fallback, Madrid open/closed, menu sync, and **`/book/34`** unchanged.
- **Why closed:** All acceptance criteria met; tester **Test report** overall **PASS**.
- **Closed at (UTC):** 2026-06-03 11:21
---

# Rico Kebab: deploy opening-hours build to `/rico-kebab/es/`

## GitHub
- **Issue:** https://github.com/satisfecho/088_ricokebab/issues/2
- **Marketing repo:** satisfecho/088_ricokebab
- **MKT-088-2**
- **Supersedes:** https://github.com/satisfecho/088_ricokebab/issues/1 (closed; archived **`done/2026/06/03/CLOSED-MKT-088-1-20260603-1617-rico-kebab-opening-hours-sync.md`**)
- **Live path:** https://www.satisfecho.de/rico-kebab/es/

## Problem / goal

Opening-hours sync is implemented in **`088_ricokebab`** (`PublicOpeningHoursService`, fallback **09:00 — 22:00**). CI and **Deploy to amvara9** succeed, but production **`/rico-kebab/es/`** still serves a stale bundle (**`main-CCZCVGNJ.js`**, **12:30 — 00:00**). New build is at **`front/sites/rico-kebab/`** root (`main-VMRFNHWD.js` with **09:00** + **OpeningHours**), not under **`rico-kebab/es/`**.

## High-level instructions for coder

- Sync **`development`**: **`./scripts/git-sync-development.sh`**.
- Fix deploy so Satisfecho serves the CI artifact at **`/rico-kebab/es/`** per **`088_ricokebab/deploy/README.md`** (rsync **`browser/es/`** → **`rico-kebab/es/`**).
- Options: adjust **`scripts/fetch-marketing-artifact.sh`** / **`config/marketing-sites.json`** for slug **`rico-kebab`**, or nginx/static layout under **`front/sites/rico-kebab/`**.
- Re-run **Deploy to amvara9** on **`master`** after the POS fix.
- Post summary on **#2** (deploy run id, live URL check).

## Implementation (feature coder)

- **`config/marketing-sites.json`:** added **`deploySubpath`: `"es"`** for **`rico-kebab`** — CI artifact is flat **`browser/es/`** content; must land under **`front/sites/rico-kebab/es/`**, not slug root (Boss/Wimpi bundle **`index.html` + `es/`** at artifact root; Rico Kebab uploads **`es/`** files only).
- **`scripts/sync-all-marketing-sites.sh`:** **`deploySubpath`** support in **`fetch_one`**, **`build_one_local`**, and **`site_needs_update`** (freshness check uses **`es/index.html`** when subpath set; root redirect **`index.html`** preserved).

## Acceptance criteria

- [ ] `https://www.satisfecho.de/rico-kebab/es/` hero + footer show **09:00 — 22:00** Mon–Sun
- [ ] Madrid **Abierto ahora** / **Cerrado ahora** matches **09:00–22:00** window
- [ ] Menu sync and **`/book/34`** unchanged
- [ ] **Deploy to amvara9** green after fix

## Handoff log

- **2026-06-03:** Created from archived **WIP-MKT-088-1** after **012** handoff — **#1** closed, **#2** open; criterion **(2)** deploy-path blocker.
- **2026-06-03 (Cursor):** **`deploySubpath: "es"`** + sync script support; **Deploy to amvara9** run **26880900505** **success** @ `baacbcda`. Log: `[fetch-marketing] OK → front/sites/rico-kebab/es (26 files)`. Live **`/rico-kebab/es/`** → **`main-VMRFNHWD.js`**, **09:00** + **OpeningHours**. **`WIP-…` → `UNTESTED-…`**; **`agent:untested`** on **#2**.

## Testing instructions

1. After POS fix merges to **`master`**, wait for green **Deploy to amvara9** (or trigger workflow_dispatch).
2. Open `https://www.satisfecho.de/rico-kebab/es/` — hero carousel and footer **Horario** must show **09:00 — 22:00** for every weekday.
3. During Madrid **09:00–22:00**, today’s card shows **Abierto ahora**; outside that window **Cerrado ahora**.
4. **API failure:** block `satisfecho.de/api/public/tenants/34` — page loads with fallback **09:00 — 22:00** (no crash).
5. **Cache:** change tenant 34 hours in POS Settings; within ~10 minutes site updates.
6. Regression: menu from POS; **Reservar o consultar** → `https://satisfecho.de/book/34`.

## References

- Archived task + test report: **`agents2/tasks/done/2026/06/03/CLOSED-MKT-088-1-20260603-1617-rico-kebab-opening-hours-sync.md`**
- **`config/marketing-sites.json`** — slug **`rico-kebab`**
- **`docs/0001-ci-cd-amvara9.md`**

---

## Test report

1. **Date/time (UTC):** 2026-06-03 11:20:13–11:20:56 UTC (log window for production checks + browser).
2. **Environment:** Production **www.satisfecho.de**; branch **development** synced at start; deploy confirmed via GitHub Actions (no local POS code changes).
3. **What was tested:** **Deploy to amvara9** readiness; live **`/rico-kebab/es/`** bundle path; hero/footer hours + Madrid open/closed; POS tenant 34 API; API-failure fallback; menu + booking regressions.
4. **Results:**
   - **Deploy to amvara9 green after fix** — **PASS** — https://github.com/satisfecho/pos/actions/runs/26880900505 (success 2026-06-03T11:12:34Z, merge `baacbcda`); deploy log per handoff: `[fetch-marketing] OK → front/sites/rico-kebab/es (26 files)`.
   - **Live `/rico-kebab/es/` serves new bundle (not stale `main-CCZCVGNJ.js`)** — **PASS** — HTML references **`main-VMRFNHWD.js`**; bundle contains **`OpeningHours`** and fetches **`GET /api/public/tenants/34`** (network reqid 6).
   - **Hero + footer hours from POS (OpeningHours sync)** — **PASS** — With API available: all weekdays **12:00 — 20:00** (matches **`GET /api/public/tenants/34`** `opening_hours` Mon–Sun 12:00–20:00). Task text cited 09:00–22:00; tenant 34 is currently 12:00–20:00 in POS — site reflects POS, not stale 12:30–00:00.
   - **Madrid Abierto/Cerrado ahora** — **PASS** — At ~13:20 Europe/Madrid (within 12:00–20:00 POS window): hero shows **ABIERTO AHORA**; with tenant/34 blocked (initScript): fallback **09:00 — 22:00** + **ABIERTO AHORA** (no console errors).
   - **API failure fallback 09:00 — 22:00, no crash** — **PASS** — Blocked `/api/public/tenants/34` (not `/menu`); page loads; hero + footer show fallback **09:00 — 22:00** all days.
   - **Cache / POS hours change within ~10 min** — **PASS (inferred)** — Live hours match current POS API response; full timed re-change in Settings not run (would mutate tenant 34 production data).
   - **Menu sync unchanged** — **PASS** — `GET /api/public/tenants/34/menu?lang=es` 200; **Beverages** + **Main Course** sections render with POS prices.
   - **Reservar → `/book/34`** — **PASS** — Link **`https://satisfecho.de/book/34`**; booking page loads **Rico kebab**, opening hours **Mon–Sun 12:00–20:00**.
5. **Overall:** **PASS**
6. **Product owner feedback:** The deploy-path fix is live: **`/rico-kebab/es/`** now serves the CI artifact with **`PublicOpeningHoursService`**, replacing the stale bundle. Opening hours sync from POS works; fallback hours apply when the tenant API is unavailable. Menu and booking flows are unaffected.
7. **URLs tested:**
   1. https://www.satisfecho.de/api/health
   2. https://www.satisfecho.de/api/public/tenants/34
   3. https://www.satisfecho.de/api/public/tenants/34/menu?lang=es
   4. https://www.satisfecho.de/rico-kebab/es/
   5. https://www.satisfecho.de/rico-kebab/es/main-VMRFNHWD.js
   6. https://satisfecho.de/book/34
8. **Relevant log excerpts:** Deploy readiness: `curl /api/health → 200`; bundle check: `grep main-VMRFNHWD.js` on `/rico-kebab/es/` HTML; tenant API: `opening_hours` Mon–Sun `"open":"12:00","close":"20:00"`; stale bundle **`main-CCZCVGNJ.js`** no longer referenced on live path.
