# Contrato de empleado

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/101

## Problem / goal

Restaurant owners need **multiple employment contract templates** (e.g. waiter temporary contract) managed from **restaurant settings**: create, read, update, and delete template types. Contracts must be **presentable for printing and physical or digital signature**. The issue includes a full Spanish example template (temporary work, hostelry waiter role) as reference content for fields and clauses.

See existing staff-contract work in **`back/app/staff_contract_routes.py`**, **`/contracts` UI**, and **`docs/`** for tenant and RBAC patterns.

## High-level instructions for coder

- Extend or align the **data model** so owners can maintain **distinct contract templates** per tenant (not only per-staff contract instances), including metadata needed to merge employer/worker placeholders.
- Add **settings (or contracts) UI** for owners/admins: CRUD for template definitions, preview, and safe deletion rules (e.g. block delete if in use, or archive).
- Implement **print-friendly and PDF-ready layout** for generated contracts (styling, page breaks, signature blocks); consider reuse of existing PDF/upload paths from the staff-contract feature.
- Respect **tenant isolation** and **STAFF_CONTRACT_*** (or equivalent) permissions; avoid logging PII from contract bodies.
- Add **tests** (API and/or e2e smoke) for template CRUD and rendering; document manual verification (print preview, one happy-path template).

## Coder notes (implementation summary)

- **DB:** `staff_contract_template` (`20260326103000_staff_contract_template.sql`); unique `(tenant_id, template_key)`. Optional `kind` hints default contract type when applying template in UI.
- **API:** `GET|POST /staff-contract-templates`, `GET|PATCH|DELETE /staff-contract-templates/{id}` — `STAFF_CONTRACT_MANAGE` only. Delete returns **409** if any `staff_contract.template_key` matches. `GET /staff-contracts/{id}/print` — `STAFF_CONTRACT_READ` + same access rules as contract; merges `{{placeholders}}` via `staff_contract_template_merge.py` (values HTML-escaped); signature block; fallback summary if no template row.
- **Front:** Settings tab **Contract templates** (`contract-templates-settings.component.ts`, visible with `staff_contract:manage`). **Contracts:** template dropdown loads saved templates + built-in employee/freelancer presets (`employee_default` / `freelancer_default`); **Print view** opens merged HTML in a new tab.
- **i18n:** All `public/i18n/*.json` updated for new keys.
- **Version:** `2.0.60` (`CHANGELOG.md` § [2.0.60]).

## Testing instructions

### What to verify

- Migration applies; template CRUD and delete-in-use behavior; print HTML contains merged fields; waiter cannot manage templates; Angular build clean.

### How to test

1. **Migrate:**  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m app.migrate`

2. **Backend:**  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest tests/test_staff_contracts.py tests/test_staff_contract_templates.py -v`

3. **Frontend build:**  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` — no TS/Angular errors.

4. **Smoke:**  
   `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front`

5. **Manual UI (admin):** Settings → **Contract templates** — create a template with key `demo_waiter`, body `<p>{{worker_name}} — {{role_title}}</p>`. **Contracts** → new contract — choose that template, save. **Print view** on the row — browser shows merged HTML. Try delete template while contract still references key → API error surfaced in UI; clear template on contract (edit) or remove `template_key` via API, then delete template succeeds.

### Pass/fail criteria

- **Pass:** Pytest green; front logs clean; landing smoke OK; manual template + print + delete-in-use behave as above.
- **Fail:** Migration errors; 500 on template or print routes; cross-tenant leakage; delete removes template still referenced without 409.
