---
## Closing summary (TOP)

- **What happened:** Production `POST /api/token?scope=courier` returned **500** because amvara9 still used legacy PostgreSQL enum **`userrole`** (no **`courier`** value), as documented in **#273**.
- **What was done:** **`development`** was promoted to **`master`** at **`1bfafe84`**; **Deploy to amvara9** run **27948191494** applied migration **`20260621120000_align_user_role_column_enum.sql`** (fix **`0f6ba00b`**).
- **What was tested:** Production courier token → **401** (not **500**); DB **`user.role`** `udt_name` = **`user_role`**; deploy run green; local **`test_user_role_pg_enum.py`** passed (2/2).
- **Why closed:** All pass–fail criteria in the test report **PASS**; production hotfix verified live on satisfecho.de.
- **Closed at (UTC):** 2026-06-22 11:10
---

# Deploy courier enum fix to production (amvara9)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/274
- **274**
- **Supersedes:** https://github.com/satisfecho/pos/issues/272 (closed; archived **`CLOSED-272-20260622-1200-deploy-to-production.md`**) and https://github.com/satisfecho/pos/issues/273 (closed; archived **`CLOSED-273-20260622-1200-multiple-500-errors-courier-token.md`**)

## Problem / goal

Production (**satisfecho.de**) returns **500** on `POST /api/token?scope=courier`. Root cause documented in **#273**: PostgreSQL column `user.role` on amvara9 still uses legacy enum **`userrole`**, which has no value **`courier`**.

