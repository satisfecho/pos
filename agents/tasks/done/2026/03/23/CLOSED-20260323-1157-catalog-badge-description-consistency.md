---
## Closing summary (TOP)

- **What happened:** GitHub **#34** asked for consistent catalog card body height so provider prices align, with expand/collapse for long copy.
- **What was done:** Coder updated the catalog card layout (line-clamp, **Show more** / **Show less**, spacer before prices), added i18n keys, and noted the change in **CHANGELOG** `[Unreleased]`.
- **What was tested:** Tester ran **`/catalog`** checks (alignment, a11y, Spanish UI), **`npm run test:landing-version`**, and **`npm run test:catalog`** — all **PASS**; Angular build clean.
- **Why closed:** All pass/fail criteria met per tester report (**PASS**).
- **Closed at (UTC):** 2026-03-23 13:30
---

# Feedback / consistency in catalog description (badge area)

## Status
**CLOSED** — tester verification **PASS** (2026-03-23 UTC).

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/34

## Problem / goal
Catalog cards use varying description heights so prices and badges do not align across the grid. Request: uniform card body height (or max height) and a **“more”** affordance to expand long text so prices line up. Screenshot in the issue.

## High-level instructions for coder
- Review **`catalog`** (or provider catalog) card template and styles; define a consistent description block height (line-clamp or max-height) with accessible expand/collapse (“more” icon or control).
- Ensure i18n strings for any new control; keep mobile/touch targets usable.
- Smoke-test **`/catalog`** (or relevant route) with mixed short/long descriptions; update **`CHANGELOG.md`** **`[Unreleased]`** if behaviour is user-visible.

## Coder notes
- **`front/src/app/catalog/catalog.component.ts`:** Wrapped description, wine detail badges, aromas, and elaboration in a clamp region. When text is long (length thresholds), collapsed state uses **3-line** clamp on description and **2-line** on aromas/elaboration; **Show more / Show less** toggles per card with **`aria-expanded`** / **`aria-controls`**. Added **`catalog-card-spacer`** (`flex: 1 1 0`) before provider prices so **price blocks align** at the bottom of cards within the same CSS grid row; removed **`margin-top: auto`** from actions (spacer owns vertical fill).
- **i18n:** **`CATALOG.SHOW_MORE`** / **`CATALOG.SHOW_LESS`** in **`front/public/i18n/*.json`** (en, de, es, fr, ca, zh-CN, hi).
- **CHANGELOG:** `[Unreleased]` **Changed** — GitHub **#34**.

---

## Testing instructions (tester)

### What to verify
- On **`/catalog`**, cards in a row show **provider price** sections aligned at the same vertical position when descriptions differ in length.
- Long **description** / **aromas** / **elaboration**: **Show more** appears, text is clamped when collapsed; **Show less** restores clamp; focus ring visible on keyboard (**Tab**).
- Short text: no expand control; layout unchanged aside from spacer alignment.
- At least one non-English language shows translated **Show more** / **Show less**.

### How to test
- Stack: `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (or `./run.sh`); app via HAProxy e.g. **`BASE_URL=http://127.0.0.1:4202`**.
- Log in as a role with catalog access; open **`/catalog`**. Compare cards with long vs short descriptions side by side.
- Automated smoke (includes navigating to **`/catalog`**): from **`front/`**,  
  `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version`  
  (with **`DEMO_LOGIN_EMAIL`** / **`DEMO_LOGIN_PASSWORD`** or **`LOGIN_EMAIL`** / **`LOGIN_PASSWORD`** in **`.env`** if the script should exercise login + sidebar).
- Optional deeper check: **`BASE_URL=… LOGIN_EMAIL=… LOGIN_PASSWORD=… node front/scripts/test-catalog.mjs`** (see **`docs/testing.md`**).

### Pass / fail criteria
- **Pass:** No Angular build errors; **`/catalog`** loads; price rows align across cards in a row; expand/collapse works for long text; i18n strings present.
- **Fail:** Build errors, broken **`/catalog`**, misaligned prices with mixed-length content, or expand control missing/broken for obviously long descriptions.

---

## Test report (tester)

1. **Date/time (UTC):** Started ~2026-03-23T13:20Z; finished ~2026-03-23T13:35Z. Log window: same (front/back compose logs reviewed around catalog and Puppeteer runs).

2. **Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml`; **`BASE_URL=http://127.0.0.1:4202`**; branch **`development`** @ **`140e674`**; demo login from repo **`.env`** (`DEMO_LOGIN_*`).

3. **What was tested:** Criteria from **What to verify** above: price alignment per grid row, long-text expand/collapse + a11y, short cards without expand, non-English **Show more** / **Show less**; plus smoke **`npm run test:landing-version`** and **`npm run test:catalog`**.

4. **Results**
   - **Angular build / `/catalog` loads:** **PASS** — `docker compose … logs --tail=40 front` shows `Application bundle generation complete` with no errors; **`test:landing-version`** exit **0** (includes nav step **`/catalog`**); **`test:catalog`** exit **0** (149 cards, images OK).
   - **Provider price rows aligned (same grid row):** **PASS** — In-page measurement: group `.catalog-card` by `offsetTop` within `.catalog-grid`; across all rows with ≥2 cards, max spread of `.price-comparison` `getBoundingClientRect().top` **≤ 1px** (typically **0px**).
   - **Long text: expand/collapse + `aria-*`:** **PASS** — 18× `.catalog-expand-btn`; programmatic click sets **`aria-expanded`** to **`true`** and label switches to translated “show less” (verified under **es**: **Ver más** → **Ver menos**).
   - **Short text: no expand control:** **PASS** — **131** / **149** cards have no `.catalog-expand-btn`.
   - **Non-English strings in UI:** **PASS** (locale **es**) — After `select.language-select` → **es**, catalog **h1** **Catálogo de productos**, first expand **Ver más** ( **`/i18n/es.json`** loads). **Note:** **`de.json`** is currently **invalid JSON** (missing comma after **`RESERVATION_REMINDER_2H_HINT`** ~line 914); German locale therefore cannot load in the app — unrelated to catalog layout logic but blocks **Deutsch** UI until fixed (coder follow-up).
   - **Keyboard focus visibility:** **PASS** — `document.querySelector('.catalog-expand-btn').focus()` → computed **`outline-style: solid`**, **`outline-width: 2px`**.

5. **Overall:** **PASS** (all criteria met; Spanish used for non-English UI because **de** file parse fails).

6. **Product owner feedback:** Catalog cards keep provider price blocks lined up across each row despite uneven copy length, and long descriptions are readable via expand without breaking the grid. German users will not see the new strings until **`de.json`** is repaired; other locales (e.g. Spanish) already show the control correctly.

7. **URLs tested**
   1. `http://127.0.0.1:4202/`
   2. `http://127.0.0.1:4202/login`
   3. `http://127.0.0.1:4202/dashboard` (post-login)
   4. `http://127.0.0.1:4202/catalog`
   5. (Landing smoke) sidebar routes including **`/catalog`** as in **`test-landing-version.mjs`** output.

8. **Relevant log excerpts**
   - **front:** `Application bundle generation complete. [0.379 seconds] - 2026-03-23T13:20:04.266Z` (no TS/NG errors in tail).
   - **back:** `GET /uploads/providers/...` **200** for catalog product images during **`test:catalog`** (representative lines in window above).

_GitHub: issue **#34** comment/labels not updated — `gh issue comment` failed (token not allowed to add comments on this repo)._
