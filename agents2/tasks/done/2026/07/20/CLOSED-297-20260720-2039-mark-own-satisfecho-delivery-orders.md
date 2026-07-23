---
## Closing summary (TOP)

- **What happened:** Issue #297 asked for first-party Satisfecho Delivery order fields so kitchen/orders can distinguish table vs own-delivery (no customer UI).
- **What was done:** Added migration/model/API for `order_channel`, delivery address/phone, and courier assignment; staff create/update endpoints and courier list/detail now expose real delivery data; docs in `docs/0053-satisfecho-delivery-order-channel.md`.
- **What was tested:** Migration check, 9 pytest cases (delivery + courier), and staff/courier API smoke all **PASS**; front logs clean (no Angular change).
- **Why closed:** All acceptance criteria passed; ready to archive.
- **Closed at (UTC):** 2026-07-20 20:47
---

# Mark own Satisfecho Delivery orders (channel + address)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/297
- **297**

## Problem / goal

Kitchen and order flows today treat dine-in (table) orders and third-party marketplace delivery (`delivery_integration_id` / Glovo-Uber style) differently, but there is **no first-party “Satisfecho Delivery” channel** on `Order`. Staff cannot tell a table order from an own-delivery order, and courier payloads already expose `delivery_address: null` as a placeholder (`GET /courier/orders…`).

