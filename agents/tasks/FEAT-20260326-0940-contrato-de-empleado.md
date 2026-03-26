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
