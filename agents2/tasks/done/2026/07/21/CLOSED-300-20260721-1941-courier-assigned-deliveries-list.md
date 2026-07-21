---
## Closing summary (TOP)

- **What happened:** Courier `/courier` Mine tab stayed empty even after staff assigned Satisfecho Delivery orders via `courier_user_id`.
- **What was done:** Extended `GET /courier/orders` with assignment/address/phone/totals; Mine/Available/Completed tabs filter by courier assignment; refresh + i18n + docs/tests.
- **What was tested:** Front build clean; pytest 11 passed; Mine/Available/Completed + refresh + detail + API assign spot-check — **PASS**.
- **Why closed:** All tester criteria passed; feature fully delivered.
- **Closed at (UTC):** 2026-07-21 19:50
---

# Courier: show assigned deliveries (replace empty Mine / placeholder)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/300
- **300**

## Problem / goal

On **`/courier`**, the courier home still does not show orders **assigned to the logged-in courier**. After staff assignment shipped (#299 / `courier_user_id` on Satisfecho Delivery), wire the courier UI to list those deliveries: address, customer, basic totals; **read-only + refresh**. No map or chat yet.

**Context already shipped:**
- Courier portal list/detail (#275): `GET /courier/orders`, `GET /courier/orders/{id}`, Available / Mine / Completed tabs — but **Mine is hard-coded empty** until assignment.
- Staff can assign couriers (#299): see `docs/0053-satisfecho-delivery-order-channel.md`.

Issue text mentions **`GET /courier/deliveries`**. Prefer **extending** existing courier order APIs (filter by `courier_user_id == current courier`) over a parallel endpoint unless a new path is clearly required; keep tenant scoping.

**Out of scope:** map, chat, claim/self-assign flows, marketplace driver apps, public customer delivery UI.

## High-level instructions for coder

- Skim `docs/0053-satisfecho-delivery-order-channel.md`, `CourierHomeComponent`, and `GET /courier/orders` serialization; confirm how assignment is stored (`courier_user_id`).
- Backend: return (or filter) orders assigned to the current courier for open/relevant statuses; include **delivery address**, **customer** name/phone as available, and **basic totals** (reuse existing courier summary/detail serializers where possible).
- Frontend `/courier`: populate **Mine** (and/or replace any leftover placeholder) with assigned deliveries; show address, customer, totals; support **refresh**; keep Available/Completed coherent with assignment (do not break detail route `/courier/orders/:id`).
- i18n for any new strings in all `front/public/i18n/*.json` locales.
- Tests: backend coverage for assigned-only listing; smoke courier login → Mine shows staff-assigned order; Angular build clean in `pos-front` logs.

## Implementation notes

- Extended `GET /courier/orders` summary serialization with `courier_user_id`, `delivery_address`, `customer_phone`, `order_channel`, `total_cents` (no parallel `/courier/deliveries` endpoint).
- `CourierHomeComponent`: **Available** = open + unassigned; **Mine** = open + `courier_user_id ===` current courier; **Completed** = completed + unassigned or assigned to me; refresh button; list cards show address/phone/total.
- Docs: `docs/0053-satisfecho-delivery-order-channel.md`; CHANGELOG Unreleased; i18n `COURIER_HOME.REFRESH` + updated `EMPTY_MINE` in all locales.
- Backend test: `test_courier_list_includes_assigned_delivery_fields` in `back/tests/test_courier_orders.py`.

## Testing instructions

1. **Build:** Confirm `pos-front` logs show `Application bundle generation complete` with no `✘ [ERROR]` for `courier-home.component.ts`.
2. **Backend:** From repo root  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest tests/test_courier_orders.py tests/test_satisfecho_delivery_orders.py -q`
3. **Courier UI:** Log in at `/courier/login` as a courier (e.g. `courier-test-phase1@amvara.de` / `secret` on local demo).
   - Open **Mine**: staff-assigned open Satisfecho Delivery orders appear with customer, phone, address, item summary, and total.
   - Tap an order → `/courier/orders/:id` still loads detail.
   - **Refresh** reloads the list without logout.
   - **Available** shows only open orders with no courier; assigned orders do not appear there.
   - **Completed** still lists completed deliveries coherent with assignment (own or unassigned).
4. **API spot-check (optional):**  
   - Staff create/assign via `POST /orders/satisfecho-delivery` with `courier_user_id`.  
   - Courier `GET /courier/orders` includes that row with matching `courier_user_id`, `delivery_address`, `customer_phone`, `total_cents`.
5. **Regression:** Unassigned marketplace/open delivery orders still appear under **Available**; detail route unchanged.

## Coder self-check (pre-tester)

- Backend pytest: **11 passed** (`test_courier_orders.py` + `test_satisfecho_delivery_orders.py`).
- Front build: `Application bundle generation complete` (no courier-home errors; unrelated NG8107 warnings in `menu.component.html` only).
- API smoke: courier cookie login → list includes newly created assigned order `#882` (`Mine Tab Smoke St 42`) with address/phone/totals (`SMOKE_OK`).

## Test report

1. **Date/time (UTC):** 2026-07-21 19:47:42 – 19:49:29 UTC. Log window: `pos-front` / `pos-back` since ~19:25–19:49 UTC (UI + API smoke).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` (synced via `./scripts/git-sync-development.sh`). Courier: `courier-test-phase1@amvara.de` / `secret` (id 1859).
3. **What was tested:** Front build for courier-home; pytest courier + Satisfecho Delivery; `/courier` Mine/Available/Completed + refresh + detail; API create/assign spot-check; Available excludes assigned.
4. **Results:**
   - **Build (no `courier-home.component.ts` ✘ ERROR; bundle complete):** **PASS** — latest `Application bundle generation complete` at 19:44:54 / 19:45:01 UTC; no courier-home errors (only unrelated NG8107 in `menu.component.html`). Earlier transient `OrdersComponent` TS2339 noise before 19:14 UTC; subsequent builds clean for this criterion.
   - **Backend pytest (`test_courier_orders.py` + `test_satisfecho_delivery_orders.py`):** **PASS** — `11 passed in 5.41s`.
   - **Mine tab shows assigned with customer/phone/address/items/total:** **PASS** — `#882` Mine Smoke, +34600999000, Mine Tab Smoke St 42, 1× Due.Zero, €17.00 (and `#859`/`#858`/`#857`/`#821`).
   - **Detail `/courier/orders/:id`:** **PASS** — `#882` detail loads (customer, delivery address, items, total).
   - **Refresh without logout:** **PASS** — Refresh reloaded list; still on `/courier` with Mine rows including `#882`.
   - **Available = open unassigned only:** **PASS** — Available showed `#861`/`#860`/`#708`; assigned `#882` not listed. API: new `#900` assigned → not in Available filter.
   - **Completed coherent:** **PASS** — Completed tab: “No completed deliveries yet.” (no completed own/unassigned rows in current data).
   - **API spot-check:** **PASS** — Staff `POST /orders/satisfecho-delivery` with `courier_user_id=1859` → order `#900`; courier `GET /courier/orders` includes `courier_user_id`, `delivery_address=Verification Ave 300`, `customer_phone=+34600700300`, `total_cents=1700`.
   - **Regression Available marketplace/open:** **PASS** — `#708` marketplace Demo still under Available.
5. **Overall:** **PASS**
6. **Product owner feedback:** Couriers can finally see staff-assigned Satisfecho Delivery jobs under Mine with address, phone, and total, and open detail without leaving the portal. Available correctly hides assigned work so drivers are not competing for already-owned orders. Ready to close from a product perspective.
7. **URLs tested:**
   1. http://127.0.0.1:4202/courier/login
   2. http://127.0.0.1:4202/courier
   3. http://127.0.0.1:4202/courier/orders/882
   4. http://127.0.0.1:4202/courier (back + Refresh + Available/Mine/Completed)
8. **Relevant log excerpts:**
   ```
   pos-front: Application bundle generation complete. [1.265 seconds] - 2026-07-21T19:44:54.783Z
   pos-front: Application bundle generation complete. [0.013 seconds] - 2026-07-21T19:45:01.601Z
   pos-back: GET /courier/me 200; GET /courier/orders 200; GET /courier/orders/882 200
   pos-back: POST /orders/satisfecho-delivery 200; GET /courier/orders 200 (spot-check #900)
   pytest: ........... [100%] 11 passed in 5.41s
   ```
