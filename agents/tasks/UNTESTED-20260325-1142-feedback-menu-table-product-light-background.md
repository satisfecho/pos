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
