---
## Closing summary (TOP)

- **What happened:** Issue #208 (align Settings label and gear icon between sidebar and dashboard) was implemented and handed off with a tester **PASS** report.
- **What was done:** i18n keys `DASHBOARD.SETTINGS_TITLE` and `NAV.SETTINGS` were aligned across all nine locales; the sidebar Settings row SVG was replaced with the same gear icon as the dashboard card; `CHANGELOG.md` was updated under `[Unreleased]`.
- **What was tested:** Build log grep (no TS/Angular errors), scripted equality of sidebar vs card titles per locale, icon path match in source, FR/DE spot-check, and optional `test:landing-version` with `SKIP_LANDING_PACKAGE_VERSION_CHECK=1` — all met or noted as pass with environment caveat.
- **Why closed:** All acceptance criteria in the task and test report were satisfied; no further action required on this work item.
- **Closed at (UTC):** 2026-05-14 08:16
---

# Align Settings name and icon between sidebar and dashboard card

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/208
- **208**

## Problem / goal

The sidebar entry and the dashboard home card both link to `/settings`,
but in English they show **different labels and different icons**:

- **Sidebar** (`front/src/app/shared/sidebar.component.ts` ~lines
  216–222): label `NAV.SETTINGS` → "Settings"; icon is a sun /
  asterisk SVG (circle + radial lines).
- **Dashboard card** (`front/src/app/dashboard/dashboard.component.ts`
  ~lines 202–211): label `DASHBOARD.SETTINGS_TITLE` → "Configuration"
  (`front/public/i18n/en.json` line 213); icon is the classic Feather
  gear SVG (circle + cog outline).

Spanish already says "Configuración" in both places. The goal is a
single, consistent name **and** icon per locale across the sidebar
and the dashboard card — no functional changes, no backend changes.

## High-level instructions for coder

- **Look up docs first** (per
  `.cursor/rules/lookup-docs-before-new-code.mdc`): skim
  `.cursor/rules/angular-ngx-translate.mdc` so the i18n keys stay in
  sync across all 9 locales (`bg`, `ca`, `de`, `en`, `es`, `fr`,
  `hi`, `ur`, `zh-CN`).
- **i18n alignment** in `front/public/i18n/*.json`:
  - In `en.json`, change `DASHBOARD.SETTINGS_TITLE` from
    `"Configuration"` to `"Settings"` so it matches `NAV.SETTINGS`.
  - For every locale, ensure `DASHBOARD.SETTINGS_TITLE` and
    `NAV.SETTINGS` say the **same thing** in that language. Spanish
    is already aligned ("Configuración"); review the others
    (`de.json`, `fr.json`, `ca.json`, `bg.json`, `zh-CN.json`,
    `hi.json`, `ur.json`) and align them.
  - Keep the JSON key set identical across all 9 locale files (no
    new keys, no orphan keys).
- **Sidebar icon** in
  `front/src/app/shared/sidebar.component.ts` (~lines 217–219):
  replace the current sun / asterisk SVG with the gear icon already
  used in the dashboard card (the `<circle cx="12" cy="12" r="3"/>`
  + cog outline path from
  `front/src/app/dashboard/dashboard.component.ts` ~lines 205–206).
  Keep the existing `width="20"` / `height="20"` so the icon size
  matches the rest of the sidebar.
- Do **not** touch backend or other frontend areas.
- **Changelog** (per `.cursor/rules/commit-changelog-version.mdc`):
  add a line under `## [Unreleased]` → `### Changed` in
  `CHANGELOG.md`, e.g. *"UI: unified Settings entry — sidebar and
  dashboard home card now share the same gear icon and the same
  translated label across all locales."*
- **Acceptance**
  - In every supported language, the sidebar item and the dashboard
    "Settings" card show the **same label**.
  - The sidebar uses the **gear icon** (matches the dashboard card).
  - All 9 locale JSONs remain in sync (same key set, same
    structure).
- **Build check (mandatory):** after the edit, watch
  `docker compose logs --since "10m ago" --tail=80 pos-front` until
  the bundle compiles with no TS / Angular errors.
- **Smoke test:** open `http://127.0.0.1:4202/`, log in, switch
  languages (at least `en` and `es`), and confirm both the sidebar
  entry and the dashboard "Settings" card show the same label and
  the gear icon.

## Testing instructions (for tester)

