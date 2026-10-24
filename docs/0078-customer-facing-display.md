# Customer-facing order display (counter / coffee shop)

**Status:** Shipped MVP (#434). Read-only second-screen summary for counter and retail-style sales.

## URL and access

- **URL:** `/display/{table_token}` (public; same unguessable table token as `/menu/{table_token}`).
- **Staff open:** On `/staff/orders`, **Customer display** opens the paired table’s display in a new tab (Take Away / counter tables included).

## What guests see

- Live line items, subtotal, loyalty discount (when applied), tip, and total.
- Payment options (cash, card terminal, online when Stripe/Revolut is configured) - **labels only**; staff still confirms payment on the staff UI.
- Optional **invoice email** field; stored on `order.invoice_email` via `POST /menu/{table_token}/order/invoice-email`.
- Thank-you state when the order is paid (`for_display=true` keeps the paid active order visible).

## Sync

- Polling every ~8s plus WebSocket `/ws/table/{table_token}` (same events as the guest menu).
- Order payload: `GET /menu/{table_token}/order?for_display=true` (discounts, payment options, invoice email).

## Invoice email note

There is **no** automatic PDF invoice email send in this MVP. The email is stored for staff Factura / follow-up. Prefer linking a **BillingCustomer** with email when issuing a fiscal invoice (`docs/0017-billing-customers-factura.md`, `docs/0018-verifactu-fiscal-invoicing.md`).

The public `POST /menu/{table_token}/order/invoice-email` handler is rate-limited (SlowAPI) and must declare `response: Response` so rate-limit headers inject correctly under uvicorn.

## Smoke

```bash
BASE_URL=http://127.0.0.1:4202 npm run test:customer-display --prefix front
```

See `docs/testing.md` (Customer display).
