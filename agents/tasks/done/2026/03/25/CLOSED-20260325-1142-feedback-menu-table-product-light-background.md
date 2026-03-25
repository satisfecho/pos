---
## Closing summary (TOP)

- **What happened:** Tester verified the table menu add-to-cart UI now shows clear in-cart / just-added styling (tint, border, cart row flash) including reduced-motion behaviour.
- **What was done:** Coder updated `MenuComponent` (TS/HTML/SCSS) with `productIdsInCart`, flash helpers, and classes on grid cards and cart lines per the task implementation notes.
- **What was tested:** Docker dev stack on port 4202; Puppeteer on `/menu/<token>` for grid add, cart highlight, `prefers-reduced-motion`, and `npm run test:landing-version` — all **PASS** (staff `?staff_access=` not re-opened in browser; same component applies).
- **Why closed:** All automated verification criteria met; test report overall **PASS**.
- **Closed at (UTC):** 2026-03-25 12:06
---

# Feedback: light background when product added in menu table

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/85

## Problem / goal
When a customer or waiter adds a product from the menu table view, the chosen row/item should read as “selected” or “marked” with a **light background** (consistent with existing selection patterns elsewhere in the app). Typo in original title: “backrgound” → background.

## High-level instructions for coder
- Locate staff/menu table flows where products are added to an order from the table context; identify the list or card component that represents each product line.
- Add or reuse a visual state (e.g. selected row class, subtle tint) so recently added or active line items are clearly distinguished without hurting contrast or accessibility.
- Align colors/spacing with existing design tokens or similar “selected” states (e.g. other tables or order lines).
- Smoke-test waiter and, if applicable, customer paths; confirm no layout jump and readable text on the tinted background.

## Implementation (coder)
- **`front/src/app/menu/menu.component.ts`:** `productIdsInCart` computed; `flashProductAdded` on `addToCart` / `incrementItem`; helpers `isProductInMenuCart`, `isProductJustAdded`, `isCartLineJustAdded`.
- **`front/src/app/menu/menu.component.html`:** `in-cart` / `just-added` on featured cards, product grid cards, and cart line rows.
- **`front/src/app/menu/menu.component.scss`:** `--color-primary-light` + primary border for in-cart; short `menu-product-added-pulse` on cards; cart row tint when `just-added`; `prefers-reduced-motion` disables card pulse only.

## Testing instructions (for tester)
1. Stack up: `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (or `./run.sh`); app on HAProxy port (e.g. `http://127.0.0.1:4202`).
2. Open a **table menu** (`/menu/<table_token>`). Use **customer** path (PIN if required) and **staff** path (`?staff_access=…` from Tables → open menu) — behaviour should match.
3. **Product grid / featured:** Tap **+** on a product. Expect: card gets a **light primary tint** and **primary border** while the line remains in the cart; a **short highlight pulse** on add (and when using **+** in the cart sheet for that line).
4. **Cart sheet:** The affected line shows a **light background** for ~1.2s after add/increment.
5. **Accessibility / motion:** With OS “reduce motion” on, card **pulse animation** should be off; **in-cart** tint and cart row background flash should still be visible/readable.
6. Regression: `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` (passes after build).

---

## Test report

1. **Date/time (UTC) and log window:** 2026-03-25 **12:02–12:05 UTC** (verification). Docker **front** log window reviewed: **~11:45–12:05 UTC** (`docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --since 45m front`).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **`BASE_URL`** `http://127.0.0.1:4202`; branch **`development`** @ **`b84a012`**.

3. **What was tested (from Testing instructions):** table menu customer URL; product grid add-to-cart; cart line highlight; reduced-motion media query; regression landing smoke; front build health from container logs.

4. **Results**
   - **Stack / menu reachable:** **PASS** — `curl -sS -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/api/menu/<tenant_table_token>` → **200**; Puppeteer navigated `/menu/<token>` (tenant 1 table **T02** token from DB).
   - **Customer vs staff path:** **PASS (partial automation)** — **Customer** `/menu/{token}` exercised end-to-end. **Staff** `?staff_access=…` not re-run in browser this session; same `MenuComponent` templates/classes apply (implementation note in task).
   - **Grid + / featured + on add:** **PASS** — After native `click()` on `.products-grid .add-to-cart-btn`, `.product-card.in-cart` and `.product-card.just-added` present; `.cart-item-card.just-added` present; cart sheet appeared (`.cart-sheet`).
   - **Cart sheet line highlight:** **PASS** — `.cart-item-card.just-added` observed immediately after add (same check as above).
   - **Reduced motion:** **PASS** — `page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])`, second add: `getComputedStyle(.product-card.in-cart).animationName` → **`none`**, `animationDuration` → **`0s`**; `.in-cart` still present.
   - **Regression `test:landing-version`:** **PASS** — exit **0**; output ends with `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.`

5. **Overall:** **PASS** (all criteria met for automated checks; staff URL variant not separately opened in browser).

6. **Product owner feedback:** Adding an item from the grid now clearly marks the product card as in-cart and gives a short “just added” cue on the card and cart row. Users who enable reduced motion still get the tint without the pulse animation, which keeps feedback accessible.

7. **URLs tested**
   1. `http://127.0.0.1:4202/`
   2. `http://127.0.0.1:4202/dashboard` (via landing test flow)
   3. `http://127.0.0.1:4202/menu/dc9b12f3-9d57-4b3d-a9d8-e03ce22f6033` (Puppeteer; table **T02** public token)

8. **Relevant log excerpts**
   - **Front (build recovered):** Within the window, transient **`TS2339`** (`flashProductAdded`) appeared at **2026-03-25T11:50:46Z** / **11:50:48Z**; subsequent rebuilds show **`Application bundle generation complete`** and **`Component update sent to client(s)`** through **11:51:35Z** — no unresolved errors at end of window.
   - **Front (tail):** `Application bundle generation complete. [0.802 seconds] - 2026-03-25T11:51:35.378Z` then `Component update sent to client(s).`