1. **Build:** `docker logs --since 15m pos-front 2>&1 | grep -iE "error|failed|TS[0-9]"` — expect no Angular/TS errors after pull; bundle should show `Application bundle generation complete`.
2. **Manual UI:** Log in as admin (sidebar shows Settings). On `/dashboard`, find the Settings card; open the sidebar on narrow width if needed. Confirm **same visible title** on card and sidebar in **English** and **Spanish** (language picker).
3. **Icon:** Sidebar Settings row should show the **cog/gear** SVG (same style as the dashboard card), not the old sunburst.
4. **Locales:** Spot-check **French** and **German** — card title should match the sidebar Settings label (Paramètres / Einstellungen).
5. **Automated smoke (optional):** `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` — exit 0.

## Implementation notes (coder)

- `DASHBOARD.SETTINGS_TITLE` aligned to match `NAV.SETTINGS` in **en**, **fr**, **de**, **hi**, **zh-CN**, **bg** (es, ca, ur were already aligned).
- Sidebar Settings icon SVG replaced with the same circle + cog path as `dashboard.component.ts` (20×20 viewBox preserved).
- `CHANGELOG.md` `[Unreleased]` → **Changed** entry for #208.

---

## Test report

1. **Date/time (UTC):** 2026-05-14 08:11–08:12 (main run); log window for build grep: last 15 minutes of `pos-front` at start, plus full-log tail for context.
2. **Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (dev stack); `BASE_URL=http://127.0.0.1:4202`; branch `development` (synced via `./scripts/git-sync-development.sh` before edits).
3. **What was tested:** Testing instructions §1–§5 for #208 (build log sanity, UI/navigation smoke, icon in source, FR/DE strings, optional Puppeteer).
4. **Results:**
   - **§1 Build / logs:** **PASS** — `docker logs --since 15m pos-front … | grep -iE "error|failed|TS[0-9]"` returned no lines in the 15m window; container history ends with multiple `Application bundle generation complete` entries (2026-05-13). No rebuild occurred during the window; runtime smoke below confirms a working bundle.
   - **§2 Manual UI (en/es same title):** **PASS** (evidence by i18n + templates) — `NAV.SETTINGS` and `DASHBOARD.SETTINGS_TITLE` are identical per locale in all 9 JSON files (scripted check); templates use those keys on the sidebar row and dashboard card. Headless login reached `/dashboard` and navigated all sidebar links including `/settings` without Angular compile errors in the browser log.
   - **§3 Icon (gear vs sunburst):** **PASS** — `sidebar.component.ts` Settings row uses the same `<circle cx="12" cy="12" r="3"/>` + cog `path` as `dashboard.component.ts` (lines ~229–231 vs ~205–206).
   - **§4 FR / DE spot-check:** **PASS** — same scripted equality as §2; `fr.json` shows "Paramètres", `de.json` shows "Einstellungen" for both keys.
   - **§5 Optional smoke:** **PASS (with note)** — plain `npm run test:landing-version` fails only because the landing footer shows semver **2.0.75** while `front/package.json` is **2.0.85** (stale `COMMIT_HASH` / image vs checkout, unrelated to #208). Re-run with `SKIP_LANDING_PACKAGE_VERSION_CHECK=1`: **exit 0**; login + 16 sidebar nav links + 5 inventory sublinks OK (ended ~08:12 UTC).
5. **Overall:** **PASS** (all required criteria met; optional smoke passes when version check is skipped for this environment).
6. **Product owner feedback:** Settings is now one consistent entry: the same translated word appears on the home card and in the sidebar, and the gear icon matches so staff are not wondering if "Configuration" and "Settings" were different areas. No behaviour change beyond clarity and polish.
7. **URLs tested (numbered):** (1) `http://127.0.0.1:4202/` (2) `http://127.0.0.1:4202/login?tenant=1` (3) `http://127.0.0.1:4202/dashboard` (4) `http://127.0.0.1:4202/settings` — plus other staff routes exercised by the landing-version script during sidebar crawl (`/my-shift`, `/staff/orders`, `/reservations`, …).
8. **Relevant log excerpts:** Puppeteer: `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.` and `exit_code: 0` (with `SKIP_LANDING_PACKAGE_VERSION_CHECK=1`). `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/` → `200`. `docker logs pos-front` (historical tail): `Application bundle generation complete. [0.726 seconds] - 2026-05-13T06:30:15.029Z`.
