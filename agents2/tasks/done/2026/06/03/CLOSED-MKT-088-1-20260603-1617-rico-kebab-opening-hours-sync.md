---
## Closing summary (TOP)

- **What happened:** Marketing repo **`088_ricokebab`** @ **`c4f806d`**: **`PublicOpeningHoursService`**, fallback **09:00 — 22:00**; CI + **Deploy to amvara9** green (runs **26834533491**, **26834576186**). Live **`https://www.satisfecho.de/rico-kebab/es/`** still **12:30 — 00:00** — artifact synced to **`front/sites/rico-kebab/`** root only; stale **`rico-kebab/es/main-CCZCVGNJ.js`** served on public URL.
- **Why not UNTESTED:** Testing criterion **(2)** **FAIL** (deploy layout — see **Action for coder** / embedded **Test report**). **`scripts/fetch-marketing-artifact.sh`** unchanged on **`development`**.
- **Why archived:** GitHub **088_ricokebab #1** **CLOSED** (2026-06-03); successor **#2** **OPEN** (same deploy fix). Per **012-feature-coder-handoff** loop protection, active work moves to **`WIP-MKT-088-2-…`**, not this file.
- **Resume:** Fix POS deploy so artifact lands under **`rico-kebab/es/`** (per **`088_ricokebab/deploy/README.md`**), re-run **Deploy to amvara9**, then **wip → untested** on **#2**.
- **Closed at (UTC):** 2026-06-03
---

# Add POS opening-hours sync for Rico Kebab (tenant 34)

## GitHub
- **Issue:** https://github.com/satisfecho/088_ricokebab/issues/1
- **Marketing repo:** satisfecho/088_ricokebab
- **MKT-088-1**
- **Live path:** https://www.satisfecho.de/rico-kebab/

## Problem / goal
The Rico Kebab marketing site already loads the menu from POS (`GET /api/public/tenants/34/menu`). Opening hours are still static in `src/app/data/site.data.ts` (`OPENING_HOURS`, fallback **12:30–00:00** daily). POS tenant **34** is configured as **Mon–Sun 09:00–22:00**. Hero carousel and footer/location should show hours from POS with the same fallback pattern as the menu.

## POS API (already available)
- **`GET https://satisfecho.de/api/public/tenants/34`** returns `opening_hours` (JSON string on the tenant summary; same field used by the book page). No new POS endpoint required unless the marketing app needs a dedicated shape—prefer reusing this response.
- Menu sync reference: `src/app/services/public-menu.service.ts` in **088_ricokebab**.

## High-level instructions for coder
- Clone or use sibling repo `~/projects/088_ricokebab` (or `../088_ricokebab` next to pos2).
- Add a service similar to `PublicMenuService` (e.g. `PublicOpeningHoursService`) that loads tenant **34** public info and parses `opening_hours`.
- Load on app init; keep `OPENING_HOURS` in `site.data.ts` as fallback if the API fails.
- Preserve existing `hoursCarousel` logic (Europe/Madrid, open/closed today).
- **Temporary minimum** if blocked: update static fallback to **09:00–22:00** Mon–Sun to match POS until API wiring ships.
- Implement in the **marketing repo**, not in POS `front/src/`.
- Push to marketing repo `main`; ensure CI uploads artifact `rico-kebab-satisfecho-deploy`.
- Manifest in pos2 is already registered (`slug`: `rico-kebab`); update **`config/marketing-sites.json`** only if artifact name or slug changes.

## Implementation (feature coder)
- **Marketing repo:** `satisfecho/088_ricokebab` @ `20abfc7` on `main`
- Added `PublicOpeningHoursService` → `GET /api/public/tenants/34`, parses weekly `opening_hours` JSON, 10 min cache (same as menu)
- `OPENING_HOURS` fallback updated to **09:00 — 22:00** Mon–Sun
- `AppComponent` loads hours on init; `hoursCarousel` unchanged (Europe/Madrid)
- No POS / `marketing-sites.json` changes

## Acceptance criteria
- [ ] Website hours match POS configuration (tenant 34)
- [ ] If POS is unavailable, fallback hours are shown (page does not break)
- [ ] After changing hours in POS, the website reflects the change (reasonable cache, similar to menu)
- [ ] Existing menu sync and Satisfecho deploy are not affected
- [ ] Verify `https://www.satisfecho.de/rico-kebab/es/` shows **09:00–22:00** and open/closed uses Madrid time

