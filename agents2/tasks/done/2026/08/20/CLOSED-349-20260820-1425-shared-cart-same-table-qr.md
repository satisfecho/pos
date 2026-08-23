---
## Closing summary (TOP)

- **What happened:** Same-table QR guests did not share a live cart before Place Order; each device kept a local cart only.
- **What was done:** Added Redis shared draft cart for activated dine-in tables (API + `cart_updated` WebSocket); kept per-device `session_id` attribution; Take Away stays local; docs 0008/0009 updated.
- **What was tested:** pytest (6 passed), dine-in vs Take Away flag, two-browser UI + Place Order + Close Table, front build, landing smoke — overall PASS.
- **Why closed:** All criteria passed.
- **Closed at (UTC):** 2026-08-20 14:43
---

# Shared cart for same table QR (multi-device)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/349
- **349**

## Problem / goal

Reporter expects devices that open the same `/menu/{tableToken}` (table QR) to share one live cart and settle as one table bill. Today each device gets its own `session_*` in `localStorage` and a component-local cart; sync only happens after order submit. WebSocket today tracks placed-order status, not pre-submit cart lines.

**Design conflict (must resolve before coding):** `docs/0008-order-management-logic.md` documents **intentional** per-browser `session_id` isolation. Shared unpaid orders on one table token were the old failure mode (mixed bills, wrong payer). Do **not** silently reverse that without a product decision and a doc update.

## High-level instructions for coder

- Read `docs/0008-order-management-logic.md` (session / order lifecycle) and the public menu flow (`/menu/{tableToken}`) before changing behaviour.
- Confirm product intent with the issue: **keep** per-device isolation (then document expected UX / close or re-label), **or** add an explicit shared-table mode that preserves attribution and payment safety.
- If shared cart is approved:
  - Define how devices join one table session (server-side), how cart add/update/remove syncs (API + WebSocket or polling), and how orders/bills merge without losing `added_by_session` / per-guest clarity.
  - Update `docs/0008` (or a short ADR) so the new rule replaces the isolation principle where intended.
  - Keep tenant scoping and auth consistent with existing public menu / order endpoints.
- Prefer the smallest vertical slice that proves multi-device cart visibility; avoid a second parallel order path.
- Smoke: two browsers on the same table token (see reservation/menu patterns in `docs/testing.md`); no secrets in task follow-ups.

## Implementation summary (010)

**Product decision:** Keep per-device `session_id` for attribution. Do not reverse take-away / unauthenticated token sharing. Align with shipped **docs/0009**: activated dine-in tables already share one `active_order_id` bill. Gap was pre-submit cart only.

**Shipped slice:**
- Redis draft cart keyed by `table_id` (`back/app/table_cart.py`)
- Public API: `GET/POST /menu/{token}/cart`, `PUT/DELETE …/cart/items/{line_id}`
- WebSocket type `cart_updated` on the existing table channel
- Menu flag `table_shared_cart` (active dine-in only; take-away stays local)
- Front menu syncs cart; other guests’ lines are read-only; Place Order submits **this device’s** lines only
- Docs: `docs/0008`, `docs/0009` updated
- Tests: `back/tests/test_table_cart.py`, `test_table_cart_api.py`

## Testing instructions

1. **Unit / API (Docker):**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back \
     python3 -m pytest tests/test_table_cart.py tests/test_table_cart_api.py -q
   ```
   Expect 6 passed.

2. **Menu flag:** Activate a dine-in table (e.g. T01). `GET /api/menu/{token}` must include `"table_shared_cart": true`. Take Away table must be `false`.

3. **Two-browser shared cart:**
   - Open `/menu/{token}` in browser A and browser B (or normal + incognito).
   - Enter different names.
   - Add a product on A → expand cart on B; B should show A’s line with “Added by …”.
   - B cannot change A’s quantity; B can add their own line.
   - Place Order on A (PIN) → A’s draft lines leave the shared cart; B’s lines remain; placed items appear on the shared table order for both.

4. **Close table:** Staff Close Table clears Redis cart; both browsers get `table_closed` as before.

5. **Frontend build:** `docker logs --since 10m pos-front` — no TypeScript/Angular errors after menu changes.

6. **Smoke:** `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` (already green in coder session).

## Test report

1. **Date/time (UTC):** 2026-08-20 14:34:59 start → 2026-08-20 14:42:03 end. Log window: `pos-front` / `pos-back` ~14:30–14:42 UTC.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` (local uncommitted shared-cart slice under test via bind mounts).
3. **What was tested:** Unit/API pytest; menu `table_shared_cart` flag (dine-in vs Take Away); two isolated browser contexts on same table token; Place Order + PIN; staff Close Table; front build logs; landing smoke.
4. **Results:**
   - **Unit/API pytest:** **PASS** — `tests/test_table_cart.py` + `test_table_cart_api.py`: 6 passed.
   - **Menu flag dine-in:** **PASS** — activated Table 17 `GET /api/menu/{token}` → `table_shared_cart: true`.
   - **Menu flag Take Away:** **PASS** — `table_shared_cart: false` while table active.
   - **Two-session API cart:** **PASS** — Alice+Bob lines shared; B `PUT` on A’s `line_id` → 404 `not owned by this session`; Place Order removes A’s draft lines and leaves Bob; `GET …/order` shows placed Coca Cola.
   - **Two-browser UI:** **PASS** — Browser B expanded cart shows “Added by AliceBrowser” and no qty controls on A’s line; shared-cart hint visible; Place Order on A with PIN created order `2879` with Coca Cola; draft cart empty after place.
   - **Close table:** **PASS** — staff close clears Redis (`GET …/cart` → `shared:false`, `reason:local_only`); browsers A and B show “Table Closed / not currently accepting orders”.
   - **Frontend build:** **PASS** — after a transient fail at 14:30:59 UTC during coder edits, subsequent rebuilds completed; no TS/NG compile errors in the verification window (NG8107 warnings only).
   - **Landing smoke:** **PASS** — `npm run test:landing-version` → RESULT OK.
5. **Overall:** **PASS**
6. **Product owner feedback:** Shared draft cart works for activated dine-in QR sessions: guests see each other’s lines with attribution, cannot edit others’ lines, and Place Order submits only their own lines onto the shared table order. Take Away stays local-only, which matches the product decision in docs 0008/0009.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/menu/7b136565-5370-452b-8fd6-8f7cbe86dcba` (browser A, isolated)
   2. `http://127.0.0.1:4202/menu/7b136565-5370-452b-8fd6-8f7cbe86dcba` (browser B, isolated)
   3. `http://127.0.0.1:4202/` (landing smoke)
   4. `http://127.0.0.1:4202/dashboard` (landing smoke after login)
8. **Relevant log excerpts:**
   - pytest: `6 passed, 1 warning in 1.77s`
   - front: `Application bundle generation complete` (multiple after 14:31 UTC); no `Failed to compile` in test window
   - landing: `>>> RESULT: Landing version OK; demo restaurant card OK; demo login (tenant=1) OK; sidebar nav OK.`
   - UI close: both browsers showed `Table Closed` / `This table is not currently accepting orders.`

