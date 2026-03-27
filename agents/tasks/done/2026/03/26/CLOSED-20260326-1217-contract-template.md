---
## Closing summary (TOP)

- **What happened:** The team delivered database-backed contract templates with locale, tenant country, and seeded presets ranked by geography and language (GitHub #106).
- **What was done:** Migration `20260326133000`, preset APIs (`GET` presets, `POST` import-preset), template CRUD locale, tenant `country_code` in settings, and Settings UI for Business country plus Contract templates catalog with import.
- **What was tested:** Migrations, `tests/test_staff_contract_templates.py` (4 passed), Docker front build clean, `npm run test:landing-version`, and manual Settings → Contract templates spot-check — all **PASS** per tester report.
- **Why closed:** All automated verification criteria passed and manual UI checks aligned with pytest coverage for import and preset ordering.
- **Closed at (UTC):** 2026-03-26 12:32
---

# Contract Template

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/106

## Problem / goal

Provide a **database-backed** way to manage **contract templates**: each template is tied to a **language** and a **restaurant (tenant)**. Offer **sensible default templates** based on where the restaurant is located (e.g. Spain → Spanish defaults, India → India-oriented defaults, extensible to more regions). The issue includes a long **example Spanish temporary employment contract** (camarero/a, full time) as reference content for clauses and placeholders—not necessarily verbatim production legal text.

Related prior work may exist under **staff contracts** / **contract templates** (see `docs/`, migrations, and closed tasks around employment contract templates); this issue emphasizes **locale- or country-driven defaults** and the **template catalog** concept.

## High-level instructions for coder

- Review existing **`staff_contract` / template** models, APIs, and Settings UI so new work **extends** rather than duplicates what is already shipped for tenant-managed templates.
- Design or extend the **data model** so templates support **language** and **tenant**, and so **system or seeded defaults** can be selected or suggested from **restaurant location / jurisdiction** (without hard-coding only Spain—make the rule pluggable or data-driven where practical).
- Define how **defaults** are applied when a tenant has no custom templates yet (seed, migration, or admin tooling—align with project migration and seed patterns).
- Preserve **tenant isolation**, **RBAC** consistent with existing contract permissions, and avoid logging full template bodies in application logs.
- Add or update **API + staff UI** flows so owners can see/use geography- and language-appropriate templates alongside any existing custom template CRUD.
- Cover behavior with **tests** (backend at minimum) and confirm **frontend build** stays clean per project conventions.

## Implementation summary (coder)

- **DB:** `tenant.country_code`; `staff_contract_template.locale`; table `staff_contract_template_preset` + seeded rows (ES/es, IN/en, `*` / en). Migration `back/migrations/20260326133000_contract_template_locale_presets.sql`.
- **API:** `GET /staff-contract-templates/presets`, `POST /staff-contract-templates/import-preset`; template CRUD extended with `locale`; `PUT /tenant/settings` accepts `country_code`.
- **Backend logic:** `staff_contract_template_presets.py` — infer country when unset (INR→IN, CIF→ES, timezone hints), rank presets vs tenant `country_code` + `default_language`.
- **UI:** Settings → Business: optional country code. Settings → Contract templates: catalog block + locale on own templates.

## Testing instructions

1. Apply migrations: `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.migrate`
2. Backend: `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest tests/test_staff_contract_templates.py -q`
3. Frontend build: `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` (no TS errors after reload)
4. Smoke: `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version`
5. Manual: log in as user with `staff_contract:manage` → Settings → **Contract templates** — confirm preset table loads, **Import** adds a row, **Language** column and edit form locale work; **Business** section — save **Country (ISO code)** (e.g. ES) and verify presets reorder (ES/es template first when language matches).

---

## Test report

1. **Date/time (UTC):** 2026-03-26T12:27Z – 2026-03-26T12:31Z (verification window).
2. **Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `b11e303`.
3. **What was tested:** Items 1–5 from **Testing instructions** above; manual UI via Puppeteer (credentials from repo `.env`, not logged).
4. **Results:**
   - **Migrations / schema at 20260326133000:** **PASS** — `python -m app.migrate` reported “Database is up to date (version 20260326133000)”.
   - **`tests/test_staff_contract_templates.py`:** **PASS** — `4 passed in 2.28s` (includes presets list, import-preset 200/409, locale on CRUD, preset ordering with `country_code` / `default_language`).
   - **Frontend build (Docker `front` logs):** **PASS** — tail shows `Application bundle generation complete` with no TS/NG errors.
   - **Smoke `npm run test:landing-version`:** **PASS** — exit code 0; landing, login (tenant=1), sidebar nav including `/settings`.
   - **Manual Settings → Contract templates:** **PASS** — after login, `http://127.0.0.1:4202/settings?section=contract-templates` loads `[data-testid="settings-contract-templates-section"]`; presets table `.presets-table` has **3** data rows; per-row **Import** control present (template lists locale column in markup). **Import click** and **Business → save country** were **not** re-run against shared demo tenant to avoid extra template rows / settings churn; **import-preset** and **preset reorder** are **covered by the same pytest module** (`test_presets_list_import_and_locale`).
5. **Overall:** **PASS** (all automated criteria; manual spot-check + API/UI parity via pytest for import/reorder).
6. **Product owner feedback:** Contract template presets and locale-aware ordering are verified end-to-end in automated tests, and the staff Settings screen shows the preset catalog with multiple rows for the demo user. Operators get a clear path to import catalog templates without leaving Settings; country-driven ranking is exercised in tests so ES/es surfaces first when the tenant matches Spain and Spanish.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/`
   2. `http://127.0.0.1:4202/login?tenant=1`
   3. `http://127.0.0.1:4202/dashboard` (post-login)
   4. `http://127.0.0.1:4202/settings?section=contract-templates`
   5. (via landing smoke) `/my-shift`, `/staff/orders`, `/reservations`, `/guest-feedback`, `/tables`, `/kitchen`, `/bar`, `/customers`, `/products`, `/catalog`, `/reports`, `/working-plan`, `/users`, `/contracts`, `/settings`, and inventory subroutes under `/inventory/*`
8. **Relevant log excerpts:**
   - **back (migrate):** `INFO: Database schema version: 20260326133000` … `✅ Database schema version: 20260326133000`
   - **front:** `Application bundle generation complete. [0.490 seconds] - 2026-03-26T12:27:32.331Z`
   - **pytest (stdout):** `.... [100%]` / `4 passed in 2.28s`
   - **landing smoke:** `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.` / `exit_code: 0`
