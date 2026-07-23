---
## Closing summary (TOP)

- **What happened:** Courier portal could list/open assigned deliveries but had no actions to progress fulfillment (accept / pick up / deliver).
- **What was done:** Added `out_for_delivery` status, `POST /courier/orders/{id}/actions` (accept/reject/picked_up/delivered) with `allowed_actions`, sticky detail UI + i18n, and docs/tests.
- **What was tested:** pytest 11 passed; migration applied; Puppeteer courier-actions smoke (Mark picked up → Out for delivery); front build clean — **PASS**.
- **Why closed:** All tester criteria passed; feature fully delivered.
- **Closed at (UTC):** 2026-07-21 20:18
---

# Courier: accept / pick up / deliver status actions

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/301
- **301**

## Problem / goal

Courier portal can list and open assigned deliveries (#300) but still has **no actions** to progress fulfillment. Add courier-facing status actions: **accept** (optional), **picked up** / **out for delivery**, **delivered**, and optionally **reject**. Keep **Order** / **OrderItem** status consistent with kitchen/staff flows.

**Context already shipped:**
- Courier list/detail (#275, #300): `GET /courier/orders`, `GET /courier/orders/{id}`; Mine/Available/Completed; assignment via `courier_user_id`.
- Satisfecho Delivery channel + staff create/assign (#297–#299): see `docs/0053-satisfecho-delivery-order-channel.md`.
- Existing order statuses: `pending`, `preparing`, `ready`, `partially_delivered`, `paid`, `completed`, `cancelled` (`OrderStatus` in `back/app/models.py`). Courier APIs today are **read-only** (no POST/PUT under `/courier/…` for status).

**Out of scope:** map/chat, staff UI redesign, marketplace driver apps, public customer delivery tracking, changing how staff creates/assigns deliveries.

## High-level instructions for coder

- Skim `docs/0053-satisfecho-delivery-order-channel.md`, courier home/detail components, and kitchen/staff order-status update paths so courier transitions do not diverge from kitchen semantics.
- Design a small set of **courier-only** mutations (e.g. accept / mark picked up or out for delivery / mark delivered / optional reject) on assigned orders; enforce tenant + **courier owns the assignment** (`courier_user_id` matches current courier) unless product clearly allows claim-from-Available.
- Update **Order** and **OrderItem** status (and any derived “effective” courier status helpers) so list tabs (Mine / Available / Completed) and kitchen views stay coherent after each action.
- Courier UI: action buttons/controls on detail (and list if useful) with clear disabled states; i18n all new strings in every `front/public/i18n/*.json` locale.
- Tests: API coverage for happy path + unauthorized/wrong-courier; minimal courier portal smoke (login → Mine → action → status visible); Angular build clean in `pos-front` logs.
- Document the allowed transitions in `docs/0053-satisfecho-delivery-order-channel.md` (or a short linked note).

## Implementation notes (2026-07-21)

- New order status `out_for_delivery` (migration `20260721220000_order_status_out_for_delivery.sql`).
- `POST /courier/orders/{id}/actions` with `{ "action": "accept"|"reject"|"picked_up"|"delivered" }`.
- Detail/list include `allowed_actions` for UI enablement.
- Courier detail sticky action buttons; i18n in all locales; staff open-order filters include `out_for_delivery`.

## Testing instructions

1. **API unit tests:**  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest tests/test_courier_orders.py -q`  
   Expect **11 passed** (list/detail + accept/reject/pickup/deliver + wrong-courier/non-courier).

2. **Migration:**  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python -m app.migrate`  
   Expect schema includes `out_for_delivery` on `orderstatus`.

3. **Courier portal smoke:** With stack on HAProxy (`BASE_URL=http://127.0.0.1:4202`), ensure at least one **ready** Satisfecho Delivery order assigned to `courier-test-phase1@amvara.de` (or Available to accept), then:  
   `BASE_URL=http://127.0.0.1:4202 npm run test:courier-actions --prefix front`  
   Expect PASS: login → Mine → Mark picked up → status **Out for delivery**.

4. **Manual (optional):** `/courier/login` as courier → open Mine order → Accept (if Available) / Mark picked up / Mark delivered / Reject before pickup; Completed tab shows delivered orders.

5. **Front build:** `docker logs --since 10m pos-front` — Application bundle generation complete, no TS/NG errors for courier components.

## Test report

1. **Date/time (UTC):** 2026-07-21 20:15:02–20:16:30 UTC. Log window: `docker logs --since 15m` on `pos-back` / `pos-front`.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` (synced via `./scripts/git-sync-development.sh`). Courier: `courier-test-phase1@amvara.de` / `secret` (id 1859). Prepared order **#900** as assigned Satisfecho Delivery with order + item status `ready` (effective courier status derives from items).
3. **What was tested:** API courier action suite; migration `out_for_delivery`; Puppeteer courier portal smoke (login → Mine → Mark picked up → Out for delivery); front build health for courier chunks.
4. **Results:**
   - API unit tests (`tests/test_courier_orders.py`) — **PASS** — `11 passed in 5.63s`
   - Migration `20260721220000_order_status_out_for_delivery.sql` — **PASS** — schema version `20260721220000`; enum labels include `out_for_delivery`
   - Courier portal smoke (`npm run test:courier-actions`) — **PASS** — order #900 Ready → clicked **Mark picked up** → UI **Out for delivery**; API `status=out_for_delivery`, `allowed_actions=['delivered']`
   - Front build — **PASS** — `Application bundle generation complete`; `courier-home-component` / `courier-order-detail-component` rebuilt; no TS/NG errors (only unrelated NG8107 warnings in `menu.component.html`)
5. **Overall:** **PASS**
6. **Product owner feedback:** Couriers can progress assigned Satisfecho Delivery orders from Ready to Out for delivery (and Delivered) via sticky detail actions; API and portal stay aligned. Ready state for the smoke needed both order and line-item status `ready` because list/detail use item-derived effective status—worth remembering when seeding demo data.
7. **URLs tested:**
   1. http://127.0.0.1:4202/courier/login
   2. http://127.0.0.1:4202/courier
   3. http://127.0.0.1:4202/courier/orders/900
8. **Relevant log excerpts:**
   ```
   pos-back: POST /courier/orders/900/actions HTTP/1.1" 200 OK
   pos-back: GET /courier/orders/900 HTTP/1.1" 200 OK
   pos-front: Application bundle generation complete. [0.329 seconds] - 2026-07-21T20:13:32.626Z
   pos-front: chunk-G3N7VAAA.js | courier-home-component | 29.63 kB
   migrate: Database schema version: 20260721220000 (out_for_delivery applied)
   pytest: 11 passed in 5.63s
   smoke: PASS: courier action smoke ok (Mark picked up → Out for delivery)
   ```