## Handoff log

- **Handoff (`012-feature-coder-handoff.md`, 2026-06-02, user `012` pass — Cursor):** `./scripts/git-sync-development.sh` (OK). Marketing repo **`088_ricokebab`** @ **`20abfc7`**: `PublicOpeningHoursService` + fallback **09:00 — 22:00**; CI green (run 26833000932). **Deploy to amvara9** run 26833059965 **success** — artifact synced to **`front/sites/rico-kebab/`** root only; **`front/sites/rico-kebab/es/main-CCZCVGNJ.js`** (local + production) still **12:30** only (no **`09:00`** / **`OpeningHours`** in `/es/` bundle). Live **`https://www.satisfecho.de/rico-kebab/es/`** unchanged vs embedded **Test report** **FAIL**. No POS fix yet for **`scripts/fetch-marketing-artifact.sh`** / **`rico-kebab/es/`** layout (see **Action for coder**). **`gh issue view 1 --repo satisfecho/088_ricokebab`**: **OPEN**, no labels. Per **TASKS-README.md**, implementation **not** complete (deploy blocker; criterion **(2)**). **No** **`WIP-MKT-088-1-…` → `UNTESTED-*`**; **no** `gh issue edit 1 --repo satisfecho/088_ricokebab --add-label "agent:untested"`.
- **Handoff (`012-feature-coder-handoff.md`, 2026-06-02, user `012` pass 2 — Cursor):** `./scripts/git-sync-development.sh` (OK). New **088_ricokebab** CI run **26834533491** @ **`c4f806d`** green; **Deploy to amvara9** run **26834576186** green — still **`[fetch-marketing] OK → front/sites/rico-kebab (26 files)`** (root only). **`scripts/fetch-marketing-artifact.sh`** unchanged on **development**. Live **`/rico-kebab/es/`** still **`main-CCZCVGNJ.js`** with **12:30 — 00:00** (hero + footer). Criterion **(2)** still **FAIL**. **No** **WIP → UNTESTED**; **no** `agent:untested` label.
- **Handoff (`012-feature-coder-handoff.md`, 2026-06-03, user `012` pass — Cursor):** `./scripts/git-sync-development.sh` (OK). **`gh issue view 1 --repo satisfecho/088_ricokebab`**: **CLOSED**; **#2** **OPEN** (“Opening Hours fix”). Deploy/CI/live unchanged vs pass 2 — criterion **(2)** **FAIL** (**12:30 — 00:00** on **`/rico-kebab/es/`**). Per **TASKS-README.md** + loop protection: **not** **WIP → UNTESTED**; **no** `agent:untested` on **#1**. Archived **`WIP-MKT-088-1-…` → `CLOSED-MKT-088-1-20260603-1617-…`**; resume on **`WIP-MKT-088-2-…`** (**#2**).

## Testing instructions
1. Wait for **088_ricokebab** CI on `main` to finish and deploy artifact `rico-kebab-satisfecho-deploy` to Satisfecho (or run `npm run build:satisfecho` locally and spot-check `dist/`).
2. Open `https://www.satisfecho.de/rico-kebab/es/` — hero hours carousel and footer **Horario** must show **09:00 — 22:00** for every weekday.
3. During Madrid opening hours (09:00–22:00), today’s card should show **Abierto ahora**; outside that window **Cerrado ahora**.
4. **API failure:** block `satisfecho.de/api/public/tenants/34` (devtools offline / hosts) and reload — page still loads with fallback **09:00 — 22:00** (no console crash).
5. **Cache:** change tenant 34 hours in POS Settings, wait up to 10 minutes (or hard refresh after cache TTL), confirm site updates.
6. Regression: menu sections still load from POS; booking link `/book/34` unchanged.

## References
- Bookings: `https://satisfecho.de/book/34`
- Current hours data: `src/app/data/site.data.ts` → `OPENING_HOURS`

---

## Test report

