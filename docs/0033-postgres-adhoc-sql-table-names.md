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
| Restaurant **order** (header: table, status, payment, …) | **`"order"`** | `order` is a **reserved word** — use **double quotes** in SQL. |
| Order **line items** | **`orderitem`** | Lowercase, unquoted is fine. |
| Physical **tables** (seats, floor plan) | **`"table"`** | `table` is reserved — **double quotes** in SQL. |

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

## Related

- **Connection user:** The database superuser is **`POSTGRES_USER`** (default **`pos`**), not **`postgres`**. If logs show `FATAL: role "postgres" does not exist`, fix the client DSN — see **PostgreSQL: connecting from your machine** in the root [README.md](../README.md).

- **Schema source of truth:** SQLModel models in `back/app/models.py` and versioned SQL under `back/migrations/`.
