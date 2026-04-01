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

---

## Test report

1. **Date/time (UTC) and log window:** **2026-04-01T14:20:35Z** (verification run). No PostgreSQL error log review required for this doc-only scope; optional DB checks used `pos-postgres` while healthy.

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; DB **`pos-postgres`** (`psql -U pos -d pos`). Git branch **`development`**, commit **`58aa7ec`**.

3. **What was tested:** Doc accuracy for `"order"` / `orderitem` / `"table"`; README link to `docs/0033-postgres-adhoc-sql-table-names.md`; `docs/README.md` index row; `CHANGELOG.md` `[Unreleased]` entry; `grep` for `restaurantorder` under `back/`; alignment with `back/migrations/*.sql` and `Order` / `OrderItem` in `back/app/models.py`; optional `\dt` against live DB.

4. **Results:**
   - **0033 doc vs schema:** **PASS** — Table map matches migrations (`"order"`, `orderitem`, `"table"`); example corrected query uses `tenant_id` / `deleted_at` consistent with models.
   - **README link:** **PASS** — `README.md` § PostgreSQL links to `docs/0033-postgres-adhoc-sql-table-names.md` (relative path valid).
   - **docs/README.md index:** **PASS** — Row lists `0033-postgres-adhoc-sql-table-names.md` with accurate one-line summary.
   - **CHANGELOG:** **PASS** — `[Unreleased]` documents 0033 and README link.
   - **No `restaurantorder` in app SQL:** **PASS** — `grep` under `back/` returned no matches; only docs/tasks use the string as symptom/examples.
   - **Optional DB:** **PASS** — `\dt "order"`, `\dt orderitem`, `\dt "table"` all list expected tables.

5. **Overall:** **PASS**

6. **Product owner feedback:** Operators who see `relation "restaurantorder" does not exist` now have a single doc that explains the mistake and gives a working example query. The README PostgreSQL section points there without duplicating long detail. No application change was required; the log line reflects external or guessed SQL, not this product’s schema.

7. **URLs tested:** **N/A — no browser** (documentation and `psql` only).

8. **Relevant log excerpts (last section):** `psql` evidence (UTC run ~14:20Z):

   ```text
   Schema | Name  | Type  | Owner 
   --------+-------+-------+-------
   public | order | table | pos

   Schema |   Name    | Type  | Owner 
   --------+-----------+-------+-------
   public | orderitem | table | pos

   Schema | Name  | Type  | Owner 
   --------+-------+-------+-------
   public | table | table | pos
   ```

**GitHub:** No issue number on this task file — labels/comments not updated.
