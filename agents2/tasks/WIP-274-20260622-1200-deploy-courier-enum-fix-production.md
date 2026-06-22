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
| **`origin/development`** | **`5092c8c3`** |
| **`origin/master`** | **`7405465c`** |
| Commits **`master..development`** | **47** |
| Latest **Deploy to amvara9** | run **27912680055** — **success** @ **`7405465c`** (2026-06-21, predates fix) |
| Production courier token | **500** (`invalid input value for enum userrole: "courier"`) |
| Fix commit on **`development`** | **`0f6ba00b`** (migration **20260621120000**) |
| GitHub **#274** | **CLOSED** (stateReason: COMPLETED, 2026-06-22T08:38Z) — deploy not done |

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

## Testing instructions

*(Pending — coder appends when promotion/deploy is complete.)*
