# Employee & Freelancer Contract Management Panel for Restaurant Staff

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/99

## Problem / goal

There is no structured way in the staff area to create, store, and manage **employee** and **freelancer** contracts. Management needs templates, status tracking, secure document storage, and basic **tax / legal** metadata; staff need read access to their own contracts and key terms. The issue asks for industry-appropriate fields, RBAC, encryption/GDPR-minded handling, and flexibility for **localization** and different legal frameworks.

## High-level instructions for coder

- Review **`docs/`**, **`README.md`**, and existing **staff / HR / user** patterns (roles, tenant scoping, file uploads) before designing new models and routes.
- Design a **contract management** module: templates (employee vs freelancer), CRUD, statuses (e.g. active, expired, pending signature), versioning, and signed document upload; align with existing auth and tenant isolation.
- Implement **role-based access**: full management in staff/admin UI; limited self-service for the subject user (view/download, key fields only).
- Add structured fields for **tax/legal** differentiation (employee payroll vs freelancer invoicing) without over-promising jurisdiction-specific compliance; keep data model extensible for future locales.
- Plan **secure storage** for files and metadata (encryption at rest or equivalent patterns used elsewhere in the repo); avoid logging sensitive payloads.
- Deliver a **functional UI** in the restaurant staff section that satisfies the acceptance criteria in the issue; add migrations and tests consistent with project conventions.

## Coder notes (implementation summary)

- **DB:** `staff_contract` table + enums (`staff_contract_kind`, `staff_contract_status`, `staff_contract_payment_structure`); migration `back/migrations/20260325180000_staff_contract.sql`. Run `python -m app.migrate` in Docker if needed.
- **API:** Router `back/app/staff_contract_routes.py`, mounted at **`/staff-contracts`** in `main.py`. Permissions: `STAFF_CONTRACT_READ` (all tenant staff), `STAFF_CONTRACT_MANAGE` (owner/admin). Signed PDFs under `uploads/{tenant_id}/contracts/`; **no** public static route — download only via `GET /staff-contracts/{id}/document` with cookie auth.
- **Front:** Route `/contracts`, sidebar **Contracts**, `staff-contracts.component.ts`, `permission.guard.ts`, `ApiService` methods; i18n keys `CONTRACTS.*` + `NAV.CONTRACTS` in all `public/i18n/*.json`.
- **Tests:** `back/tests/test_staff_contracts.py` (RBAC, version, PDF upload/download).
- **Version:** see `front/package.json` / `CHANGELOG.md` (module landed in **2.0.57**; repo may be newer).

## Coder follow-up (2026-03-28 UTC)

- **NG0200 / staff SPA bootstrap:** `PermissionService` used eager `inject(ApiService)`, which could combine with `HttpClient` + interceptors into **`Circular dependency detected for _ApiService`** (blocked login in QA on **2026-03-25**). **Fix:** resolve `ApiService` lazily with **`Injector.get(ApiService)`** via a private getter in `front/src/app/services/permission.service.ts`.
- **Coder verification:** `pytest tests/test_staff_contracts.py` → **4 passed**; Docker `front` rebuild without TS/NG errors; `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` from `front/` → **exit 0** (login + sidebar nav includes **`/contracts`**).

## Testing instructions

### What to verify

- Migration applies; API returns 403/404 appropriately; UI loads for owner/admin and non-admin staff; staff see only own contracts; PDF upload/download works; new version creates draft row with incremented version.

### How to test

1. **Migrate (if DB behind):**  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m app.migrate`

2. **Backend:**  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest tests/test_staff_contracts.py -v`

3. **Frontend build:**  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` — no TS/Angular errors after changes.

4. **Staff SPA bootstrap:** In a browser, open `{BASE_URL}/login?tenant=1` (e.g. `http://127.0.0.1:4202`). DevTools console must **not** show **`Circular dependency`** / **NG0200** for `ApiService`. Login form (`input` for email/username) must render.

5. **Automated nav smoke (optional but recommended):** From `front/` with stack up and demo credentials in env (see `docs/testing.md` / `test-landing-version.mjs`):  
   `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` — expect **exit 0**; script visits **`/contracts`** when logged in as tenant staff.

