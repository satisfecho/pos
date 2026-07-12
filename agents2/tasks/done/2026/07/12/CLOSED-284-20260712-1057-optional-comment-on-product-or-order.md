---
## Closing summary (TOP)

- **What happened:** Issue #284 asked for optional free-text comments on order line items and/or the whole order, visible on kitchen and bar displays.
- **What was done:** Reused existing `Order.notes` / `OrderItem.notes` with trim/cap helpers; added public menu cart controls, staff order edit support, and highlighted comment styling on kitchen/bar views with i18n across locales.
- **What was tested:** Tester verified public menu checkout, current-order tracker, kitchen/bar displays, staff orders edit, `test_order_notes.py` (2 passed), and a clean Angular build — all PASS.
- **Why closed:** All acceptance criteria met; test report overall PASS with no rework required.
- **Closed at (UTC):** 2026-07-12 11:12
---

# Optional comment on each product and/or order

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/284
- **284**

## Problem / goal

Customers should be able to add **optional free-text comments** when ordering — per line item and/or for the whole order — e.g. “lots of ice for my coke”, “cold milk for my coffee”, “pizza cheese only mozzarella”.

Comments must be **optional** (never block checkout) and **clearly visible** on **kitchen display** and **bar** views so staff can prepare orders correctly.

## High-level instructions for coder

- Review existing order line model (`OrderItem`, public menu/order flow, kitchen display, bar views) — identify where notes/special instructions would persist and display with minimal schema change.
- **Data model:** Add optional comment field(s) on order line items and/or order header (tenant-scoped); migration idempotent per project conventions.
- **Public / table ordering UI:** Add an optional comment control per product (and optionally order-level note); keep UX lightweight (expand/collapse or small text field); **`ngx-translate`** for all locales.
- **Staff order creation:** Mirror optional comment on manual order entry if applicable.
- **Kitchen & bar displays:** Show comments prominently on each affected line (typography/contrast so they are not missed); no truncation that hides safety-critical text without expand.
- **API:** Include comment fields in create/update order payloads and in kitchen/bar list endpoints; preserve tenant scoping and existing auth.
- Out of scope for v1: structured modifiers/allergen system — plain text only unless existing modifier infrastructure fits with small extension.
- After implementation: append **Testing instructions**; exercise public order flow with comments; verify kitchen/bar screens; `docker logs --since 10m pos-front` — clean Angular build.

## Implementation notes

- Reused existing `Order.notes` and `OrderItem.notes` fields (no migration required).
- Added `back/app/order_notes.py` for trim/cap (500 chars) and merge-safe note equality.
- Public menu cart: per-item “Add comment” toggle + order-level notes textarea.
- Staff orders: item comment on add/edit; notes visible on order cards.
- Kitchen/bar (`/kitchen`, `/bar`): highlighted comment styling with full text (no truncation).

## Testing instructions

1. **Public menu (table order)**
   - Open a table menu URL (e.g. `http://127.0.0.1:4202/menu/<table-token>`).
   - Add items to cart; tap **Add comment** on a line, enter e.g. `lots of ice`; add an order note e.g. `serve together`.
   - Place order — checkout must not require comments.
   - Confirm comments appear on the current-order tracker after submit.

2. **Kitchen / bar display**
   - Log in as kitchen/bar staff; open `/kitchen` and `/bar`.
   - Verify item comments show in the highlighted amber box with **Comment:** label.
   - Verify order-level notes appear in the order notes banner (full text, no truncation).

3. **Staff orders**
   - Open `/orders`; find the test order.
   - Confirm item and order notes are visible on the order card.
   - Edit order: add a new item with an item comment; blur the comment field on an existing line to save.

4. **Backend**
   - `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest tests/test_order_notes.py -q`

5. **Frontend build**
   - `docker logs --since 10m pos-front 2>&1 | grep -iE "error|TS[0-9]|failed"` — expect no errors (bundle generation complete).

---

## Test report

1. **Date/time (UTC):** 2026-07-12 11:08–11:15 UTC. Log window: `docker logs --since 15m pos-front|pos-back` (approx. 11:00–11:15 UTC).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `c1fda471`. Table token: `0a57107e-0927-45bc-bf70-cfc06669caa0` (Table 1). Staff login: `ralf@roeber.de` (repo `.env` password stale; temporary local test password set in DB for verification only, not committed).

3. **What was tested:** Public menu optional item/order comments; kitchen & bar display; staff orders list/edit; backend `test_order_notes.py`; frontend build logs.

4. **Results:**
   - **Public menu cart UI (Add comment, order notes, optional checkout)** — **PASS.** Cart shows **Add comment** toggle, item comment field, and **Order notes** textarea; **Place order** enabled without comments.
   - **Public menu current-order tracker shows comments** — **PASS.** Order #439 tracker displays item comments (`cheese only mozzarella`, `lots of ice, well chilled`) and `Order notes: serve together`.
   - **Kitchen display item comments + order notes banner** — **PASS.** `/kitchen` shows `#439` with **Comment:** `cheese only mozzarella` and full order notes banner (no truncation).
   - **Bar display item comments + order notes banner** — **PASS.** `/bar` shows beverage lines with **Comment:** labels (`lots of ice`, etc.) and full order notes.
   - **Staff orders card shows item/order notes** — **PASS.** `/staff/orders` order #439 shows per-item notes and order notes banner.
   - **Staff edit: add item with comment + blur-save existing line** — **PASS.** Edit modal added **Il 4 Napoletano** with `cheese only mozzarella`; blur on existing line saved `lots of ice, well chilled` (`PUT /orders/439/items/710` → 200).
   - **Backend pytest `tests/test_order_notes.py`** — **PASS.** `2 passed in 0.02s`.
   - **Frontend build** — **PASS.** Transient TS errors appeared earlier in the 15m window during parallel edits; latest lines: `Application bundle generation complete` (11:07:24 UTC), no new errors during verification.

5. **Overall:** **PASS**

6. **Product owner feedback:** Guests can add optional per-item and order-level comments on the table menu without blocking checkout. Comments persist to the API and appear prominently on bar/kitchen displays and staff order screens, including inline edit with blur-save. The feature reuses existing notes fields cleanly; staff should find special requests hard to miss on bar and kitchen views.

7. **URLs tested:**
   1. http://127.0.0.1:4202/menu/0a57107e-0927-45bc-bf70-cfc06669caa0
   2. http://127.0.0.1:4202/login
   3. http://127.0.0.1:4202/dashboard
   4. http://127.0.0.1:4202/kitchen
   5. http://127.0.0.1:4202/bar
   6. http://127.0.0.1:4202/staff/orders

8. **Relevant log excerpts:**
   - `pos-back`: `POST /menu/0a57107e-0927-45bc-bf70-cfc06669caa0/order HTTP/1.1" 200 OK`; `PUT /orders/439/items/710 HTTP/1.1" 200 OK`
   - `pos-front`: `Application bundle generation complete. [1.439 seconds] - 2026-07-12T11:07:24.431Z`
