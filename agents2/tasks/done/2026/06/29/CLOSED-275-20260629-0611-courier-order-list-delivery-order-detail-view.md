---
## Closing summary (TOP)

- **What happened:** Issue #275 requested Phase 2 of the courier app — a mobile-friendly delivery order list and detail view on top of Phase 1 auth, without pickup/delivery step workflow yet.
- **What was done:** Added `GET /courier/orders` and `GET /courier/orders/{id}` with tenant-scoped delivery-order filtering; replaced courier home placeholder with Available/Mine/Completed tabs and `/courier/orders/:id` detail; `COURIER_ORDERS.*` i18n in all locales; pytest in `back/tests/test_courier_orders.py`.
- **What was tested:** All eleven testing instructions **PASS** — 5 pytest cases, list/detail API, tenant isolation (404), non-courier 403, browser login → list → detail → back, clean Angular build, HTTP smoke.
- **Why closed:** Test report overall **PASS**; Phase 2 MVP complete and ready for Phase 3 assignment/workflow work.
- **Closed at (UTC):** 2026-06-29 06:22
---

# Phase 2 — Courier order list and delivery order detail view

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/275
- **275**

## Problem / goal

Phase 1 (#270) delivered courier login, role, guards, `GET /courier/me`, and a placeholder home at `/courier`. Phase 2 adds a **mobile-friendly list of delivery-relevant orders** for the logged-in courier and a **detail view** for a single order. No full pickup/delivery step workflow yet (Phase 3).

Couriers should see tenant-scoped delivery orders after login, tap one for summary (items, status, customer name, pickup context, delivery address/notes where available), with loading/error states. Logout behaviour stays unchanged.

## High-level instructions for coder

- **Reuse Phase 1 foundation** — do not reinvent auth: `get_current_courier_user`, `POST /token?scope=courier`, `courierGuard`, `/courier` routes, `ApiService`, tenant scoping, i18n in all `front/public/i18n/*.json`.
- **Reuse order model** — delivery orders already exist (`delivery_integration_id` set, no `table_id`, shown as Delivery in staff UI). Inspect `Order` / `OrderItem` and existing staff order APIs for field reuse before adding columns.
- **Backend — new courier-scoped endpoints:**
  - Add e.g. `GET /courier/orders` and `GET /courier/orders/{id}` behind existing API prefix.
  - Return only orders the courier role may see for **their tenant**; **403** for non-courier; **no cross-tenant reads**.
  - **MVP visibility rule:** Prefer minimal change — either all open delivery orders for the tenant, or only orders assigned to the courier. If `courier_user_id` on `Order` is omitted for v1, list all open tenant delivery orders and document the filter in testing notes.
  - Payload should include: order id, status, customer name (if any), created time, item summary, pickup context (restaurant/tenant name + address), and delivery address/notes available today.
- **Data model (minimal):** Add only what Phase 2 needs if delivery address/notes are missing on `Order` (e.g. optional `delivery_notes` / address fields). Avoid large schema changes; document v1 limitations if pickup + customer name only.
- **Frontend — replace placeholder on courier home (or add `/courier/orders`):**
  - **List:** Small MVP — tabs or sections such as Available / Mine / Completed (keep scope tight).
  - **Detail:** Tap order → summary, items, addresses/notes, status badge.
  - Mobile-first layout; reuse existing design tokens; loading and error states.
- **i18n:** Add `COURIER_ORDERS.*` (and related keys) in **all** locale files per project rules.
- **Tests:** Add pytest coverage for new courier order routes (auth, tenant isolation, 403 for non-courier). Append **Testing instructions** to this task when implementation is complete.
- **Docs:** Skim `docs/0031-order-customizations-plan.md` and `docs/0032-github-issues-roadmap.md` for delivery roadmap context. Closed Phase 1 task: `agents2/tasks/done/2026/06/19/CLOSED-270-20260619-2011-courier-driver-auth-role.md`.
- **Out of scope:** Full step-by-step pickup/delivery workflow, maps, push notifications — defer to Phase 3.
- **Verification:** `docker logs --since 10m pos-front` — no Angular compile errors; smoke courier login → list → detail flow when containers are up.

## Implementation summary

- **Backend:** `GET /courier/orders` and `GET /courier/orders/{id}` in `back/app/main.py` behind `get_current_courier_user`. Lists all non-deleted tenant delivery orders (`delivery_integration_id` set). Pickup context from tenant name/address; `delivery_notes` from `Order.notes`; `delivery_address` is `null` in v1 (no schema change).
- **Frontend:** Replaced courier home placeholder with mobile order list (tabs: Available / Mine / Completed). **Available** shows open statuses; **Mine** empty until order assignment (Phase 3); **Completed** shows paid/completed/cancelled. Detail at `/courier/orders/:id`.
- **i18n:** `COURIER_ORDERS.*` in all nine locale files.
- **Tests:** `back/tests/test_courier_orders.py` — list, detail, tenant isolation, 403 for non-courier, unauthenticated.

## Testing instructions

1. **Backend pytest:**  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest tests/test_courier_orders.py -q`  
   → expect **5 passed**.

2. **Courier login:** Use existing courier user (e.g. `courier-test-phase1@amvara.de` / `secret` from Phase 1) or create one via **Users** → role **Courier**.

3. **List API:** After `POST /api/token?scope=courier`, call `GET /api/courier/orders` → JSON array of delivery orders for the courier's tenant only (orders with `delivery_integration_id`).

4. **Detail API:** `GET /api/courier/orders/{id}` → full payload with items, pickup context, `delivery_notes`, `delivery_address: null`.

5. **Tenant isolation:** Courier JWT for tenant A must get **404** for tenant B's order id.

6. **Non-courier:** Staff JWT on `/api/courier/orders` → **403** `Courier account required`.

7. **Frontend list:** Open `http://127.0.0.1:4202/courier/login` → sign in → `/courier` shows tabs and delivery order cards (if tenant has marketplace delivery orders). **Mine** tab shows empty-state message.

8. **Frontend detail:** Tap an order → `/courier/orders/{id}` shows status, customer, pickup, notes, items, total. Back link returns to list.

9. **v1 filter note:** No `courier_user_id` on `Order` yet — **Available** lists all open tenant delivery orders; **Mine** is intentionally empty pending assignment in a later phase.

10. **Build:** `docker logs --since 10m pos-front | grep -iE 'error|failed'` → no TS/NG errors; expect `Application bundle generation complete`.

11. **Smoke:** `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4202/courier/login` → **200**.

---

## Test report

**Date/time (UTC):** 2026-06-29 06:18–06:22 UTC (log window: ~06:17–06:22 UTC)

**Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `b4597481`.

**What was tested:** Phase 2 courier delivery order list/detail — pytest, cookie-session API, tenant isolation, non-courier 403, Angular build, browser login → list → detail → back.

### Results

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | Backend pytest (5 passed) | **PASS** | `pytest tests/test_courier_orders.py -q` → `5 passed in 3.10s` |
| 2 | Courier login | **PASS** | `POST /api/token?scope=courier` (cookie) + `GET /api/courier/me` → courier id 1859, tenant Cobalto |
| 3 | List API | **PASS** | `GET /api/courier/orders` → 200, 1 delivery order (#708) with `pickup_name`, `item_summary` |
| 4 | Detail API | **PASS** | `GET /api/courier/orders/708` → items, `delivery_notes`, `delivery_address: null`, `total_cents: 18000` |
| 5 | Tenant isolation | **PASS** | Courier tenant 1 → `GET /api/courier/orders/709` (tenant 1081) → **404** `Order not found` |
| 6 | Non-courier 403 | **PASS** | Waiter bearer JWT (`ralf.roeber@amvara.de`) → **403** `Courier account required` |
| 7 | Frontend list | **PASS** | Login → `/courier`: tabs Available/Mine/Completed; order card #708; Mine shows assignment empty-state |
| 8 | Frontend detail | **PASS** | Tap #708 → status, customer Demo, pickup Cobalto, notes, items, total 180.00; Back → list |
| 9 | v1 filter (Mine empty) | **PASS** | Mine tab: “No orders assigned to you yet…” |
| 10 | Angular build | **PASS** | No TS/NG errors in `pos-front` logs; `Application bundle generation complete` |
| 11 | Smoke HTTP 200 | **PASS** | `/courier/login` → 200 after HAProxy restart (initial 503 while backends were warming) |

**Overall:** **PASS**

**Product owner feedback:** Phase 2 delivers a usable courier order list and detail view on top of Phase 1 auth. The Available/Mine/Completed tabs and v1 empty Mine state match the documented MVP. Delivery address correctly shows as unavailable with notes fallback; ready for Phase 3 assignment workflow.

**URLs tested:**
1. http://127.0.0.1:4202/courier/login
2. http://127.0.0.1:4202/courier
3. http://127.0.0.1:4202/courier/orders/708

### Relevant log excerpts

```
pos-front: Application bundle generation complete. [8.222 seconds] - 2026-06-29T06:19:00.380Z
pos-front: (no TS/NG error lines in 10m window)

pos-back:
INFO: GET /courier/orders HTTP/1.1" 200 OK
INFO: GET /courier/orders/708 HTTP/1.1" 200 OK
INFO: GET /courier/orders/709 HTTP/1.1" 404 Not Found
INFO: GET /courier/orders HTTP/1.1" 403 Forbidden
```
