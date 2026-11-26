# Price display mode (#455)

## Goal

Keep guest-facing menu labels and staff order totals aligned with **server-authoritative payable billing**. Stored unit prices and charged amounts stay **tax-inclusive**.

## Setting

| Field | Values | Default |
|-------|--------|---------|
| `tenant.price_display_mode` | `inclusive` \| `exclusive` | `inclusive` |

- **inclusive:** show the billed unit price (`price_cents`).
- **exclusive:** show net unit price for labels (`display_price_cents`); cart, checkout, receipts, and payments still use inclusive `price_cents` / `order_due_cents`.

Configure under **Settings → Taxes**. Exposed on `GET/PUT /tenant/settings`, QR `GET /menu/{token}`, public menu, and Satisfecho Delivery config.

## Payable totals

`order_payment_service.order_due_cents` is the single payable path (lines − loyalty + tip + delivery fee when channel is Satisfecho Delivery). Staff order list `total_cents`, receipts, and courier summaries use that path so they match `amount_due_cents`.

## Tests

`back/tests/test_price_display_mode.py`