The code fix is **already merged on `development`** (commit **`0f6ba00b`**, migration **`20260621120000_align_user_role_column_enum.sql`**, plus **#270** courier role). **Do not re-implement** courier auth or duplicate migrations.

**Goal:** Deploy the fix to amvara9 and confirm courier login returns **401** (bad creds) or **200** (valid courier user), never **500**.

## Current state (2026-06-22)

| Check | Value |
|-------|-------|
| **`origin/development`** | **`1bfafe84`** |
| **`origin/master`** | **`1bfafe84`** |
| Commits **`master..development`** | **0** |
| Latest **Deploy to amvara9** | run **27948191494** — **success** @ **`1bfafe84`** (2026-06-22) |
| Production courier token | **401** (invalid creds — no longer **500**) |
| Fix commit on **`master`** | **`0f6ba00b`** (migration **20260621120000**) |
| GitHub **#274** | **CLOSED** (stateReason: COMPLETED, 2026-06-22T08:38Z) |

## High-level instructions for coder

- Sync repo: **`./scripts/git-sync-development.sh`**; ensure **`development`** includes **`0f6ba00b`** and migration **20260621120000**.
- Merge/promote to **`master`** per team rules (**#273** / **#274** are production-impacting / hotfix).
- Push **`origin/master`**; watch **Deploy to amvara9** GitHub Actions for green conclusion; document run URL in this file.
- On amvara9: migrations run via deploy (`python -m app.migrate` and `--sync-idempotent` per **`scripts/deploy-amvara9.sh`**).
- Verify on production:
  - `POST https://www.satisfecho.de/api/token?scope=courier` with invalid creds → **401**, not **500**.
  - DB: `user.role` column `udt_name` = **`user_role`** (not **`userrole`**).
  - Optional: courier test user + **`/courier/login`** smoke.
- Append **Testing instructions** when ready for tester; follow **wip → untested** flow per **`TASKS-README.md`**.
- **Out of scope:** Phase 2/3 courier features (order list, step-by-step delivery); re-opening **#270** feature work.

## Handoff log

- **2026-06-22 (012 handoff):** Created from archived **WIP-272** / **WIP-273** after GitHub **#272** and **#273** **CLOSED**; **#274** **OPEN** (same deploy scope). Code fix already on **`development`**; blocker is **`development` → `master`** promotion + green **Deploy to amvara9**.
- **2026-06-22 (012 handoff, pass 2):** **No WIP → UNTESTED** — deploy-blocker per **`012-feature-coder-handoff.md`**: **`master`** still **`7405465c`** (47 commits behind **`development`** @ **`5092c8c3`**); no post-fix **Deploy to amvara9** run; production `POST /api/token?scope=courier` still **500**. **Testing instructions** still pending. GitHub **#274** now **CLOSED** (no open successor) — feature coder must still promote + deploy before handoff can proceed.
- **2026-06-22 (012 handoff, pass 3):** **No WIP → UNTESTED** — deploy-blocker unchanged: **`master`** still **`7405465c`** (55 commits behind **`development`** @ **`e21b33b7`**); latest **Deploy to amvara9** still @ **`7405465c`**; production courier token still **500**; **Testing instructions** still pending. **`agent:untested`** not applied.
- **2026-06-22 (012 handoff, pass 4):** **WIP → UNTESTED** — **`master`** promoted to **`1bfafe84`** (aligned with **`development`**); **Deploy to amvara9** run **27948191494** **success** @ **`1bfafe84`**; production `POST /api/token?scope=courier` → **401** (not **500**). **Testing instructions** appended. **`gh issue edit 274 --add-label "agent:untested"`**.

## Testing instructions

### What to verify

1. **Production courier token:** `POST /api/token?scope=courier` returns **401** (bad credentials) or **200** (valid courier user), never **500**.
2. **Production DB enum:** `user.role` column `udt_name` is **`user_role`** (not legacy **`userrole`**).
3. **Deploy signal:** Latest **Deploy to amvara9** run **27948191494** **success** on commit **`1bfafe84`** (includes migration **`20260621120000`** / fix **`0f6ba00b`**).
4. **Optional — courier portal:** If a courier test user exists on production, sign in at **`/courier/login`** → lands on **`/courier`**; staff routes blocked for courier.

### How to test

**Production (primary):**

```bash
# Expect 401 (not 500) for invalid credentials
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST "https://www.satisfecho.de/api/token?scope=courier" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=nonexistent@amvara.de&password=wrong"

# Health check (regression)
curl -sf https://www.satisfecho.de/api/health
```

**Production DB (amvara9 SSH):**

```bash
ssh amvara9 'cd /development/pos && docker compose --env-file config.env -f docker-compose.yml -f docker-compose.prod.yml exec -T db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "SELECT column_name, udt_name FROM information_schema.columns WHERE table_name = '\''user'\'' AND column_name = '\''role'\'';"'
```

Expect `udt_name` = **`user_role`**.

**Local regression (optional):**

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back \
  python3 -m pytest /app/tests/test_user_role_pg_enum.py -q --tb=short
```

### Pass–fail criteria

- **PASS:** Production courier token → **401** or **200** (never **500**); DB column uses **`user_role`**; deploy run **27948191494** green.
- **FAIL:** Any **500** on courier token endpoint; DB still shows **`userrole`**; deploy not green on post-fix commit.

## Test report

**Start (UTC):** 2026-06-22T11:08Z · **End (UTC):** 2026-06-22T11:10Z · **Log window:** 2026-06-22T11:05Z–11:10Z

### Environment

- **Branch:** `development` (synced; `origin/development` @ `1bfafe84`)
- **Production target:** `https://www.satisfecho.de`
- **Local compose:** `docker-compose.yml` + `docker-compose.dev.yml`
- **Deploy evidence:** GitHub Actions run [27948191494](https://github.com/satisfecho/pos/actions/runs/27948191494) — **success**, headSha **`1bfafe84`**

### What was tested

Per **Testing instructions**: production courier token endpoint, production DB enum alignment, deploy run confirmation, optional local pytest, optional courier portal.

### Results

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | Production `POST /api/token?scope=courier` (invalid creds) → **401**, not **500** | **PASS** | `curl` → HTTP **401**; body `incorrect_username_or_password` |
| 2 | Production DB `user.role` `udt_name` = **`user_role`** | **PASS** | amvara9 psql: `role \| user_role` |
| 3 | Deploy run **27948191494** green on **`1bfafe84`** | **PASS** | `gh run view 27948191494` → `conclusion: success` |
| 4 | Optional local pytest `test_user_role_pg_enum.py` | **PASS** | `2 passed in 2.47s` |
| 5 | Optional courier portal (`/courier/login`) | **N/A** | No courier test user on production (`courier-test-phase1@amvara.de` → **401**); invalid-cred path already confirms no **500** |

### Overall

**PASS** — Production courier token no longer returns **500**; DB enum migrated to **`user_role`**; deploy run green on post-fix commit.

### Product owner feedback

The production hotfix is verified: courier authentication fails gracefully with **401** instead of crashing with **500**, and the database schema matches the application enum. Deploy **27948191494** is live on amvara9; no further deploy action required for this issue.

### URLs tested

1. `https://www.satisfecho.de/api/token?scope=courier` (POST, invalid credentials)
2. `https://www.satisfecho.de/api/token?scope=courier` (POST, optional known test user — not present on prod)
3. `https://www.satisfecho.de/api/health` (GET)

### Relevant log excerpts

**Production API (curl):**

```
courier_token_http_code=401  (invalid creds)
valid_courier_http=401       (courier-test-phase1@amvara.de — user not on prod)
health_http_code=200
```

**Production DB (amvara9):**

```
 column_name | udt_name
-------------+-----------
 role        | user_role
```

**Local pytest:**

```
2 passed in 2.47s
```
