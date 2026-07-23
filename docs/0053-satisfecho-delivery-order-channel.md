# Satisfecho Delivery order channel (first-party)

Staff can mark orders as **Satisfecho Delivery** (own channel, not Glovo/Uber). Staff UI on `/staff/orders` can create these orders, filter the **Delivery** tab, and update address/courier. Guests can place delivery orders on the public checkout at `/delivery/{tenantId}` (menu → cart → address → pay).

## Order fields

| Field | Meaning |
|-------|---------|
| `order_channel` | `table` (default), `satisfecho_delivery`, or `marketplace` |
| `delivery_address` | Drop-off address (nullable; required for Satisfecho create) |
| `customer_phone` | E.164 phone (nullable; **required** on public create) |
| `courier_user_id` | Optional FK to a `courier` user on the same tenant |
| `notes` | Reused as delivery notes (courier `delivery_notes`) |

Marketplace orders still use `delivery_integration_id` / `external_order_ref`; create path sets `order_channel=marketplace`. Satisfecho Delivery does **not** set `delivery_integration_id`; `table_id` is null.

## API

- `POST /orders/satisfecho-delivery` — staff (`order:update_status`): create with items + address (+ optional phone/name/notes/courier). Kitchen is notified immediately.
- `POST /public/tenants/{tenant_id}/satisfecho-delivery` — **public** (rate-limited): create with items + **required** address and phone (+ optional name/notes). No courier assign. Returns `public_order_token`, `total_cents`, and payment hints (`stripe_publishable_key`, `revolut_configured`). Kitchen/inventory notify is deferred until payment succeeds. Public creates set `session_id=public_satisfecho_delivery` so ops can TTL-clean abandoned unpaid rows (see below).
- `PUT /orders/{id}/delivery` — update delivery metadata on Satisfecho Delivery orders only.
- `GET /orders` — includes `order_channel`, `delivery_address`, `customer_phone`, `courier_user_id`; `table_name` is `"Satisfecho Delivery"` for that channel.
- `GET /users/couriers` — staff (`order:read`): list courier-role users for assign UI.
- `GET /courier/orders` / `GET /courier/orders/{id}` — lists marketplace **and** Satisfecho Delivery; list rows include `courier_user_id`, `delivery_address`, `customer_phone`, and `total_cents` so the courier **Mine** tab can show staff-assigned deliveries; detail returns the same address/phone fields plus `allowed_actions`.
- `POST /courier/orders/{id}/actions` — courier fulfillment mutations (`accept` | `reject` | `picked_up` | `delivered`). See **Courier status actions** below.

### Guest payment (table or public delivery)

Stripe/Revolut guest endpoints accept **exactly one** of:

- `table_token` — existing table / take-away menu checkout, or
- `public_order_token` — public Satisfecho Delivery checkout (signed, ~1h).

Endpoints: `POST /orders/{id}/create-payment-intent`, `confirm-payment`, `create-revolut-order`, `confirm-revolut-payment`.

Revolut success redirect for delivery: `{PUBLIC_APP_BASE_URL}/delivery/{tenantId}/payment-success?order_id=…&public_order_token=…`.

## Public UI

- `/delivery/:tenantId` — cart + address + Stripe/Revolut pay.
- `/delivery/:tenantId/payment-success` — confirms Revolut after redirect.
- `/public-menu/:tenantId` — read-only menu with a link to delivery checkout.

## Courier status actions

Courier-only; tenant-scoped. Mutations require the order to be a delivery order (marketplace or Satisfecho Delivery). Responses return the updated courier order detail (including `allowed_actions`).

| Action | Who | Preconditions | Effect |
|--------|-----|---------------|--------|
| `accept` | Any courier on the tenant | Open status; `courier_user_id` is null | Sets `courier_user_id` to the current courier (claim from **Available**) |
| `reject` | Assigned courier | Open status, assigned to self, **not** `out_for_delivery` | Clears `courier_user_id` (back to **Available**) |
| `picked_up` | Assigned courier | Effective status is `ready` | Sets order status to `out_for_delivery` (items stay `ready`) |
| `delivered` | Assigned courier | Status is `ready` or `out_for_delivery` | Marks all active items `delivered` (with `delivered_by_user_id`); order becomes `completed` |

Terminal statuses (`paid`, `completed`, `cancelled`) allow no courier actions. Couriers cannot act on orders assigned to another courier.

Kitchen semantics: item-level statuses remain the source of truth for pending → preparing → ready → delivered. `out_for_delivery` is an order-level courier-in-transit marker that does not remap item statuses until `delivered`.

## Staff UI

- `/staff/orders`: **New delivery order**, **Delivery** filter tab (Satisfecho + marketplace, with channel badges), **Edit delivery** for address/phone/name/notes/courier.

## Unpaid public checkout cleanup (TTL)

Guests who abandon checkout leave **pending unpaid** public Satisfecho Delivery orders (kitchen never notified). Cleanup is idempotent and **does not** touch staff-created Satisfecho Delivery orders.

| Rule | Value |
|------|--------|
| Marker | `session_id = public_satisfecho_delivery` (set only when `notify_kitchen=False`) |
| Eligible | channel `satisfecho_delivery`, status `pending`, no `payment_method` / `paid_at`, not soft-deleted, `created_at` older than TTL |
| Default TTL | **2 hours** (past `public_order_token` ~1h lifetime; override with `--ttl-hours`) |
| Effect | Cancel order + items (`cancelled_by=ttl_cleanup`), set `deleted_at` (excluded from Informes). No kitchen WS / inventory (never published). |

```bash
# All tenants
docker compose exec back python -m app.seeds.cleanup_unpaid_public_delivery
docker compose exec back python -m app.seeds.cleanup_unpaid_public_delivery --dry-run
docker compose exec back python -m app.seeds.cleanup_unpaid_public_delivery --ttl-hours 4 --tenant-id 1
```

Optional ops: schedule on amvara9 host cron via `./scripts/cleanup-unpaid-public-delivery-on-server.sh` (hourly UTC). Install steps and copy-paste crontab: **`docs/0001-ci-cd-amvara9.md`** § Unpaid public Satisfecho Delivery cleanup. Separate from tenant-1 demo reset — demo reset already wipes tenant 1 orders, so it does not need this hook.

Tests: `back/tests/test_cleanup_unpaid_public_delivery.py`.

## Migration

`back/migrations/20260720220000_order_satisfecho_delivery.sql` — columns + backfill marketplace channel from existing `delivery_integration_id`.

`back/migrations/20260721220000_order_status_out_for_delivery.sql` — adds `out_for_delivery` to the `orderstatus` enum.
