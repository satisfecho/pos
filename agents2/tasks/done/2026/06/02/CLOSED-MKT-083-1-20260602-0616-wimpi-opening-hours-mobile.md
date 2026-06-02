---
## Closing summary (TOP)

- **What happened:** Weekly opening hours on `/wimpi/es/` overlapped on phone viewports because seven full day labels sat in one row.
- **What was done:** In `satisfecho/083_wimpi` (`e89723f` on `main`), added short weekday labels (LUN–DOM), `flex-wrap` on mobile (~two rows), and a 7-column grid with full names from 720px up; footer horario unchanged; no `marketing-sites.json` change.
- **What was tested:** Production `https://www.satisfecho.de/wimpi/es/` at 375px and 1280px after green CI and Deploy to amvara9 — **PASS** (short labels, wrap, desktop row, footer full names).
- **Why closed:** All acceptance criteria passed; tester overall **PASS**.
- **Closed at (UTC):** 2026-06-02 06:52
---

# Enhance View opening hours on mobile

## GitHub
- **Issue:** https://github.com/satisfecho/083_wimpi/issues/1
- **Marketing repo:** satisfecho/083_wimpi
- **MKT-083-1**
- **Live path:** https://www.satisfecho.de/wimpi/

## Problem / goal
On the Spanish site (`/wimpi/es/`), the weekly opening-hours section ("horario semanal") shows all seven days in a single row. On phone-sized viewports the day boxes overlap and are hard to read. Improve the mobile layout so opening hours are readable without overlap.

Suggested approach from the issue:
- Use short day abbreviations (e.g. LUN for Lunes).
- Allow day boxes to wrap to the next line when they do not fit horizontally.

## High-level instructions for coder
- Clone or use sibling repo `~/projects/083_wimpi` (or `../083_wimpi` next to pos2).
- Locate the opening-hours / "horario semanal" component and its styles.
- Adjust layout for small screens: abbreviated day labels and responsive wrapping (flex-wrap or grid) so seven days do not overlap.
- Verify on a narrow viewport (~375px width) at https://satisfecho.de/wimpi/es/ (or local dev with equivalent base href).
- Implement in the **marketing repo**, not in POS `front/src/`.
- Push to marketing repo `main`; ensure CI uploads artifact `wimpi-satisfecho-deploy`.
- If manifest artifact name or slug changes, update **`config/marketing-sites.json`** in pos2 and follow deploy steps (agent 005 / **Deploy to amvara9**).

## Implementation notes
- Marketing repo commit `e89723f` on `satisfecho/083_wimpi` `main`.
- `OPENING_HOURS` entries now include `short` (LUN–DOM) for the weekly carousel; footer list still uses full `label`.
- `.kr-hours__track`: `flex-wrap` on mobile (~4 cards per row); from `720px` restores 7-column grid with full day names.
- No change to `config/marketing-sites.json` (artifact `wimpi-satisfecho-deploy` unchanged).

## Testing instructions
1. Wait for **083_wimpi** CI on `main` to finish and produce artifact `wimpi-satisfecho-deploy` (or run deploy agent 005 to amvara9).
2. Open https://www.satisfecho.de/wimpi/es/ (or local `ng serve --configuration=satisfecho` at `/wimpi/es/`).
3. Set viewport width **375px** (Chrome DevTools device toolbar).
4. Scroll to **Horario semanal** below the hero.
5. **Expect:** day cards show **LUN, MAR, MIÉ, …** (not full Lunes/Martes); cards **wrap** to two rows (no horizontal overlap); time ranges readable.
6. At **≥720px** width: seven days in one row with full day names (Lunes, Martes, …).
7. Footer **Horario** list still shows full day names with times.
8. Optional: repeat on `/wimpi/en/` — layout should match; labels stay Spanish in data (i18n for day names not in scope).

---

## Test report

1. **Date/time (UTC):** Start `2026-06-02T06:21:29Z` — End `2026-06-02T06:27:04Z`. Log window: N/A (production marketing static site; no POS `pos-front` / `pos-back` containers used for this task).

2. **Environment:** Production `https://www.satisfecho.de` (amvara9). Viewport emulation 375×812 (mobile) and 1280×800 (desktop). Branch `development` synced at test start. Marketing CI: `satisfecho/083_wimpi` run [26802312698](https://github.com/satisfecho/083_wimpi/actions/runs/26802312698) (success, artifact `wimpi-satisfecho-deploy`). Deploy: [Deploy to amvara9 #26802396689](https://github.com/satisfecho/pos/actions/runs/26802396689) (workflow_dispatch, completed success ~06:25 UTC) after pre-deploy production still served bundle `main-SGYOZVUP.js`.

3. **What was tested:** Mobile/desktop opening-hours carousel and footer horario on `/wimpi/es/` per testing instructions.

4. **Results:**
   - **083_wimpi CI artifact ready:** **PASS** — latest successful `main` build includes commit `e89723f`.
   - **Deploy to amvara9 / production bundle current:** **PASS** — deploy run green; `index.html` references `main-OY7OVYDV.js`; container `/usr/share/nginx/html/sites/wimpi/es/` contains `kr-hours__day--short` (verified via SSH).
   - **375px — short labels LUN, MAR, MIÉ, …:** **PASS** — `shortTexts`: `["LUN","MAR","MIÉ","JUE","VIE","SÁB","DOM"]`, `shortVisible: true`.
   - **375px — cards wrap, no overlap:** **PASS** — `display: flex`, `flexWrap: wrap`, `rowCount: 2`, `minCardWidth: 80px`.
   - **≥720px — seven days one row, full names:** **PASS** — at 1280px: `display: grid`, 7 cards, `fullTexts`: Lunes–Domingo, single row (`rowCount: 1`).
   - **Footer full day names:** **PASS** — footer shows `Lunes`, `Martes`, … (not `LUN` abbreviations).
   - **Optional `/wimpi/en/`:** **N/A** — navigation hit redirect loop (`/wimpi/en/es/es/...`); not required for acceptance.

5. **Overall:** **PASS**

6. **Product owner feedback:** The mobile horario semanal is readable on phones: abbreviated weekdays and wrapped rows replace the cramped seven-column strip. Desktop still shows the full week in one row. Footer horario is unchanged. Deploy was required after marketing CI; a hard reload/cache-bust may be needed briefly after deploy because hashed JS/CSS are cached for one year.

7. **URLs tested:**
   1. https://www.satisfecho.de/wimpi/es/
   2. https://www.satisfecho.de/wimpi/es/?t=202606020625 (cache-bust, mobile 375px)
   3. https://www.satisfecho.de/wimpi/es/?t=desktop720 (desktop 1280px)

8. **Relevant log excerpts (last section)**

```
# Marketing CI (083_wimpi)
completed success  Fix mobile opening-hours layout...  main  26802312698  2026-06-02T06:20:20Z

# Deploy to amvara9 (pos)
✓ master Deploy to amvara9 · 26802396689  deploy in 2m30s  completed success
[fetch-marketing] OK → front/sites/wimpi (28 files)
[marketing-sync] artifact OK: wimpi

# Production index (curl, cache-bust) — post-deploy
main-OY7OVYDV.js

# Browser eval @ 375px — post-deploy
shortTexts: LUN,MAR,MIÉ,JUE,VIE,SÁB,DOM | flexWrap: wrap | rowCount: 2

# Browser eval @ 1280px
fullTexts: Lunes…Domingo | display: grid | rowCount: 1
```
