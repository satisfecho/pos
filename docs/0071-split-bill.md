# Split bill / partial payments (#318)

## Decision: split **by amount** and **by line**

Staff records one or more **payment legs** against a single `Order`. Each leg has an amount (cents), a payment method, and an optional payer label. The order stays unpaid until the sum of non-voided legs covers the order due (line items - order-level discounts + tip when tip is applied on settlement).

| Option | Status | Notes |
|--------|--------|--------|
| **By amount** | Shipped (#318) | Fast path for “two cards / cash + card”; clear audit rows. |
| **By line** | Shipped (#331) | `POST /orders/{id}/payments` with `order_item_ids`; amount derived from those lines; `order_payment_item` allocations. |
| **By guest session** | Shipped (#443) | `POST /orders/{id}/payments` with `guest_session_id` (or `__none__` for unassigned lines). Reconciliation includes `guest_sessions[]`. Staff pay modal and guest **Pay my items** use this. |

## Data model

- **`order_payment`** (tenant-scoped): `order_id`, `amount_cents`, `payment_method`, optional `payer_label`, `paid_by_user_id`, `paid_at`, optional `tip_amount_cents` (usually on the settling leg), optional `stripe_payment_intent_id` (reserved), `voided_at` (soft cancel).
- **`order_payment_item`**: links a payment leg to whole order lines (`order_item_id`, `amount_cents`). An order item may appear on at most one active allocation; voiding a leg deletes its allocations so lines can be re-paid.
- **`Order.paid_at` / `payment_method` / `status=paid`**: set only when the order is **fully settled**. If multiple methods were used, `payment_method` is stored as `split`.
- Reconciliation (API): `amount_due_cents`, `amount_paid_cents`, `amount_remaining_cents`, `payments[]` (each may include `order_item_ids`), `unallocated_order_item_ids`, `guest_sessions[]`.
- **`fiscal_invoice.order_payment_id`**: optional FK for per-payer altas (#443 F); null keeps classic one-alta-per-order.

## Staff API

| Method | Path | Behaviour |
|--------|------|-----------|
| **GET** | `/orders/{id}/payments` | List non-voided (and optionally voided) legs + totals. |
| **POST** | `/orders/{id}/payments` | Record a partial or settling payment. Body: `amount_cents`, `order_item_ids` (line split), or `guest_session_id` (session split). Rejects overpay / already-allocated lines. When remaining hits 0 → marks order paid and awards loyalty **once**. |
| **POST** | `/orders/{id}/payments/{payment_id}/fiscal-invoice/issue` | Per-payer Factura prep after order is fully paid (#443 F). |
| **DELETE** | `/orders/{id}/payments/{payment_id}` | Void a leg (only while order is not fiscally locked / not fully paid, or via unmark flow). |
| **PUT** | `/orders/{id}/mark-paid` | Pays **remaining** balance in one leg (creates `order_payment`), then marks paid. Same permission as today. |
| **PUT** | `/orders/{id}/unmark-paid` | Clears paid mark and **voids all** payment legs for that order. |

Permission: existing **`order:mark_paid`**.

## Stripe

- **MVP:** staff-recorded **cash / terminal / other** (and existing single-intent guest Stripe confirm still settles the whole order as one leg).
- **Multi-intent (#443 E):** `POST /orders/{id}/create-payment-intent` accepts an optional JSON body with `amount_cents`, `order_item_ids`, and/or `guest_session_id`. Each succeeded intent is confirmed via `confirm-payment` as its own `order_payment` leg (`stripe_payment_intent_id`); the order marks paid only when remaining hits 0. Guest menu offers **Pay my items** (session-scoped intent) alongside full remaining pay. Prefer multiple intents over partial capture.

## Factura / VeriFactu

- **Default:** **one fiscal alta per order** after the order is fully paid (existing `FiscalInvoice` idempotency on `order_id` where `order_payment_id` is null). Split notation is operational (payment legs).
- **Per-payer (#443 F):** After the order is fully paid, staff can `POST /orders/{id}/payments/{payment_id}/fiscal-invoice/issue` to allocate a sequential alta scoped to that payment (`fiscal_invoice.order_payment_id`). Mutually exclusive with an order-level alta on the same order. Still VeriFactu *preparation* (sandbox/middleware) - not a claim of production AEAT filing; operators should confirm legal fit for their jurisdiction. See `docs/0018-verifactu-fiscal-invoicing.md`.

## Loyalty (#327) and promos (#322)

- Loyalty **earn** runs only when the order becomes fully paid (`award_on_order_paid`), not on each partial leg.
- Order-level discounts (loyalty redeem / promos) reduce **amount due** before payment allocation; they are not re-applied per leg.

## Table groups

Merged parties (join tables) still share one order or the existing group UX; split-by-amount, split-by-line, and split-by-guest-session work on that order without requiring unjoin.

## UI

On **Orders** → Mark as paid / Finish modal: show amount due, payments already recorded, remaining, **guest session** pay buttons, **line checkboxes** (split by line), and **Record partial payment** (amount + method + optional payer label when not using lines). Full **Mark as paid** settles the remainder. When fiscal mode is on and the order is paid, each payment leg can **Issue Factura for payer**.

Marketing: public Features pages `/features/split-bill` and `/features/join-tables` (#443 B).
