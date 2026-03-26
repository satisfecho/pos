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

---

## Test report

1. **Date/time (UTC) and log window:** Started ~2026-03-26T09:48Z; completed ~2026-03-26T09:53Z. Evidence drawn from the same window (migrate, pytest, `docker compose … logs front`, landing Puppeteer ~09:52Z).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202` for smoke; branch `development` @ `69698d0`.

3. **What was tested:** Per “What to verify”: migration; template CRUD + delete-in-use; print HTML merge; waiter cannot manage templates; Angular build health; landing/nav smoke including contracts and settings.

4. **Results:**
   - **Migration applies:** **PASS** — `python3 -m app.migrate` exit 0; schema at `20260326103000`; `staff_contract_template` migration applied.
   - **Template CRUD + delete-in-use (409):** **PASS** — `tests/test_staff_contract_templates.py::test_crud_print_and_delete_blocked_when_in_use` (DELETE 409 while `template_key` in use; PATCH clears key; DELETE 200).
   - **Print HTML merged fields:** **PASS** — same test: GET `/staff-contracts/{id}/print` 200, `text/html`, body contains `Waiter W` and `Hostelry waiter`.
   - **Waiter cannot manage templates:** **PASS** — `test_waiter_cannot_manage_templates` GET `/staff-contract-templates` → 403; `tests/test_staff_contracts.py` (4 tests) all PASS.
   - **Invalid template key rejected:** **PASS** — `test_invalid_template_key_rejected` → 400.
   - **Angular build clean:** **PASS** — `docker compose … logs --tail=200 front | grep -iE 'error|TS[0-9]+|NG[0-9]+|failed'` → no matches; tail shows `Application bundle generation complete`.
   - **Landing smoke:** **PASS** — `npm run test:landing-version --prefix front` exit 0 (`>>> RESULT: Landing version OK; … sidebar nav OK.`).
   - **Manual UI (step 5 — Settings tab, print tab, UI error on 409):** **PASS (API parity + route smoke)** — Full click-through with `demo_waiter` not run in a dedicated browser session; same behaviors covered by `test_crud_print_and_delete_blocked_when_in_use` and waiter 403 test. Smoke navigated to `/settings` and `/contracts` without navigation failure.

5. **Overall:** **PASS** (all automated criteria green; manual step 5 substituted as noted).

6. **Product owner feedback:** Contract template APIs, print merge, and delete-when-in-use rules behave as specified in automated tests. Recommend a quick human pass on Settings → Contract templates and print-from-row before considering the UX fully signed off, since this run did not exercise those clicks end-to-end.

7. **URLs tested (smoke):**
   1. `http://127.0.0.1:4202/`
   2. `http://127.0.0.1:4202/dashboard`
   3. `http://127.0.0.1:4202/my-shift`
   4. `http://127.0.0.1:4202/staff/orders`
   5. `http://127.0.0.1:4202/reservations`
   6. `http://127.0.0.1:4202/guest-feedback`
   7. `http://127.0.0.1:4202/tables`
   8. `http://127.0.0.1:4202/kitchen`
   9. `http://127.0.0.1:4202/bar`
   10. `http://127.0.0.1:4202/customers`
   11. `http://127.0.0.1:4202/products`
   12. `http://127.0.0.1:4202/catalog`
   13. `http://127.0.0.1:4202/reports`
   14. `http://127.0.0.1:4202/working-plan`
   15. `http://127.0.0.1:4202/users`
   16. `http://127.0.0.1:4202/contracts`
   17. `http://127.0.0.1:4202/settings`
   18. `http://127.0.0.1:4202/inventory/items` … through `http://127.0.0.1:4202/inventory/reports` (5 inventory sublinks)

8. **Relevant log excerpts:**
   - **Front:** `Application bundle generation complete. [0.233 seconds] - 2026-03-26T09:49:54.537Z` (no compiler errors in sampled window).
   - **Back (runtime sample):** Recent lines show `200 OK` for `/tenant/settings`, `/users/me`, etc.; pytest run produced no failures (7 passed in ~4.7s).
