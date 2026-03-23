# Waiter cannot see table assignment (owner-assigned tables)

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/65

## Problem / goal

When the **owner** assigns tables to staff, the **waiter** (logged in as that role) does **not** see those assignments on the **Tables** view. Owner sees assignments; waiter UI does not reflect them. Screenshots in the issue compare owner vs waiter.

Relevant areas: tables canvas / tables list, permissions and API payloads for assigned staff vs owner, and any filtering that hides assignment for non-owner roles.

## High-level instructions for coder

- Reproduce: owner assigns a table to a waiter; log in as that waiter; open Tables and confirm assignment is missing.
- Trace where table–staff assignment is stored (API + models) and which endpoints the tables UI uses for waiter vs owner.
- Ensure waiter-facing tables UI loads and displays the same assignment data the owner sees (respecting tenant and role rules), or fix API/auth if the data is omitted for waiters.
- Add or extend a smoke test (Puppeteer or manual checklist in PR) if a stable flow exists for staff tables.

## Implementation notes (coder)

- **Root cause:** Waiter assignment UI used `<select>` options from **`getWaiters()`** → **`GET /users`**, which requires **`user:read`**. Waiters do not have that permission, so the list was empty and the select showed no assigned waiter even though **`GET /tables`** already returns **`assigned_waiter_*`** / **`effective_waiter_*`**.
- **Fix:** Users with **`table:write`** (owner/admin) keep the dropdowns; others see read-only labels from table/floor API fields. **`getWaiters()`** runs only when **`table:write`**. Floor default waiter uses read-only **`default_waiter_name`** for non-writers.

---

## Testing instructions

1. **Owner or admin:** Log in → **Tables** (tiles and table view). Confirm per-table and per-floor waiter **dropdowns** still work; assignments save and display as before.
2. **Waiter:** Log in → **Tables**. After owner assigns a table to that waiter (or sets floor default), confirm the **Assigned waiter** column / tile shows the **same name** (read-only text, not an empty dropdown). Unassigned tables show **Unassigned**; floor-only default shows **section default** + name.
3. **Receptionist (optional):** Same as waiter — read-only visibility, no assignment controls.
4. **Regression:** With stack up, `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` passes (includes `/tables` navigation).

---

## Test report

1. **Date/time (UTC):** 2026-03-23 14:55–14:59 (verification window). Log excerpts: `docker compose … logs --since 10m back` aligned to this window.

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **`BASE_URL`** `http://127.0.0.1:4202` (HAProxy); branch **`development`** @ **`2db6dc0`**.

3. **What was tested:** Items 1–4 from **Testing instructions** above (receptionist optional skipped).

4. **Results:**
   - **Owner/admin — table view dropdowns:** **PASS** — After login (`.env` `DEMO_LOGIN_*`), `/tables` → Table view: **13** `<select>` elements under `.tables-data-table` (waiter assignment controls present).
   - **Owner/admin — tiles + canvas/floor defaults:** **PASS (partial)** — `npm run test:tables-page` confirms Table view and navigation; **floor-plan canvas and per-floor default waiter dropdowns** were not re-tested manually in this run (only list/table path exercised for owner).
   - **Waiter — assigned name visible, read-only:** **PASS** — Login as tenant **1** waiter user `ralf.roeber@amvara.de` (password: local dev only, not recorded here), `/tables` → Table view: row text includes **Werni** for assigned tables; **no** empty broken `<select>` in `.tables-data-table`. **API check:** authenticated waiter session → `GET /api/tables/with-status` returns `assigned_waiter_name` / `effective_waiter_name` where applicable (e.g. T07).
   - **Unassigned label:** **PASS** — Sample row **001** showed **Unassigned** in waiter session output.
   - **Receptionist (optional):** **N/A** — not run.
   - **Regression `test:landing-version`:** **PASS** — `BASE_URL=http://127.0.0.1:4202 HEADLESS=1 npm run test:landing-version --prefix front` exit **0** (includes `/tables` nav).
   - **`test:tables-page` (owner demo user):** **PASS** — exit **0**.

5. **Overall:** **PASS** (no failed required criteria).

6. **Product owner feedback:** Waiters now see the same assigned waiter names as the API provides, as plain text in the table list, while owners retain full assignment dropdowns. The previous empty-dropdown confusion for roles without `user:read` is gone in this environment. Consider a dedicated Puppeteer case that logs in as waiter and asserts an assigned name, so regressions are caught in CI.

7. **URLs tested:**
   1. `http://127.0.0.1:4202/login?tenant=1` (owner and waiter)
   2. `http://127.0.0.1:4202/dashboard` (post-login)
   3. `http://127.0.0.1:4202/tables` (owner and waiter)
   4. `http://127.0.0.1:4202/reservations` (owner, via `test:tables-page` only)
   5. `http://127.0.0.1:4202/api/token?tenant_id=1` (POST, cookie auth — waiter API probe)
   6. `http://127.0.0.1:4202/api/tables/with-status` (GET with waiter session cookie)

8. **Relevant log excerpts:**
   - `pos-back`: `POST /token?tenant_id=1` **200**; waiter session then `GET /floors` **200**, `GET /tables` **200**; `GET /tenant/settings` **403** for waiter (expected).
   - `test:landing-version` / `test:tables-page`: completed with **>>> RESULT: … OK / passed** (exit 0).

**GitHub:** Comment on **#65** failed from this environment (`gh`: resource not accessible by token). Labels not updated; closer should comment/label per **`docs/agent-loop.md`**.
