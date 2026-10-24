# Central kitchen → branches (hub fulfillment)

**Status:** Phase 0 ADR + MVP slice (#323)  
**Related:** umbrella [#52](https://github.com/satisfecho/pos/issues/52) Issue 9 in [0050](0050-github-issue-52-split-plan.md); restaurant groups [0054](0054-restaurant-groups.md); multi-warehouse [0061](0061-multi-warehouse-inventory.md) (#320)

## Phase 0 - ADR: same-tenant multi-location vs linked-tenant

| Option | Pros | Cons |
|--------|------|------|
| **A - Same tenant, many “sites”** | One auth domain; simpler stock rollup | Collides with today’s tenant = location model; floors/staff/orders already tenant-scoped |
| **B - Linked tenants (restaurant group) + hub flag** | Reuses shipped groups (#283); each branch keeps own orders/staff; aligns with multi-location operators | Cross-tenant reads need explicit sibling rules |

**Decision: B - linked tenants via restaurant groups.** Designate one **member** as the **hub kitchen** (`restaurant_group.hub_tenant_id`). Branch orders stay on the branch tenant; the hub records fulfillment progress against that order without merging order ledgers.

### Vocabulary (shared with #320)

| Term | Meaning |
|------|---------|
| **Warehouse** | Stock location **inside one tenant** (Main, cold room, bar) - [0061](0061-multi-warehouse-inventory.md). |
| **Branch / location** | A **tenant** that is a restaurant-group member ([0054](0054-restaurant-groups.md)). |
| **Hub kitchen** | The group member designated to produce for siblings (`hub_tenant_id`). |
| **Hub fulfillment** | Transfer-style record linking a **branch order** to the hub with a prep status. |

Do **not** invent a second stock hierarchy for branches. Inter-site inventory moves can later debit/credit warehouses on hub vs branch tenants; MVP does not move stock qty.

## MVP slice

Smallest end-to-end path: **generate a fulfillment (transfer) record** and drive it to **`prepared_at_hq`** so the branch order surface can show that state.

### Statuses

`requested` → `preparing` → `prepared_at_hq` (or `cancelled`)

### API

| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| PUT | `/restaurant-group/hub` | Owner/admin | Set or clear `hub_tenant_id` (must be a group member) |
| POST | `/orders/{order_id}/hub-fulfillment` | Branch staff (`order:update_status`) | Create fulfillment for own order |
| GET | `/hub-fulfillments` | Group member | Branch: own records; hub: all for this hub |
| PATCH | `/hub-fulfillments/{id}` | Hub (status) / branch (`cancelled`) | Advance or cancel |
| GET | `/orders` | Branch | Includes optional `hub_fulfillment` object on each order |

### Deferred

- Internal billing / chargeback between sites
- Automatic stock transfers between warehouses across tenants
- Hub kitchen display merging sibling live tickets (beyond fulfillment inbox in Settings)

## Acceptance (this ship)

- [x] Written ADR choosing linked-tenant + hub (this doc).
- [x] Fulfillment record with `prepared_at_hq`; branch order payload exposes it.
- [x] Pytest for tenant isolation and happy path.
