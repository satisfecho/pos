# Restaurant groups (multi-location sharing)

Restaurant groups let **multi-location operators** link several tenants (locations) so they can optionally **share billing customers** and/or **product catalog rows** across sibling locations. Each location keeps its own orders, staff, floors, and settings. Shipped with GitHub **#283**.

This is **not** the same as **table groups** on the floor plan (`docs/0051-table-groups-mvp.md`).

## Who can manage groups

- **Settings → Restaurant group** tab is shown only to **owner** or **admin** of the current tenant (`data-testid="settings-restaurant-group-tab"`).
- API routes under `/restaurant-group` require Settings read/update permissions **and** owner or admin role.

## Concepts

| Term | Meaning |
|------|---------|
| **Group** | Named set of tenants with one **join code** and two flags: `share_products`, `share_customers`. |
| **Member** | A tenant that created or joined the group. A tenant can belong to **at most one** group. |
| **Sibling** | Another member of the same group (not the current tenant). |
| **Shared row** | A billing customer or tenant product owned by a sibling; list APIs mark it with `is_shared: true`. |

## Operator flows (Settings UI)

Open **Settings → Restaurant group** (`settings-restaurant-group-section`).

### Not in a group yet

1. **Create a new group** — enter a name; optionally enable share products / share customers; **Create group**. The UI then shows the generated **join code**.
2. **Join an existing group** — paste another location’s join code; **Join group**.

### Already in a group

- Edit **name** and the two share flags; **Save**.
- Copy / share the read-only **join code** with other location owners.
- See **Member locations** (current location is labelled).
- **Leave group** — removes this tenant from the group. If no members remain, the group row is deleted.

## Sharing semantics

Defaults on create: both share flags are **off** unless checked in the UI.

### `share_customers`

When **on**, list/search of billing customers (`GET /billing-customers`) includes customers owned by sibling tenants. Shared customers are **read-only** for siblings: updates from another location return **404** (ownership stays with the owning tenant). Non-members never see group data.

### `share_products`

When **on**, tenant product lists (`GET /tenant-products` and related catalog paths that use accessible product tenant ids) include products owned by siblings, again flagged `is_shared`. Sibling locations treat those catalog rows as **read-only** (UI copy: “read-only from other locations”). Writes stay on the owning tenant’s products.

### Isolation

- Tenants **outside** the group (and tenants with sharing flags off) see only their own customers/products.
- Orders, reservations, staff users, and other tenant-scoped data are **not** merged by joining a group.

## API (reference)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/restaurant-group` | Current group detail, or `null` |
| `POST` | `/restaurant-group` | Create (`name`, `share_products`, `share_customers`) |
| `PUT` | `/restaurant-group` | Update name / share flags |
| `POST` | `/restaurant-group/join` | Join by `join_code` |
| `POST` | `/restaurant-group/leave` | Leave; deletes empty groups |

Implementation: `back/app/restaurant_groups.py`, routes in `back/app/main.py`, migration `back/migrations/20260712140000_restaurant_group.sql`, Settings UI `front/src/app/settings/restaurant-group-settings.component.ts`. Tests: `back/tests/test_restaurant_groups.py`.
