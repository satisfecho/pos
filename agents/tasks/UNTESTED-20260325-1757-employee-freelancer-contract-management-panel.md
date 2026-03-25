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
- **Version:** `2.0.57` (see `CHANGELOG.md`, `front/package.json`).

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

4. **Manual UI:** With stack up (`BASE_URL` e.g. `http://127.0.0.1:4202`), log in as **admin**: open **Contracts**, create contract for a waiter, upload a small PDF, download. Log in as that **waiter**: see only own row(s), download works; create/upload controls absent.

5. **Smoke (optional):** `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/` → `200`. (`test:landing-version` may fail if `.landing-page` selector/env differs; not specific to this feature.)

### Pass/fail criteria

- **Pass:** All steps in §2 succeed; RBAC matches tests; no regression in `pytest tests/test_staff_contracts.py`.
- **Fail:** Migration errors, 500 on contract routes, wrong tenant or cross-user data leakage, or PDF served without auth.