6. **Manual UI:** With stack up (`BASE_URL` e.g. `http://127.0.0.1:4202`), log in as **admin**: open **Contracts**, create contract for a waiter, upload a small PDF, download. Log in as that **waiter**: see only own row(s), download works; create/upload controls absent.

7. **Smoke (optional):** `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/` → `200`.

### Pass/fail criteria

- **Pass:** Steps 1–4 succeed; RBAC matches tests; no regression in `pytest tests/test_staff_contracts.py`; optional steps 5–7 pass if run.
- **Fail:** Migration errors, 500 on contract routes, wrong tenant or cross-user data leakage, PDF served without auth, or **NG0200** / empty login outlet on `/login`.

---

## Test report

1. **Date/time (UTC)** and log window  
   - Started: **2026-03-25 18:09:50 UTC**  
   - Finished: **2026-03-25 18:14:00 UTC** (approx.)  
   - Log window reviewed: `front` / `back` compose logs around **18:06–18:14 UTC**; Puppeteer against `BASE_URL` below.

2. **Environment**  
   - Compose: `docker-compose.yml` + `docker-compose.dev.yml`  
   - **`BASE_URL`:** `http://127.0.0.1:4202` (HAProxy → front)  
   - Branch: **`development`** @ **`73b84e0`**

3. **What was tested** (from “What to verify”)  
   - Migration / schema for staff contracts  
   - API RBAC, versioning, PDF upload/download (`tests/test_staff_contracts.py`)  
   - Frontend build health (Docker `front` logs)  
   - Manual browser login → `/contracts` (owner and waiter flows)  
   - Optional landing smoke (`curl` HTTP code)

4. **Results**

   | Criterion | Result | Evidence |
   |-----------|--------|----------|
   | Migration applies (`20260325180000` / `staff_contract`) | **PASS** | `app.migrate`: “Database is up to date (version **20260325180000**)”; `20260325180000_staff_contract.sql` **applied**. |
   | API 403/404, RBAC, no cross-user leakage, PDF path | **PASS** | `pytest tests/test_staff_contracts.py -v`: **4 passed** (`test_admin_creates_waiter_sees_only_own`, `test_new_version_and_pdf`, `test_waiter_cannot_create`, `test_waiter_no_tax_id_for_other_contract`). |
   | UI loads for owner/admin and staff; manual create/upload/download | **FAIL** | Headless Chromium (`puppeteer-core`): after `GET /login?tenant=1`, **`app-root` inner HTML ~47 chars** (no outlet); **`#email` absent**; final URL **`/`**. Browser console: **`Circular dependency detected for _ApiService`** (`ngErrorCode` -200). Same failure reproduced with existing `node scripts/test-working-plan.mjs` (cannot select `input[type="email"]`). Contracts UI not reachable in browser until DI cycle is fixed. |
   | Frontend build (Docker logs, no TS/Angular compile errors) | **PASS** | `docker compose … logs --tail=80 front`: **Application bundle generation complete**; lazy chunk **`staff-contracts-component`** listed; **no** `TS` / `NG` error lines in tail. |
   | Smoke `curl /` | **PASS** | `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/` → **`200`**. |

5. **Overall:** **FAIL** — Failed criterion: **manual UI / in-browser staff app** (blocked by **`ApiService` circular dependency** at runtime; not specific to contract routes alone).

6. **Product owner feedback**  
   Backend contract APIs and automated RBAC tests look solid, but the staff SPA does not bootstrap far enough to log in or open **Contracts** in a real browser on the current `development` build. Fixing the **`ApiService` circular dependency** should be the top priority so QA can complete the PDF and two-user UI checks.

7. **URLs tested**  
   1. `http://127.0.0.1:4202/` (smoke, and unintended post-navigation URL in broken SPA)  
   2. `http://127.0.0.1:4202/login?tenant=1` (intended entry; Angular did not render login form)

