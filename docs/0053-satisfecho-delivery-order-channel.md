# Satisfecho Delivery order channel (first-party)

Staff can mark orders as **Satisfecho Delivery** (own channel, not Glovo/Uber). Staff UI on `/staff/orders` can create these orders, filter the **Delivery** tab, and update address/courier. No public customer delivery app.

## Order fields

| Field | Meaning |
|-------|---------|
| `order_channel` | `table` (default), `satisfecho_delivery`, or `marketplace` |
| `delivery_address` | Drop-off address (nullable; required for Satisfecho create) |
| `customer_phone` | E.164 phone (nullable) |
| `courier_user_id` | Optional FK to a `courier` user on the same tenant |
| `notes` | Reused as delivery notes (courier `delivery_notes`) |

Marketplace orders still use `delivery_integration_id` / `external_order_ref`; create path sets `order_channel=marketplace`. Satisfecho Delivery does **not** set `delivery_integration_id`; `table_id` is null.

## API

- `POST /orders/satisfecho-delivery` — staff (`order:update_status`): create with items + address (+ optional phone/name/notes/courier).
- `PUT /orders/{id}/delivery` — update delivery metadata on Satisfecho Delivery orders only.
- `GET /orders` — includes `order_channel`, `delivery_address`, `customer_phone`, `courier_user_id`; `table_name` is `"Satisfecho Delivery"` for that channel.
- `GET /users/couriers` — staff (`order:read`): list courier-role users for assign UI.
- `GET /courier/orders` / `GET /courier/orders/{id}` — lists marketplace **and** Satisfecho Delivery; list rows include `courier_user_id`, `delivery_address`, `customer_phone`, and `total_cents` so the courier **Mine** tab can show staff-assigned deliveries; detail returns the same address/phone fields plus `allowed_actions`.
- `POST /courier/orders/{id}/actions` — courier fulfillment mutations (`accept` | `reject` | `picked_up` | `delivered`). See **Courier status actions** below.

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

## Migration

`back/migrations/20260720220000_order_satisfecho_delivery.sql` — columns + backfill marketplace channel from existing `delivery_integration_id`.

`back/migrations/20260721220000_order_status_out_for_delivery.sql` — adds `out_for_delivery` to the `orderstatus` enum.
