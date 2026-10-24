# PostgreSQL: ad-hoc SQL and order table names

Operators sometimes run raw SQL against the POS database (GUI clients, `psql`, reports). Logs may show:

```text
ERROR:  relation "restaurantorder" does not exist
STATEMENT:  SELECT table_id, COUNT(*) FROM restaurantorder ...
```

## Cause

This codebase does **not** define a table named `restaurantorder`. That name usually comes from an **external** query, a **different** product’s schema, or a guess at the ORM name (`RestaurantOrder` → not used here).

## Actual table names (this repo)

| Concept | PostgreSQL identifier | Notes |
|--------|------------------------|--------|
| Restaurant **order** (header: table, status, payment, …) | **`"order"`** | `order` is a **reserved word** - use **double quotes** in SQL. Satisfecho Delivery rows live here too (`order_channel`, `delivery_address`, …) - there is **no** separate `deliveryorder` table. |
| Order **line items** | **`orderitem`** | Lowercase, unquoted is fine. |
| Physical **tables** (seats, floor plan) | **`"table"`** | `table` is reserved - **double quotes** in SQL. |
| Walk-in **waiting list** | **`waiting_list_entry`** | Not `waitinglist` / `waitlist`. Filter by **`tenant_id`** and **`status`** (`waiting`, `notified`, `seated`, `cancelled`, `no_show`). |
| Multi-location **restaurant group** | **`restaurant_group`** | Not `restaurantgroup`. Columns: `id`, `name`, `join_code`, `share_products`, `share_customers`, `created_at`. See [0054-restaurant-groups.md](0054-restaurant-groups.md). |
| Group **membership** (tenant ↔ group) | **`restaurant_group_member`** | Not `group_member` / `restaurantgroupmember`. Join via **`group_id`** → `restaurant_group.id`; one row per **`tenant_id`** (`joined_at`). |

Multi-tenant rows include **`tenant_id`** (and often **`deleted_at`** on orders). Filter by tenant when writing ad-hoc queries.

## Example: replace the failing query

Wrong:

```sql
SELECT table_id, COUNT(*) FROM restaurantorder GROUP BY table_id HAVING COUNT(*) >= 1 LIMIT 10;
```

Equivalent against this schema (adjust `tenant_id` as needed):

```sql
SELECT table_id, COUNT(*)
FROM "order"
WHERE tenant_id = 1 AND deleted_at IS NULL
GROUP BY table_id
HAVING COUNT(*) >= 1
LIMIT 10;
```

## Example: active waiting-list queue (tenant 1)

```sql
SELECT id, customer_name, party_size, status, notified_at, created_at
FROM waiting_list_entry
WHERE tenant_id = 1
  AND status IN ('waiting', 'notified')
ORDER BY created_at;
```

## Example: restaurant group members for a tenant

```sql
SELECT g.id AS group_id, g.name, g.join_code, g.share_products, g.share_customers,
       m.tenant_id, m.joined_at
FROM restaurant_group_member m
JOIN restaurant_group g ON g.id = m.group_id
WHERE m.tenant_id = 1;
```

To list every member of a known group, filter on `m.group_id` instead of `m.tenant_id`.

## Related

- **Connection user:** The database superuser is **`POSTGRES_USER`** (default **`pos`**), not **`postgres`**. If logs show `FATAL: role "postgres" does not exist`, fix the client DSN - see **PostgreSQL: connecting from your machine** in the root [README.md](../README.md).

- **Schema source of truth:** SQLModel models in `back/app/models.py` and versioned SQL under `back/migrations/`.
