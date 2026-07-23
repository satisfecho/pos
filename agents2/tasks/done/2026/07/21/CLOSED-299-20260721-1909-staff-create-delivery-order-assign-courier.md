---
## Closing summary (TOP)

- **What happened:** Staff can create Satisfecho Delivery orders (no table, address + optional courier) and filter them on `/staff/orders`.
- **What was done:** Delivery create/edit UI wired to `POST /orders/satisfecho-delivery` and `PUT /orders/{id}/delivery`, Delivery tab with channel badges, `GET /users/couriers`, i18n, and docs/tests updates.
- **What was tested:** Front build clean; pytest 5 passed; UI create #861 / edit delivery+courier / Delivery tab / API spot-check / Active·Not paid·History regression — **PASS**.
- **Why closed:** All tester criteria passed; feature fully delivered.
- **Closed at (UTC):** 2026-07-21 19:22
---

# Staff can create delivery order and assign a courier

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/299
- **299**

## Problem / goal

In the **staff orders** flow, allow creating an order **without a table**, with a **delivery address**, and optionally **assign a user with the courier role**. Add a **“Delivery”** list/filter in orders so staff can find Satisfecho Delivery orders quickly.

**Out of scope:** public Glovo-style customer app; marketplace (Uber/Glovo) integrations.

**Foundation already shipped (#297):** API + schema for first-party Satisfecho Delivery — see `docs/0053-satisfecho-delivery-order-channel.md` and closed task `agents2/tasks/done/2026/07/20/CLOSED-297-20260720-2039-mark-own-satisfecho-delivery-orders.md`. Endpoints include `POST /orders/satisfecho-delivery`, `PUT /orders/{id}/delivery`, and channel fields on `GET /orders`. This issue is primarily **staff UI** on top of that API.

## High-level instructions for coder

- Skim `docs/0053-satisfecho-delivery-order-channel.md` and existing staff orders UI; wire create/update to the Satisfecho Delivery endpoints (do not reinvent marketplace `delivery_integration_id` flows).
- Staff create flow: order with no table, required delivery address, optional phone/name/notes, optional assign courier (tenant users with courier role — reuse whatever list/API already exists for couriers if present).
- Orders list: add a **Delivery** filter/tab (or equivalent) for `order_channel=satisfecho_delivery` (and clarify vs marketplace if both appear).
- Allow staff to update delivery metadata / reassign courier where the API already supports it (`PUT /orders/{id}/delivery`).
- i18n for new UI strings in all `front/public/i18n/*.json` locales per project rules.
- Prefer extending existing orders screens over a parallel app; no public customer delivery portal.
- After UI work: Angular build clean in `pos-front` logs; smoke staff create → list Delivery → assign/update courier via the API the UI calls.

## Implementation notes (feature coder)

- Staff UI on `/staff/orders`: **New delivery order** modal (`POST /orders/satisfecho-delivery`), **Delivery** tab (Satisfecho + marketplace with channel badges), **Edit delivery** (`PUT /orders/{id}/delivery`).
- `GET /users/couriers` (requires `order:read`) for courier assign dropdown (waiters included).
- Frontend API helpers: `createSatisfechoDeliveryOrder`, `updateOrderDelivery`, `getCouriers`.
- i18n keys under `ORDERS.*` in all `front/public/i18n/*.json`.
- Docs: `docs/0053-satisfecho-delivery-order-channel.md` updated for staff UI + couriers endpoint.
- Backend tests: `back/tests/test_satisfecho_delivery_orders.py` (includes couriers list) — 5 passed.

## Testing instructions

1. **Build:** Confirm `pos-front` logs show `Application bundle generation complete` with no `✘ [ERROR]` for `orders.component.ts`.
2. **Backend:** From repo root  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest tests/test_satisfecho_delivery_orders.py -q`
3. **Staff UI (manual / Puppeteer):** Log in as owner/admin/waiter with `order:update_status`.
   - Open `/staff/orders` → **New delivery order**.
   - Add ≥1 product, required address, optional phone/name/notes, optional courier → Create.
   - Open **Delivery** tab: new order appears with Satisfecho Delivery badge, address, courier.
   - **Edit delivery**: change address and/or reassign/clear courier → Save; card updates.
4. **API spot-check (optional):**  
   - `GET /users/couriers` returns only `role=courier` users.  
   - `POST /orders/satisfecho-delivery` then `PUT /orders/{id}/delivery` then `GET /orders` shows `order_channel=satisfecho_delivery`.
5. **Regression:** Active / Not paid / History tabs still work; marketplace orders (if any) show Marketplace badge on Delivery tab.

## Test report

1. **Date/time (UTC):** 2026-07-21 19:18:24 start → 19:22:06 end. Log window: ~19:12–19:22 UTC (`pos-front`, `pos-back`).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` (synced). Staff login: tenant 1 owner (demo credentials; local password re-synced via `app.seeds.set_user_password` so `.env` matched DB).
3. **What was tested:** Front build for `orders.component.ts`; pytest `tests/test_satisfecho_delivery_orders.py`; staff UI create delivery / Delivery tab / edit delivery+courier; API couriers + create/update channel; Active / Not paid / History regression + Marketplace badge.
4. **Results:**
   - **Build — PASS:** Forced rebuild at 19:18:46 UTC → `Application bundle generation complete` with no `✘ [ERROR]` for `orders.component.ts` (earlier transient TS2339 during coder hot-reload had already cleared).
   - **Backend pytest — PASS:** `5 passed in 2.74s`.
   - **Staff UI create — PASS:** Modal → address/phone/customer/notes/courier/item → Create → order **#861** on Delivery tab with Satisfecho Delivery badge, address, courier Test Courier; toast “Delivery order created”.
   - **Delivery tab — PASS:** Tab “Delivery 7”; Satisfecho + Marketplace badges; address/courier visible.
   - **Edit delivery — PASS:** #861 address → `Calle Editada 99, Barcelona`, courier cleared → Unassigned; toast “Delivery details updated”.
   - **API spot-check — PASS:** `GET /users/couriers` → only `role=courier` (id 1859); `POST /orders/satisfecho-delivery` 200; `PUT /orders/860/delivery` 200 with `order_channel=satisfecho_delivery`; list confirms channel.
   - **Regression — PASS:** Active 20 / Not Paid 2 / History 12 all render; #708 shows MARKETPLACE on Delivery tab.
5. **Overall:** **PASS**
6. **Product owner feedback:** Staff can create and edit Satisfecho Delivery orders with courier assign/clear without leaving `/staff/orders`. Channel badges make first-party vs marketplace clear. Ready for closer.
7. **URLs tested:**
   1. http://127.0.0.1:4202/login?tenant=1
   2. http://127.0.0.1:4202/dashboard
   3. http://127.0.0.1:4202/staff/orders
8. **Relevant log excerpts:**
   - `pos-front`: `Application bundle generation complete. [0.640 seconds] - 2026-07-21T19:18:46.918Z` (no ERROR after).
   - `pos-back`: `POST /orders/satisfecho-delivery HTTP/1.1" 200 OK` (UI #861); `PUT /orders/861/delivery HTTP/1.1" 200 OK`.
