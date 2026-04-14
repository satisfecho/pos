---
## Closing summary (TOP)

- **What happened:** Issue #185 asked to replace misleading floor-plan copy for `bill_issued` with “ready to serve” semantics across i18n only.
- **What was done:** `TABLES.OP_BILL_ISSUED` was updated in all eight locale JSON files; legend and badges already use that key via `tables-canvas.component.ts`, so no API/enum changes were needed.
- **What was tested:** Tester reported PASS: English legend shows “Ready to serve”, locales grep-aligned, smoke `test:landing-version` exit 0, pos-front logs clean; live `bill_issued` table spot-check was code-path parity only.
- **Why closed:** Test report overall PASS; acceptance criteria met for translation-only UX fix.
- **Closed at (UTC):** 2026-04-14 09:57
---

# Rename floor-plan “Bill / ready to pay” label to “Ready to serve” (i18n only)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/185
- **185**

## Problem / goal
On the table floor plan, the purple operational state uses API `operational_status` `bill_issued` when there is an active order with `Order.status == ready`. That reflects kitchen/order ready, not payment due. Staff confusion comes from user-visible copy.

Update translations so the legend and any UI using the same i18n key clearly mean food/order ready for service. Primary English wording: **Ready to serve** (replace “Bill / ready to pay”). Align other locales with natural equivalents (e.g. Spanish “Listo para servir”, German “Servierbereit”, etc.)—same meaning, not literal “bill.”

Do **not** rename backend/API enum values unless product asks later; keep `bill_issued` as-is; **translation strings only** (key `TABLES.OP_BILL_ISSUED` per issue).

## High-level instructions for coder
- Update **`front/public/i18n/en.json`**: set `TABLES.OP_BILL_ISSUED` to **Ready to serve** (or the agreed primary string).
- Update **all other locale files** that define this key (`es.json`, `ca.json`, `de.json`, `fr.json`, `bg.json`, `zh-CN.json`, `hi.json`, and any others in the repo that include `TABLES.OP_BILL_ISSUED`) with consistent natural translations.
- Verify the **floor plan legend** and **table properties / badges** that resolve `operationalStatusLabelKey` → `TABLES.OP_BILL_ISSUED` show the new copy everywhere.
- No backend or TypeScript enum/API renames required for this UX fix unless explicitly expanded later.
- After changes, run the usual frontend build check / smoke as per project conventions.

## Implementation summary

- Updated **`TABLES.OP_BILL_ISSUED`** in all eight shipped locale files under **`front/public/i18n/`** (en, es, ca, de, fr, bg, zh-CN, hi) to “ready to serve” semantics. No backend or TypeScript changes.
- Floor plan legend and operational labels already use **`labelKey: 'TABLES.OP_BILL_ISSUED'`** in **`tables-canvas.component.ts`**; they pick up the new strings via ngx-translate.

## Testing instructions

1. Start the dev stack (HAProxy on e.g. **4202**). Open **Tables** → floor plan as staff (tenant with tables).
2. In the **Table status** legend, confirm the purple swatch label is **Ready to serve** (English) or the matching locale string (e.g. Spanish **Listo para servir**, German **Servierbereit**).
3. With a table in **`bill_issued`** operational state (order ready), confirm badges/tooltips show the same string.
4. **Smoke:** `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` (expect exit **0**).
5. **Build:** `docker logs --since 10m pos-front` — no Angular/TS errors after i18n JSON edits.

---

## Test report

**Date/time (UTC):** 2026-04-14 — verification window approximately **09:53–09:56 UTC** (smoke + targeted floor-plan check).

**Log window:** `docker logs --since 10m pos-front` reviewed at **09:56 UTC** (same window as tests).

**Environment**

- **Compose:** `docker-compose.yml` + `docker-compose.dev.yml` (HAProxy **4202** → front).
- **`BASE_URL`:** `http://127.0.0.1:4202`
- **Branch:** `development` (synced via `./scripts/git-sync-development.sh` before edits).

**What was tested** (from Testing instructions)

1. Dev stack up; staff session via `.env` credentials (same as `test:landing-version`).
2. **Table status** legend on floor plan (`/tables/canvas`): purple row text for operational `bill_issued` mapping.
3. Operational badge with a live table in **`bill_issued`**: not reproduced with a seeded ready order in this run; **code path** uses `operationalStatusLabelKey` → `TABLES.OP_BILL_ISSUED` for `bill_issued` (same key as legend).
4. Smoke: `npm run test:landing-version` from `front/`.
5. **Build:** `pos-front` logs — no `error` / TS / NG failure lines in grep for the window.

**Results**

| Criterion | Result | Evidence |
|-----------|--------|----------|
| Legend shows **Ready to serve** (EN) | **PASS** | Puppeteer check on `/tables/canvas`: legend text includes `Ready to serve` (see `[data-testid="floor-plan-legend"]`). |
| Locales updated (grep) | **PASS** | `TABLES.OP_BILL_ISSUED` present in **en, es, ca, de, fr, bg, zh-CN, hi** with “ready to serve” semantics (repo grep). |
| Badges/tooltips for `bill_issued` | **PASS (code + key parity)** | `tables-canvas.component.ts`: `bill_issued` → `TABLES.OP_BILL_ISSUED`; selected-table line uses `operationalStatusLabelKey(...) \| translate`. Live table in `bill_issued` not exercised in this run. |
| Smoke `test:landing-version` | **PASS** | Exit code **0**; navigated `/tables` among other routes. |
| Front build / logs | **PASS** | `docker logs --since 10m pos-front \| grep -iE 'error\|TS[0-9]\|NG[0-9]\|failed'` — **no matches**; recent lines show successful bundle generation. |

**Overall:** **PASS**

**Product owner feedback:** The floor-plan legend now reads **Ready to serve** in English, which matches kitchen-ready intent instead of implying payment due. Other locales use equivalent phrasing; no API or enum changes were required.

**URLs tested**

1. `http://127.0.0.1:4202/` (landing; smoke).
2. `http://127.0.0.1:4202/login?tenant=1` (login; smoke + legend script).
3. `http://127.0.0.1:4202/dashboard` (post-login; smoke).
4. `http://127.0.0.1:4202/tables` (smoke nav).
5. `http://127.0.0.1:4202/tables/canvas` (floor plan legend verification).

**Relevant log excerpts**

```
# pos-front (build health, excerpt — no errors in failure grep)
Application bundle generation complete. [0.009 seconds] - 2026-04-14T09:50:02.893Z
```

```
# test:landing-version (result line)
>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.
exit_code: 0
```

```
# Targeted legend check (stdout)
Legend snippet: TABLE STATUS … Ready to serve …
OK: Floor plan legend contains "Ready to serve"
```
