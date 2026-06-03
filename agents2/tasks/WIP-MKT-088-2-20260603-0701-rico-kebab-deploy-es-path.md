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
