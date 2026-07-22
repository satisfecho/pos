# Mark 0002 customer features: shipped vs not

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`docs/0002-customer-features-plan.md` still reads as an open end-user plan (customer accounts, email verification, MFA, order history, self-serve invoices). Operators and agents can confuse that with the **staff Billing Customers (Factura)** UI and fiscal invoices, which already ship. README indexes 0002 like live product scope.

## Evidence (008 preflight / review)

- Doc age >90d (deferred after SIGNAL top-14 were queued); not yet covered by an open `NEW-0`/`FEAT-0`
- Code: `BillingCustomer` + `/customers` staff Factura flow; fiscal invoice issue/get on orders — **not** a public `Customer` account model with MFA / email verification from 0002
- `docs/README.md` line for 0002 lists registration, login, MFA, order history, invoices without shipped/remaining split
- Preflight: `SIGNAL docs_stale` family; weekly sweep continuing beyond SIGNAL basenames

## High-level instructions for coder

- Add a short top **Status** banner: **partial** — staff billing customers + fiscal invoices shipped; **not shipped:** end-user customer accounts, email verification, MFA, customer order history / self-serve tax invoices as specified in 0002.
- Soften the README index line so it does not imply the full 0002 plan is next work.
- Do **not** implement new product features or rewrite the whole plan; leave detailed sections as historical design notes unless clearly wrong.
- Pass criteria: first screenful states shipped vs remaining; no bulk rewrite.
