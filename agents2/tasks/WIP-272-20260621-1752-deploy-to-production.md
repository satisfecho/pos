# Deploy to production

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/272
- **272**

## Problem / goal

Promote tested work from **`development`** to **`master`** and deploy to **amvara9** (production / **satisfecho.de**). The issue author requests shipping the latest changes to production.

Follow **`.cursor/rules/git-development-branch-workflow.mdc`** — this is an explicit production-promotion request (issue opened 2026-06-21).

**Context (2026-06-21):** After sync, **`origin/development`** is ahead of **`origin/master`** (last **`master`** tip **`632de10d`**, 2026-06-17). Notable product commits on **`development`** not yet on **`master`** include **#271** (schedule write authorization for non-owner staff), **#270** (courier role / delivery driver portal), and **#269** (pricing helper garnish costs). Local dev stack responds **200** on port 4202; no Angular compile errors in **`pos-front`** logs in the last 7 days.

## High-level instructions for coder

- Confirm **`development`** is green locally: `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/` → 200; run relevant Puppeteer smoke tests for recently merged features (#269 pricing helper, #270 courier portal, #271 schedule auth) if credentials are available.
- Review **`CHANGELOG.md`** / version in **`front/package.json`** — bump and release notes if user-visible changes warrant it (see **`.cursor/rules/commit-changelog-version.mdc`**).
- Merge **`development` → `master`** (merge commit or team-preferred fast-forward), push **`origin/master`**.
- Watch **Deploy to amvara9** GitHub Actions for the pushed **`master`** commit; document run URL and conclusion in the task file.
- Verify production: `curl -sf https://www.satisfecho.de/api/health`; optional `LANDING_VERSION_ONLY=1 BASE_URL=https://www.satisfecho.de npm run test:landing-version` from `front/`.
- If deploy fails, check Actions logs and **`docs/0001-ci-cd-amvara9.md`** (migrations, dirty tree, marketing artifacts) before retrying.
- Append **Testing instructions** when ready for tester; follow **wip → untested** flow per **`TASKS-README.md`**.

## Coder notes (2026-06-21)

- **Pre-deploy local:** `curl` → **200** on `http://127.0.0.1:4202/`. Landing Puppeteer with `.env` credentials failed login (401) — local DB credentials may differ; version footer showed **2.1.5** before deploy.
- **Changelog:** Cut **`## [2.1.5] - 2026-06-21`** with #269, #270, #271 and release note (#272).
- **Merge:** Fast-forward **`development` → `master`** at **`7405465c`**; pushed **`origin/master`** and **`origin/development`**.
- **Deploy:** **Deploy to amvara9** run **success** — https://github.com/satisfecho/pos/actions/runs/27912680055 (3m21s, push on `master`).
- **Production verify:** `curl -sf https://www.satisfecho.de/api/health` → `{"status":"ok"}`. Landing test `LANDING_VERSION_ONLY=1 BASE_URL=https://www.satisfecho.de` → **2.1.5 7405465c**.

## Handoff log

- **2026-06-21 (012 handoff):** **Remain WIP** — do not rename to **UNTESTED**. Initial deploy (#272 merge + amvara9 run 27912680055) is done, but **Test report** below is **FAIL**: production courier auth returns **500** (`invalid input value for enum userrole: "courier"` — live `user.role` uses legacy enum **`userrole`** without `courier`; migration **20260619120000** altered **`user_role`** only). Coder must fix enum/migration, redeploy, then hand off again. Verified prod health OK; `POST /api/token?scope=courier` still **500**.
- **2026-06-22 (012 handoff):** **Remain WIP** — do not rename to **UNTESTED**. **#273** enum fix is on **`development`** @ **`f990b865`** but not on **`master`** / amvara9 (**`7405465c`**, 19 commits behind). Coder must re-merge **`development` → `master`**, push, and confirm green **Deploy to amvara9** before handoff.
- **2026-06-22 (012 handoff, pass 2):** **Remain WIP** — do not rename to **UNTESTED**. **`development`** @ **`184704a7`** (24 commits ahead of **`master`** **`7405465c`**); latest **Deploy to amvara9** still run **27912680055** on pre-fix **`7405465c`**; production `POST /api/token?scope=courier` → **500**. Coder must re-promote and redeploy before handoff.
- **2026-06-22 (012 handoff, pass 3):** **Remain WIP** — do not rename to **UNTESTED**. **`development`** @ **`89bdeda1`** (25 commits ahead of **`master`** **`7405465c`**); **Deploy to amvara9** still run **27912680055** on pre-fix **`7405465c`**; production courier token → **500**. Coder must merge **`development` → `master`**, push, and confirm green deploy before handoff.
- **2026-06-22 (012 handoff, pass 4):** **Remain WIP** — do not rename to **UNTESTED**. **`development`** @ **`4d71a470`** (28 commits ahead of **`master`** **`7405465c`**); **Deploy to amvara9** unchanged (run **27912680055** on **`7405465c`**); production `POST /api/token?scope=courier` → **500**. Coder must re-promote and redeploy before handoff.

## Testing instructions

1. **Production health:** `curl -sf https://www.satisfecho.de/api/health` → `{"status":"ok"}`.
2. **Landing version:** From `front/`, `LANDING_VERSION_ONLY=1 BASE_URL=https://www.satisfecho.de npm run test:landing-version` → footer shows **2.1.5** and commit **`7405465c`**.
3. **Pricing helper (#269):** Log in as owner/admin → **Products → Pricing helper** → confirm **Garnishes** section with ice/lemon/other costs; verify pour-cost math includes garnish amounts.
4. **Courier portal (#270):** In **Users**, assign **Courier** role to a test user → sign in at **`/courier/login`** → lands on **`/courier`** placeholder; staff routes blocked for courier; courier routes blocked for staff.
5. **Schedule auth (#271):** Log in as staff with `schedule:write` (not owner/admin) → **Working plan** → can edit own shifts only; API returns 403 for other users' shifts; edit/delete hidden for others' rows in UI.
6. **Regression:** `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/` → **200** on local dev if stack is up.

## Test report

1. **Date/time (UTC):** 2026-06-21 17:52:00 – 18:00:00 UTC. Log window: amvara9 `pos-back` logs during courier API probes; local `pos-front` `--since 15m`.

2. **Environment:** Production `BASE_URL=https://www.satisfecho.de`; local `http://127.0.0.1:4202`; branch `development` @ `7405465c` (matches deployed `master`); compose `docker-compose.yml` + `docker-compose.dev.yml` for local pytest.

3. **What was tested:** Production deploy verification per **Testing instructions** (#272): health, landing version/hash, pricing helper (#269), courier portal (#270), schedule auth (#271), local regression; supplementary local pytest for schedule/pricing/courier enum.

4. **Results:**
   - **Production health (`/api/health`):** **PASS** — `{"status":"ok"}`.
   - **Landing version:** **PASS** — Puppeteer `LANDING_VERSION_ONLY=1` → footer **2.1.5 7405465c**; deploy signal: GitHub Actions https://github.com/satisfecho/pos/actions/runs/27912680055 **success** on `7405465c`.
   - **Pricing helper (#269) UI on production:** **FAIL (blocked)** — `ralf@roeber.de` (`.env` `DEMO_LOGIN_*`) → 401 on `POST /api/token?tenant_id=1`; no owner/admin prod credentials available. Partial deploy evidence: production `en.json` includes `PRICING.SECTION_GARNISHES` and garnish keys. Local `test_pricing_service.py` → **11 passed**.
   - **Courier portal (#270) on production:** **FAIL** — `/courier/login` → **200** (UI loads). `POST /api/token?scope=courier` → **500** Internal Server Error (any username). amvara9 `pos-back` log: `invalid input value for enum userrole: "courier"`. Production DB: `user.role` column uses enum **`userrole`** (values: owner, admin, kitchen, bartender, waiter, receptionist, provider — **no courier**); separate enum **`user_role`** includes courier. Migration **20260619120000** marked applied in `schema_version` but altered wrong enum. Zero courier users in prod `user` table. Local `test_user_role_pg_enum.py` → **passed** (local DB uses `user_role` on column).
   - **Schedule auth (#271) on production:** **FAIL (blocked)** — same 401 for prod staff login; cannot verify Working plan UI or cross-user 403 on satisfecho.de. Local `test_schedule_auth.py` + bulk/copy-week → **13 passed**.
   - **Local regression curl:** **PASS** — `http://127.0.0.1:4202/` → **200**.

5. **Overall:** **FAIL** — failed criteria: **#270 courier** (production 500 / enum mismatch); **#269** and **#271** production browser/API checks blocked by missing prod credentials (not verified on satisfecho.de).

6. **Product owner feedback:** The deploy pipeline and version footer confirm **2.1.5** / **7405465c** is live, but courier login is broken on production: the courier migration updated `user_role` while the live `user.role` column still uses legacy enum `userrole` without `courier`, causing 500 on any courier-scoped auth query. Fix requires a migration that adds `courier` to `userrole` (or aligns column type), redeploy, then create a courier test user and re-run portal checks. Provide or document production smoke credentials for owner and schedule:write waiter so post-deploy verification is not blocked.

7. **URLs tested:**
   1. https://www.satisfecho.de/api/health
   2. https://www.satisfecho.de/
   3. https://www.satisfecho.de/courier/login
   4. https://www.satisfecho.de/i18n/en.json (pricing garnish keys)
   5. http://127.0.0.1:4202/

8. **Relevant log excerpts:**

**amvara9 `pos-back` (courier token 500):**
```
sqlalchemy.exc.DataError: (psycopg.errors.InvalidTextRepresentation) invalid input value for enum userrole: "courier"
[SQL: SELECT ... FROM "user" WHERE "user".email = %(email_1)s::VARCHAR AND "user".role = %(role_1)s ...]
[parameters: {'email_1': 'nonexistent@amvara.de', 'role_1': 'courier'}]
```

**Production DB enum check (`userrole` — column type for `user.role`):**
```
owner, admin, kitchen, bartender, waiter, receptionist, provider
(courier missing)
```

**Local pytest (same commit, dev DB):**
```
test_schedule_auth + bulk + copy_week: 13 passed in 8.37s
test_pricing_service + test_user_role_pg_enum: 11 passed in 2.51s
```
