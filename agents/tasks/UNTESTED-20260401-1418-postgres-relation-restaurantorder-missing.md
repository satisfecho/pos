# Postgres: relation "restaurantorder" does not exist

## Source

- **Service:** `pos-postgres` (`docker logs pos-postgres`)
- **UTC window:** ~**2026-04-01T14:04:28Z**–**14:16:58Z** (preflight digest window); representative hit **2026-04-01T14:06:14.819Z**.
- **Representative lines:**
  ```
  2026-04-01 14:06:12.000 UTC [44304] FATAL:  role "postgres" does not exist
  2026-04-01 14:06:14.819 UTC [44318] ERROR:  relation "restaurantorder" does not exist at character 32
  2026-04-01 14:06:14.819 UTC [44318] STATEMENT:  SELECT table_id, COUNT(*) FROM restaurantorder GROUP BY table_id HAVING COUNT(*)>=1 LIMIT 10;
  ```

**Context:** The **`FATAL: role "postgres" does not exist`** pattern is already documented and closed (**`agents/tasks/done/2026/03/26/CLOSED-20260326-1121-postgres-fatal-role-postgres-does-not-exist.md`** — stack uses **`POSTGRES_USER`** **`pos`**, not role **`postgres`**). The **`restaurantorder`** **`ERROR`** is a **separate** symptom: raw SQL against a relation name that does **not** match this codebase’s ORM/table naming (no **`restaurantorder`** identifier found under **`back/`** in a quick search). Likely ad-hoc client, wrong database, or an external script using an assumed schema.

## High-level instructions for coder

- Confirm the **actual** order-related table name(s) in **`models.py`** / migrations (e.g. quoted vs unquoted identifiers, `RestaurantOrder` vs snake_case).
- Search the repo (scripts, seeds, docs, third-party SQL) for **`restaurantorder`** or similar; if nothing, treat as **external mis-query** and optionally add a short **README** / **`docs/`** note on correct table names for operators who run SQL manually.
- If anything **in-repo** issues this **`STATEMENT`**, fix the query or align the migration/schema so the name exists — or document the correct replacement query.
- Correlate **timestamps** with host tools / IDE DB plugins if still reproducing locally (same window as **`postgres`** role **`FATAL`** suggests a misconfigured client session).

## Implementation (coder, 2026-04-01)

- **In-repo search:** No `restaurantorder` table or SQL identifier in **`back/`**; frontend only has audio helper names (`playRestaurantOrderChange`). Confirmed schema: orders are PostgreSQL **`"order"`** (quoted reserved word); line items **`orderitem`**; physical tables **`"table"`** — see **`back/migrations/*.sql`** and **`Order`** / **`OrderItem`** in **`back/app/models.py`**.
- **Docs:** Added **`docs/0033-postgres-adhoc-sql-table-names.md`** (symptom, cause, table map, corrected example query, pointer to README / `postgres` role). Indexed in **`docs/README.md`** (Reference & notes).
- **README:** One paragraph under **PostgreSQL: connecting from your machine** linking to that doc.
- **CHANGELOG:** `[Unreleased]` entry under Added.

No migration or application code change — the error is from **external** SQL using a non-existent relation name.

---

## Testing instructions

### What to verify

- Documentation correctly states real table names and quoting for **`"order"`** / **`orderitem`** / **`"table"`**.
- README link resolves; **`docs/README.md`** lists **`0033-postgres-adhoc-sql-table-names.md`**.

### How to test

- Read **`docs/0033-postgres-adhoc-sql-table-names.md`** and **`README.md`** (PostgreSQL subsection).
- **Optional (stack up):** From repo root, connect as **`POSTGRES_USER`** from **`config.env`** and list relations, e.g.  
  `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec db psql -U pos -d pos -c '\dt'`  
  (adjust **`-U`** / **`-d`** to match **`config.env`**). Expect **`order`** and **`orderitem`** in the list (may show quoted identifiers depending on client).

### Pass/fail criteria

- **PASS:** Doc and README are accurate; changelog entry present; no in-repo code still references `restaurantorder` as a DB table.
- **FAIL:** Wrong table names, broken links, or contradictory guidance vs **`back/migrations/`**.
