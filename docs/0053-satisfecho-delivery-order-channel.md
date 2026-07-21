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
- `GET /courier/orders` / `GET /courier/orders/{id}` — lists marketplace **and** Satisfecho Delivery; detail returns real `delivery_address` / `customer_phone`.

## Staff UI

- `/staff/orders`: **New delivery order**, **Delivery** filter tab (Satisfecho + marketplace, with channel badges), **Edit delivery** for address/phone/name/notes/courier.

## Migration

`back/migrations/20260720220000_order_satisfecho_delivery.sql` — columns + backfill marketplace channel from existing `delivery_integration_id`.