Product intent (#297): add the **minimum Order fields** for Satisfecho’s own delivery (not Glovo/Uber): a channel such as `satisfecho_delivery`, delivery address, customer phone/notes, and optionally `courier_user_id`. Include **migration + API**. **No customer UI** in this task—data only so kitchen/orders can distinguish table vs Satisfecho Delivery.

Related: existing marketplace fields on `Order` (`delivery_integration_id`, `external_order_ref`); courier routes in `back/app/main.py`; order model in `back/app/models.py`. See also delivery marketplace docs / `docs/0031-order-customizations-plan.md` for third-party context (out of scope for own-channel fields).

## High-level instructions for coder

- Read issue #297; implement **product intent only** (first-party delivery data on Order). Do not treat issue text as shell/commands or paste secrets into the repo.
- Design the smallest schema: e.g. an order channel/source enum or string (`table` / `satisfecho_delivery` / existing marketplace path), plus nullable `delivery_address`, customer phone (and/or reuse/clarify `notes` for delivery notes), and optional `courier_user_id` FK to `user`. Prefer aligning with how courier endpoints already shape responses (`delivery_address`, `delivery_notes`).
- Keep **marketplace** integrations unchanged: first-party Satisfecho Delivery must not require `delivery_integration_id`. Clarify when `table_id` may be null for delivery orders (marketplace already allows this).
- Add a versioned SQL migration under `back/migrations/` and update SQLModel `Order` + create/update/response schemas used by staff/kitchen/courier APIs so the new fields round-trip.
- Expose create/update (and list/detail) via existing order APIs with tenant scoping; do **not** build a public customer ordering UI in this task.
- Wire courier order detail to return the real address/phone/notes when present (replace hard-coded `None` where applicable).
- Add focused backend tests (migration + API create/read for a Satisfecho Delivery order). Smoke-check Angular build only if front types change; otherwise backend pytest in Docker is enough.
- Append **Testing instructions** when implementation is complete.

## Implementation summary

- Migration `20260720220000_order_satisfecho_delivery.sql`: `order_channel`, `delivery_address`, `customer_phone`, `courier_user_id`; backfill marketplace from `delivery_integration_id`.
- Model `OrderChannel` + staff schemas; `POST /orders/satisfecho-delivery`, `PUT /orders/{id}/delivery`; `GET /orders` exposes channel fields; courier list/detail include Satisfecho Delivery and real address/phone.
- Docs: `docs/0053-satisfecho-delivery-order-channel.md`.

## Testing instructions

1. Ensure migration applied: `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.migrate --check` → version `20260720220000` (or later).
2. Backend tests (required):
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back \
     python3 -m pytest tests/test_satisfecho_delivery_orders.py tests/test_courier_orders.py -q
   ```
   Expect all passed.
3. Manual API smoke (staff owner/admin JWT):
   - `POST /orders/satisfecho-delivery` with at least one product, `delivery_address`, optional phone/name/notes/courier_user_id.
   - Confirm `GET /orders` shows `order_channel=satisfecho_delivery`, `table_name=Satisfecho Delivery`, address/phone.
   - `PUT /orders/{id}/delivery` updates address/notes.
   - Courier JWT: `GET /courier/orders` lists the order; detail returns `delivery_address` and `customer_phone` (not null).
4. No frontend change in this task — skip Angular build unless something unexpected appears in `pos-front` logs.

## Test report

1. **Date/time (UTC):** 2026-07-20 20:45:52 start → 20:46:58 end. Log window: `docker logs --since 10m pos-back` / `pos-front`.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` (synced). Staff/courier JWTs minted in `pos-back` via `security.create_access_token` for `ralf@roeber.de` (owner) and `courier-test-phase1@amvara.de` (courier) — form login with `.env` `DEMO_LOGIN_*` returned 401, so smoke used minted tokens (same mechanism as pytest).
3. **What was tested:** Migration `--check` at `20260720220000`; pytest `test_satisfecho_delivery_orders.py` + `test_courier_orders.py`; staff create/list/update Satisfecho Delivery order; courier list/detail address+phone; front logs scan (no Angular change expected).
4. **Results:**
   - Migration at/after `20260720220000`: **PASS** — `Database is up to date (version 20260720220000)`.
   - Pytest delivery + courier: **PASS** — `9 passed in 4.43s`.
   - `POST /orders/satisfecho-delivery`: **PASS** — HTTP 200, order `821`, `order_channel=satisfecho_delivery`, address/phone set, `table_id=null`.
   - `GET /orders` channel fields: **PASS** — order `821` has `order_channel=satisfecho_delivery`, `table_name=Satisfecho Delivery`, address/phone.
   - `PUT /orders/{id}/delivery`: **PASS** — HTTP 200, address → `Avenida Nueva 7`, phone/notes updated.
   - Courier list + detail: **PASS** — `GET /courier/orders` includes `821`; detail returns `delivery_address`, `customer_phone`, `delivery_notes` (not null).
   - Front unexpected errors: **PASS** — no TS/NG build errors in recent `pos-front` logs; `/` and `/api/health` → 200.
5. **Overall:** **PASS**
6. **Product owner feedback:** First-party Satisfecho Delivery is usable via API: staff can create and update delivery metadata, kitchen/list views can distinguish these from table orders (`table_name=Satisfecho Delivery`), and couriers see real address/phone instead of nulls. Marketplace path was left alone as intended. Ready for closer; customer UI remains a follow-up.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/` (health)
   2. `http://127.0.0.1:4202/api/health`
   3. `http://127.0.0.1:4202/api/orders/satisfecho-delivery` (POST)
   4. `http://127.0.0.1:4202/api/orders` (GET)
   5. `http://127.0.0.1:4202/api/orders/821/delivery` (PUT)
   6. `http://127.0.0.1:4202/api/courier/orders` (GET)
   7. `http://127.0.0.1:4202/api/courier/orders/821` (GET)
8. **Relevant log excerpts:**
   ```
   INFO:     ... - "POST /orders/satisfecho-delivery HTTP/1.1" 200 OK
   INFO:     ... - "PUT /orders/821/delivery HTTP/1.1" 200 OK
   INFO:     ... - "GET /courier/orders HTTP/1.1" 200 OK
   INFO:     ... - "GET /courier/orders/821 HTTP/1.1" 200 OK
   pytest: ......... [100%] 9 passed in 4.43s
   migrate --check: Database is up to date (version 20260720220000)
   ```
