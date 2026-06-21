# Multiple HTTP 500 errors on production courier token login

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/273
- **273**

## Problem / goal

Production is returning **500 Internal Server Error** on repeated `POST /token?scope=courier` requests (reported roughly every 30 minutes). Courier driver login at `/courier/login` cannot authenticate on **satisfecho.de**.

**Root cause (already confirmed on amvara9 during #272 deploy testing):** the live `user.role` column uses PostgreSQL enum **`userrole`**, which does **not** include `courier`. Migration **`20260619120000_add_courier_role.sql`** added `courier` only to enum **`user_role`**, so any courier-scoped token query raises `invalid input value for enum userrole: "courier"`.

Related context: **`agents2/tasks/WIP-272-20260621-1752-deploy-to-production.md`** (deploy blocked on this fix). See also closed **#270** (courier role / portal) and **`back/tests/test_user_role_pg_enum.py`**.

## High-level instructions for coder

- Reproduce on production: `POST https://www.satisfecho.de/api/token?scope=courier` → expect **500** today; confirm amvara9 `pos-back` log shows `invalid input value for enum userrole: "courier"`.
- Inspect production DB enum types for `"user".role` vs migration **`20260619120000`**; align so **`courier`** exists on the enum actually bound to the column (likely add value to **`userrole`**, or migrate column to **`user_role`** consistently — match local dev behaviour verified by **`test_user_role_pg_enum.py`**).
- Add or repair migration idempotently; run **`python -m app.migrate`** locally and verify courier token path returns **401/200** (not **500**) with a test courier user.
- Coordinate with **#272** deploy task: after fix lands on **`development`**, production promotion + amvara9 deploy should be re-run; do not leave **`master`** / satisfecho.de broken.
- Append **Testing instructions** when ready; smoke courier login (`/courier/login` → `/courier`) on production after deploy.

## Coder notes (implementation)

- **`back/migrations/20260621120000_align_user_role_column_enum.sql`:** When `user.role` still uses legacy enum **`userrole`**, converts the column to **`user_role`** via `role::text::user_role` (idempotent no-op on dev DBs already on **`user_role`**). Drops orphaned **`userrole`** type when no column references it.
- **`back/tests/test_user_role_pg_enum.py`:** Added **`test_role_column_uses_user_role_enum_type`** — asserts `information_schema.columns.udt_name = 'user_role'` for `user.role`.

---

## Testing instructions

### What to verify

- Migration **`20260621120000`** applies idempotently; `user.role` column uses PostgreSQL enum **`user_role`** (not **`userrole`**).
- Inserts and queries with **`courier`** role succeed (no `invalid input value for enum userrole: "courier"`).
- **`POST /api/token?scope=courier`** returns **401** (bad credentials) or **200** (valid courier user), never **500**.
- After deploy to amvara9: courier portal login at **`/courier/login`** works; coordinate with **#272** deploy re-run.

### How to test

From repo root, with stack up (`docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d`):

```bash
# Apply migration
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python -m app.migrate

# Enum regression tests
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back \
  python3 -m pytest /app/tests/test_user_role_pg_enum.py -q --tb=short

# Courier token must not 500 (401 for unknown user is OK)
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST "http://127.0.0.1:4202/api/token?scope=courier" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=nonexistent@amvara.de&password=wrong"
```

**Production (after deploy):**

```bash
# Expect 401 (not 500) before courier test user exists
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST "https://www.satisfecho.de/api/token?scope=courier" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=nonexistent@amvara.de&password=wrong"

# Verify column type on amvara9 (optional)
ssh amvara9 'cd /development/pos && docker compose --env-file config.env \
  -f docker-compose.yml -f docker-compose.prod.yml exec -T db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "SELECT udt_name FROM information_schema.columns WHERE table_name = '\''user'\'' AND column_name = '\''role'\'';"'
```

### Pass/fail criteria

- **Pass:** `test_user_role_pg_enum` → exit code **0**; local courier token curl → **401** (or **200** with valid courier); production after deploy → **401**/ **200**, not **500**; `udt_name` = **`user_role`** on production.
- **Fail:** Any **500** on courier token; `invalid input value for enum userrole`; pytest failures; column still bound to **`userrole`** after migration on production.

## Test report

1. **Date/time (UTC):** 2026-06-21 20:58 – 20:59 UTC. Log window: local `pos-back` `--since 5m`; amvara9 `pos-back` `--since 10m`.

2. **Environment:** Local `docker-compose.yml` + `docker-compose.dev.yml`, `BASE_URL=http://127.0.0.1:4202`, branch `development` (working tree). Production `https://www.satisfecho.de`. Latest **Deploy to amvara9** run: https://github.com/satisfecho/pos/actions/runs/27912680055 (**success**, commit `7405465c`, 2026-06-21 — predates fix **20260621120000**).

3. **What was tested:** Migration **20260621120000** idempotency; `user.role` column enum type; `test_user_role_pg_enum.py`; local and production `POST /api/token?scope=courier`; production `udt_name` via amvara9 psql.

4. **Results:**
   - **Migration 20260621120000 idempotent (local):** **PASS** — `python -m app.migrate` twice → schema version **20260621120000**, no errors.
   - **Local `user.role` udt_name = `user_role`:** **PASS** — `SELECT udt_name …` → `user_role`.
   - **`test_user_role_pg_enum.py`:** **PASS** — 2 passed in 2.48s (`test_role_column_uses_user_role_enum_type`, `test_insert_each_role_value`).
   - **Local courier token (no 500):** **PASS** — `POST http://127.0.0.1:4202/api/token?scope=courier` → **401**; `pos-back` log: `401 Unauthorized` (no enum error).
   - **Production courier token:** **FAIL** — `POST https://www.satisfecho.de/api/token?scope=courier` → **500**; amvara9 `pos-back`: `invalid input value for enum userrole: "courier"`.
   - **Production `user.role` udt_name = `user_role`:** **FAIL** — amvara9 psql → `userrole` (legacy enum still bound).
   - **Fix committed / deployed:** **FAIL (blocker)** — `back/migrations/20260621120000_align_user_role_column_enum.sql` and `test_user_role_pg_enum.py` changes are **uncommitted** in working tree; no post-fix deploy run exists.

5. **Overall:** **FAIL** — failed criteria: production courier token **500**; production column still **`userrole`**; fix not merged/deployed.

6. **Product owner feedback:** The local migration and enum regression tests confirm the coder’s approach works on dev: courier-scoped auth returns **401** instead of **500**, and the column uses **`user_role`**. Production remains broken because the align migration is only in the local working tree — it must be committed, promoted to **`master`**, and redeployed via **Deploy to amvara9** before courier login can work on satisfecho.de. Re-run **#272** deploy verification after ship.

7. **URLs tested:**
   1. `http://127.0.0.1:4202/api/token?scope=courier` (local)
   2. `https://www.satisfecho.de/api/token?scope=courier` (production)

8. **Relevant log excerpts:**

**Local `pos-back`:**
```
INFO:     172.30.0.5:44584 - "POST /token?scope=courier HTTP/1.1" 401 Unauthorized
```

**amvara9 `pos-back`:**
```
psycopg.errors.InvalidTextRepresentation: invalid input value for enum userrole: "courier"
INFO:     172.18.0.7:34318 - "POST /token?scope=courier HTTP/1.1" 500 Internal Server Error
```

**amvara9 DB:**
```
 udt_name
----------
 userrole
```
