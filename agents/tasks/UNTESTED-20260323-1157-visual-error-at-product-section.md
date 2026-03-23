# Visual error at product section

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/33

## Problem / goal
The products UI shows a small white gap (likely last row **`td`** height or table/footer styling). Screenshot in the issue: white strip in the product section.

## High-level instructions for coder
- Reproduce on the staff **products** view (tenant with enough rows to see the table footer/last row).
- Inspect table/card layout and CSS for the last row or container; remove the unintended gap while keeping existing spacing consistent with **`products`** / shared table styles.
- Verify in light theme (and dark if applicable) and add a brief note in **`CHANGELOG.md`** under **`[Unreleased]`** if user-visible.

## Coder notes (2026-03-23 UTC)
- **Cause:** Global **`td.actions { display: flex }`** breaks normal table-cell layout and can leave a visible strip; **`overflow-x: auto`** on **`.table-card`** without an inner scroller also interacts badly with rounded corners.
- **Change:** **`front/src/app/products/products.component.ts`** — inner **`.products-table-scroll`** wrapper; action buttons wrapped in **`.actions-inner`**. **`products.component.scss`** — **`overflow: hidden`** on **`.products-data-table`**, **`vertical-align: top`** on body cells, flex only on **`.actions-inner`**, **`td.actions`** forced to **`table-cell`**.
- **CHANGELOG:** **`[Unreleased]`** — GitHub **#33** fixed line.

---

## Testing instructions

### What to verify
- Staff **Products** tab with a populated product table: no thin white/off gap under the last row or along the bottom of the table card; action buttons still align to the right; horizontal scroll still works on narrow viewports.

### How to test
- Stack: **`docker compose -f docker-compose.yml -f docker-compose.dev.yml`** (HAProxy e.g. **`:4202`**).
- Smoke (includes navigating to **`/products`**):  
  `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version`  
  (requires demo login in **`.env`** if the script exercises sidebar — same as project default).
- Manual: open **`/products`**, scroll the product table to the bottom, check light theme (and dark if enabled).

### Pass/fail criteria
- **Pass:** Angular build succeeds (**`docker compose … logs --tail=80 front`** has no TS/template errors); smoke test **exit 0**; visually no stray strip under the table/card on Products.
- **Fail:** Build errors, broken table layout, or gap still visible at the bottom of the card.
