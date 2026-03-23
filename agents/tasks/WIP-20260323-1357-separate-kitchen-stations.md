# Separate kitchen stations (tickets, views, product mapping)

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/66

## Problem / goal

Support **separate ticket printing and KDS-style views** by **kitchen section** (e.g. kitchen, bar, other), with finer splits inside the kitchen (grill, cold, desserts). Owner should be able to **define stations** and **map products** to stations so each station sees only its work.

Stretch behaviors from the issue: SLA-style signals (ticket red when over expected time), alerts, waiter **priority** action—treat as follow-ups once station split exists unless already easy to bundle.

## High-level instructions for coder

- Review existing **kitchen display**, **order lines**, and **printing** flows; align with any docs under `docs/` for orders/kitchen.
- Design minimal data model: stations per tenant, product→station (or category→station), defaults for unmapped items.
- Backend: APIs to CRUD stations and assign products; order/ticket payloads filtered or tagged by station for views and print routes.
- Frontend: station-specific kitchen views (and/or filters), owner settings UI for stations and product mapping.
- Printing: separate tickets per station where the product mix requires it; document behavior for split orders.
- Prefer incremental delivery (stations + mapping + one view) before advanced SLA/priority if scope is large.