1. **Date/time (UTC):** 2026-06-02 16:20–16:27 UTC (log window for browser + deploy polling).
2. **Environment:** Production **satisfecho.de** / **www.satisfecho.de**; POS API health `200`; branch **development** synced at test start; no local POS code changes.
3. **What was tested:** Marketing CI + **Deploy to amvara9** readiness; live URL hours carousel/footer; Madrid open/closed; menu/book regressions; POS tenant 34 API; deploy artifact layout on amvara9.
4. **Results:**
   - **088_ricokebab CI (main) green** — PASS — https://github.com/satisfecho/088_ricokebab/actions/runs/26833000932 (`Sync opening hours from POS tenant 34 public API`, completed 16:20:21Z).
   - **Deploy to amvara9 triggered and green** — PASS — https://github.com/satisfecho/pos/actions/runs/26833059965 (workflow_dispatch 16:20:47Z, success 16:23:29Z); log shows `[fetch-marketing] OK → front/sites/rico-kebab (26 files)` from run 26833000932.
   - **POS `GET /api/public/tenants/34` returns 09:00–22:00 Mon–Sun** — PASS — HTTP 200; `opening_hours` JSON matches tenant 34 settings.
   - **Live path `https://www.satisfecho.de/rico-kebab/es/` shows 09:00 — 22:00 (hero + footer)** — FAIL — All weekdays still **12:30 — 00:00**; network shows only `…/tenants/34/menu`, not `…/tenants/34` (stale bundle `main-CCZCVGNJ.js`).
   - **Madrid Abierto/Cerrado ahora** — FAIL (blocked by wrong hours) — Page shows **ABIERTO AHORA** at ~18:24 Madrid (would match old 12:30–00:00 window, not verifiable against 09:00–22:00).
   - **API failure fallback 09:00 — 22:00** — NOT RUN — Production serves pre-sync bundle; fallback path not exercised on live `/es/`.
   - **Cache / POS hours change reflected on site** — NOT RUN — Blocked until `/rico-kebab/es/` serves new build.
   - **Menu sync + `/book/34` regression** — PASS — Menu categories/prices load; **Reservar o consultar** → `https://satisfecho.de/book/34`; no console errors.
5. **Overall:** **FAIL** — Failed criteria: live hours on `/rico-kebab/es/`, Madrid open/closed verification, API-failure fallback, cache check.
6. **Product owner feedback:** The marketing build and POS API are aligned (09:00–22:00), and deploy fetched the new artifact, but visitors still hit an **old static tree under `rico-kebab/es/`** while the sync updated **`rico-kebab/` root** only. Until artifact files land in **`front/sites/rico-kebab/es/`** (or nginx serves the synced root with correct base href), the public Spanish URL will keep showing legacy **12:30 — 00:00** hours.
7. **URLs tested:**
   1. https://www.satisfecho.de/rico-kebab/es/
   2. https://www.satisfecho.de/rico-kebab/
   3. https://satisfecho.de/api/public/tenants/34
   4. https://satisfecho.de/api/public/tenants/34/menu?lang=es
   5. https://satisfecho.de/api/health
   6. https://satisfecho.de/book/34 (link target from marketing page)
8. **Relevant log excerpts (last section):**
   - **amvara9 (ssh):** `front/sites/rico-kebab/main-VMRFNHWD.js` (16:20) contains `09:00` + `OpeningHours`; `front/sites/rico-kebab/es/main-CCZCVGNJ.js` (15:33) still contains `12:30` only.
   - **Deploy log:** `[fetch-marketing] Latest successful run for satisfecho/088_ricokebab@main...` → `[fetch-marketing] OK → front/sites/rico-kebab (26 files)`.
   - **Browser:** Hero/footer text `12:30 — 00:00` ×7; `ABIERTO AHORA` on Tuesday card; XHR/fetch: menu API only.

**Action for coder:** Fix deploy layout so Satisfecho serves the CI artifact at **`/rico-kebab/es/`** (per `088_ricokebab/deploy/README.md`: rsync `browser/es/` → `rico-kebab/es/`). Options: adjust **`scripts/fetch-marketing-artifact.sh`** / manifest for slug `rico-kebab` to target `front/sites/rico-kebab/es/`, or change nginx/static layout. After fix, re-run **Deploy to amvara9**, return task to **UNTESTED-**.
