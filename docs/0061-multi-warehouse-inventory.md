# Multi-warehouse inventory (almacenes)

**Status:** MVP shipped (#320).  
**Related:** umbrella [#52](https://github.com/satisfecho/pos/issues/52), `docs/0050-github-issue-52-split-plan.md` Issue 1, `docs/0032-github-issues-roadmap.md`.

## What it does

Tenants can define **multiple stock locations** (warehouses), e.g. Main kitchen, cold room, bar.

- Each tenant gets an implicit default warehouse named **Main** (created on first list or by migration).
- **Receive goods** (purchase order) and **stock adjust** attribute quantity to a chosen warehouse.
- **Stock dashboard** can filter levels by warehouse.
- Per-location quantities live in `warehouse_stock`; `inventory_item.current_quantity` remains the tenant-wide total for COGS / sales deductions.

## API

| Method | Path | Notes |
|--------|------|--------|
| GET/POST | `/inventory/warehouses` | List (ensures default) / create |
| PUT/DELETE | `/inventory/warehouses/{id}` | Update; soft-delete non-default with zero stock |
| POST | `/inventory/items/{id}/adjust` | Optional `warehouse_id` |
| POST | `/inventory/purchase-orders/{id}/receive` | Optional `warehouse_id` |
| GET | `/inventory/stock-levels?warehouse_id=` | Filter by location |

## Non-goals (MVP)

- Inter-warehouse transfer UI / transfer transactions as a first-class flow
- Full WMS picking / barcode multi-bin
- Sale COGS deducting from a non-default warehouse (sales still update global item qty / FIFO batches)
- Cross-tenant / multi-branch logistics - that is **hub fulfillment** on restaurant groups ([0069](0069-branch-hub-fulfillment.md)), not warehouses

## UI

Inventory nav → **Warehouses**. Adjust and receive dialogs include a warehouse selector. Stock dashboard has an “All warehouses” filter.
