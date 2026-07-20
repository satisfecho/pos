# Satisfecho Delivery order channel (first-party)

Staff can mark orders as **Satisfecho Delivery** (own channel, not Glovo/Uber). No customer UI yet—API + schema only so kitchen/orders and couriers can tell table orders from own delivery.

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
- `GET /courier/orders` / `GET /courier/orders/{id}` — lists marketplace **and** Satisfecho Delivery; detail returns real `delivery_address` / `customer_phone`.

## Migration

`back/migrations/20260720220000_order_satisfecho_delivery.sql` — columns + backfill marketplace channel from existing `delivery_integration_id`.