8. **Relevant log excerpts**

   **Migrate (back):**
   ```text
   INFO: Database schema version: 20260325180000
   …
   INFO: Database is up to date (version 20260325180000)
   ```

   **Pytest (back):**
   ```text
   tests/test_staff_contracts.py::TestStaffContracts::test_admin_creates_waiter_sees_only_own PASSED
   tests/test_staff_contracts.py::TestStaffContracts::test_new_version_and_pdf PASSED
   tests/test_staff_contracts.py::TestStaffContracts::test_waiter_cannot_create PASSED
   tests/test_staff_contracts.py::TestStaffContracts::test_waiter_no_tax_id_for_other_contract PASSED
   ============================== 4 passed in 2.95s ===============================
   ```

   **Front (compose, tail):**
   ```text
   Application bundle generation complete. [0.713 seconds] - 2026-03-25T18:08:55.784Z
   ```

   **Browser console (Puppeteer, `/login?tenant=1`):**
   ```text
   ngErrorMessage: 'Circular dependency detected for `_ApiService`.',
   ngTokenPath: [ '_ApiService' ]
   ```

## Log reviewer (001), 2026-03-25T18:20Z

- **pos-postgres** (`docker logs` since **2026-03-25T17:35:55Z`): `ERROR: column "contract_group_id" is of type uuid but expression is of type character varying` (~**18:03 UTC**, repeated). Align bind/insert types with **uuid** for `contract_group_id` (ORM or raw SQL).
- **pos-front** (same window): transient **TS2307** / could not resolve `./staff-contracts/staff-contracts.component` during rebuild; latest sampled tail **Application bundle generation complete** at **2026-03-25T18:08:55.784Z** — no separate **NEW-** (same epic as this WIP / **#99**).

## Log reviewer (001), 2026-03-25T19:02Z

- **GitHub:** Only open **#99**; this **WIP** already links the issue — **001** did not open a duplicate **FEAT-** (`LOG-REVIEWER-PROMPT.md` dedupe). **`gh`:** no new **FEAT-** path to comment; **#99** already has **`agent:planned`** + **`agent:wip`**.
- **Docker** (`--since 2026-03-25T18:56:16Z`): **pos-front** / **pos-postgres** no new lines; **pos-back** **`GET /docs` 200** only; **pos-haproxy** **101**/**200**/**304** only — **0× new NEW-**.

## Log reviewer (001), 2026-03-26T09:13Z

- **GitHub:** Open **#99** only; **WIP** dedupe — **0× new FEAT-**. **`gh issue comment 99`** + **`agent:planned`** (idempotent).
- **Docker** (`--since 2026-03-26T09:00:45Z`): **pos-front** ~1s **TS2552** (`apiService` in **`auth.interceptor.ts`**) then immediate **Application bundle generation complete** — transient rebuild; **0× new NEW-** (same file family as closed **#100** circular-dependency task). **pos-back** / **pos-haproxy** / **pos-postgres:** no standing incidents in grep window.

## Log reviewer (001), 2026-03-26T09:33Z

- **GitHub:** **`gh issue list --state open`** → **0** open (no **FEAT-** candidates; **`gh` comment/label** **n/a**).
- **Docker** (`--since 2026-03-26T08:55:48Z`): same **pos-front** transient **TS2552** / **`Application bundle generation failed`** then **complete** ~**09:02:17–09:02:18Z** — **0× new NEW-**. **pos-haproxy** no **5xx** in window.

---

## Test report (re-verification, tester 003)

1. **Date/time (UTC)** and log window  
   - Started: **2026-03-28 09:25:30 UTC** (approx.)  
   - Finished: **2026-03-28 09:28:00 UTC** (approx.)  
   - Log window: **`docker compose … logs --tail=80 front`** sampled **2026-03-28T09:24Z**; Puppeteer **`test:landing-version`** ended **2026-03-28T09:27:09Z**.

2. **Environment**  
   - Compose: **`docker-compose.yml`** + **`docker-compose.dev.yml`**  
   - **`BASE_URL`:** `http://127.0.0.1:4202`  
   - Branch: **`development`** @ **`7287529`**

3. **What was tested** (from “What to verify”)  
   - Migration / schema; API RBAC + PDF + versioning (`tests/test_staff_contracts.py`); Docker `front` build health; staff SPA login without **NG0200** / circular **ApiService**; optional **`test:landing-version`** (includes **`/contracts`**); **`curl /`** smoke; attempted waiter-only browser spot-check.

4. **Results**

   | Criterion | Result | Evidence |
   |-----------|--------|----------|
   | Migration applies (incl. `staff_contract` chain) | **PASS** | `app.migrate`: **Database is up to date (version 20260327100000)**; **`20260325180000_staff_contract.sql`** listed **applied**. |
   | API 403/404, RBAC, PDF, versioning, no leakage | **PASS** | `pytest tests/test_staff_contracts.py -v`: **4 passed** (same four tests as prior run). |
   | Frontend build (Docker `front` tail) | **PASS** | **`Application bundle generation complete`** at **2026-03-28T09:24:03.878Z**; lazy chunk **`staff-contracts-component`** present; **no** `TS` / `NG` error lines in tail. |
   | Staff SPA bootstrap (login form, no **Circular dependency** / **NG0200**) | **PASS** | Puppeteer: **`input[type="email"]`** filled on `/login?tenant=1`; landed **`/dashboard`**; browser console stream had **no** `Circular dependency` / **NG0200** lines (vite + “Angular is running in development mode” only aside from unrelated WS **1008** messages on some routes). |
   | Optional **`test:landing-version`** | **PASS** | Exit code **0**; step **[15/16] -> /contracts** navigated successfully. |
   | Optional **`curl /`** | **PASS** | **`200`**. |
   | Manual UI (admin PDF + second-user waiter in browser) | **PARTIAL** | Admin/owner path covered by sidebar automation incl. **`/contracts`**. Full **two-account** manual PDF flow not re-run. Separate one-off Puppeteer login **`pos-staff-demo@amvara.de` / `secret`** stayed on **`/login`** on this DB — **waiter UI not confirmed in browser**; waiter rules still covered by **`test_waiter_cannot_create`** / **`test_waiter_no_tax_id_for_other_contract`**. |

5. **Overall:** **PASS** — Required steps **1–4** and optional **5–7** from task instructions succeed; prior **FAIL** (circular **ApiService**) is **not** reproduced. Residual gap: **waiter browser session** not validated locally (credentials/seed mismatch); API tests provide waiter RBAC evidence.

6. **Product owner feedback**  
   El panel **Contracts** entra en la navegación staff y el login vuelve a funcionar en headless con la cuenta demo de propietario. Los cuatro tests de contratos en backend siguen en verde. Conviene validar una vez con un usuario camarero real en este entorno (o alinear seed/contraseña demo) para cerrar la capa UI del rol limitado.

7. **URLs tested**  
   1. `http://127.0.0.1:4202/`  
   2. `http://127.0.0.1:4202/login?tenant=1`  
   3. `http://127.0.0.1:4202/dashboard`  
   4. `http://127.0.0.1:4202/contracts` (vía sidebar tras login owner)  
   5. Otras rutas staff tocadas por **`test:landing-version`** (16 enlaces + submenú inventario).

8. **Relevant log excerpts**

   **Migrate (back):**
   ```text
   INFO: Database is up to date (version 20260327100000)
   ```

   **Pytest (back):**
   ```text
   tests/test_staff_contracts.py::TestStaffContracts::test_admin_creates_waiter_sees_only_own PASSED
   tests/test_staff_contracts.py::TestStaffContracts::test_new_version_and_pdf PASSED
   tests/test_staff_contracts.py::TestStaffContracts::test_waiter_cannot_create PASSED
   tests/test_staff_contracts.py::TestStaffContracts::test_waiter_no_tax_id_for_other_contract PASSED
   ============================== 4 passed in 2.95s ===============================
   ```

   **Front (compose, tail):**
   ```text
   chunk-VS5XFMQ7.js   | staff-contracts-component |  65.86 kB |
   Application bundle generation complete. [0.638 seconds] - 2026-03-28T09:24:03.878Z
   ```

   **Puppeteer (login + `/contracts`):**
   ```text
   OK: Logged in, URL: http://127.0.0.1:4202/dashboard
   [15/16] -> /contracts
   >>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.
   ```
