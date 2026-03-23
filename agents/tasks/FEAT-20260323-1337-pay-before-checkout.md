# Pay before checkout

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/23

## Problem / goal
Some customers want to pay before food is fully prepared. Orders must support **taking payment at any appropriate point** in the flow, not only at a single “checkout” moment.

## High-level instructions for coder
- Map the current order lifecycle (states, kitchen, payment, mark-paid/finish) in backend and staff UI; read payment-related docs if present.
- Define allowed transitions: e.g. pay while order is still open/in progress, and how that affects kitchen and customer-facing views.
- Implement API and UI changes so staff can record payment early without breaking existing flows; keep invariants for totals, tips, and invoices.
- Add tests covering pay-early vs pay-at-end scenarios and regression for normal checkout.
