# Feedback / consistency in catalog description (badge area)

## Status
**UNTESTED** — implementation complete; tester to verify.

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
