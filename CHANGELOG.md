# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Working plan — per-user colors (GitHub #109):** Calendar shift lines use a stable hue from `user_id` (HSL chips + `@media (prefers-color-scheme: dark)`). Week list shift cards get a matching left border. Legend text updated in all shipped i18n files. Color hash helper: `front/src/app/working-plan/working-plan-shift-colors.ts` (+ `working-plan-shift-colors.spec.ts`).

### Changed

- **Agent loop:** Main **coder** step runs when **`WIP-*.md`** exists as well as **`NEW-*.md`**, so tasks are not stuck after **NEW → WIP** (`agents/pos-agent-loop.sh`, `agents/002-coder/CODER.md`, `docs/agent-loop.md`).

### Fixed

- **Settings → Data & privacy i18n (GitHub #108):** Added missing `SETTINGS.*` export/purge strings for **es**, **fr**, **ca**, **zh-CN**, and **hi**; corrected leftover English `PURGE_CONFIRM_LABEL` in **bg**. UI already used `translate` pipes; missing keys fell back to English.

- **Bulgarian staff dashboard subtitle (GitHub #107):** `DASHBOARD.WELCOME_TEXT` in `front/public/i18n/bg.json` was still English; translated to match the rest of the Bulgarian staff UI.

## [2.0.64] - 2026-03-27

### Added

- **Terms of service & privacy URLs (GitHub #110):** Optional per-tenant URLs in settings; global fallbacks in `config.env`; **`GET /public/legal-urls`**; links on landing, auth, book, and public feedback. Migration `20260327100000_public_terms_privacy_urls.sql`.

## [2.0.63] - 2026-03-26

### Added

- **Docs — working plan:** `docs/0021-working-plan-implementation-plan.md` describes goals, scope, BetterShift evaluation, and an in-house direction for kitchen/bar/waiter shift scheduling.

### Changed

- **Agent / git workflow:** Documented and automated **sync before edits** for multi-agent work on **`development`**: new **`scripts/git-sync-development.sh`**, **`agents/pos-agent-loop.sh`** runs it at each step (disable with **`AGENT_GIT_SYNC=0`**), updates to **`.cursor/rules/git-development-branch-workflow.mdc`**, **`AGENTS.md`**, **`docs/agent-loop.md`**, **`docs/agent-cursor-rules.md`**, and agent prompts under **`agents/`**.

### Security

- **Staff contract PDFs:** `GET /uploads/{tenant_id}/contracts/{filename}` now returns **403** so signed contract files are not served by the public `StaticFiles` mount; use authenticated `GET /staff-contracts/{id}/document` only. Regression test: `tests/test_uploads_security.py`. Security review notes: `docs/SECURITY-REVIEW.md`.

- **Tenant IDOR sample:** `tests/test_security_tenant_idor_orders.py` asserts another tenant’s order cannot be soft-deleted by ID.

## [2.0.62] - 2026-03-26

### Added

- **Contract template catalog & locale (GitHub #106):** Per-tenant templates gain optional **locale** (BCP 47). New table **`staff_contract_template_preset`** seeded by migration with regional outlines (ES/es, IN/en, global en). **`GET /staff-contract-templates/presets`** returns presets ranked by tenant **`country_code`**, **`default_language`**, and fallbacks (currency CIF/timezone heuristics when country unset). **`POST /staff-contract-templates/import-preset`** copies a preset into the tenant (same RBAC as template CRUD). Tenant **`country_code`** (ISO 3166-1 alpha-2) in Business settings. Settings → Contract templates: catalog table with **Import** / preview; i18n in all shipped locales. Migration `20260326133000_contract_template_locale_presets.sql`. Tests: `tests/test_staff_contract_templates.py`.

## [2.0.61] - 2026-03-26

### Added

- **Bulgarian locale (`bg`):** Full UI coverage in `public/i18n/bg.json` and backend message catalog alignment with other shipped locales.

- **Landing footer Contact us (GitHub #104):** Mailto **sales@satisfecho.de** with i18n label `LANDING.CONTACT_US` in all `public/i18n` locales; `test-landing-provider-links` asserts the mailto href.

- **User management password re-auth (GitHub #105):** `PUT /users/{id}` with a new `password` requires `actor_current_password` (verified against the signed-in user). `/users` edit modal collects **Your current password** above new/confirm when changing a password. API messages in `messages.py`; UI strings in all `public/i18n` locales. Tests: `tests/test_user_password_update.py`.

- **OpenStreetMap link for tenants (GitHub #102):** Optional `public_openstreetmap_url` in contact settings (same validation as other public http(s) links). Shown on public book (including post-submit), reservation-by-token view, and feedback pages alongside Google Maps when configured. Reservation confirmation and reminder emails include `google_maps_link_block_html` and `openstreetmap_link_block_html` placeholders (default template updated). Migration `20260326104500_tenant_public_openstreetmap_url.sql`. Tests: `tests/test_reservation_email_template.py`, `tests/test_reservation_reminder_email.py`, `tests/test_guest_feedback.py`.

- **Agent Cursor rules (GitHub #98):** Stack-focused **`.cursor/rules/*.mdc`** for Angular/ngx-translate (all `public/i18n` locales), FastAPI/SQLModel/migrations, Docker Compose + HAProxy, and security/tenant boundaries; catalog in **`docs/agent-cursor-rules.md`** with pointers from **`AGENTS.md`** and **`docs/agent-loop.md`**.

- **Tenant data export & purge (GitHub #96):** Owner-only `GET /tenant/data-export` returns a ZIP with `tenant-export.json` (tenant settings with payment/SMTP secrets redacted, staff without password hashes, products, orders, reservations, i18n, inventory, etc.). Owner-only `POST /tenant/purge` with `confirm_tenant_name` matching the tenant name irreversibly deletes tenant data and schedules upload cleanup; logs a warning with operator id/email. Settings → **Data & privacy** (owners): download export and danger-zone delete. **Users:** owners editing another user can assign the **Owner** role (co-owner). Script `python -m app.seeds.purge_demo_tenants` removes tenants **2–7** when `DEMO_PURGE_CONFIRM=1`. Tests: `tests/test_tenant_lifecycle.py`.

- **Password reset (GitHub #93):** Self-service recovery for **staff** (optional `tenant_id`, same as login) and **provider** accounts. New table `password_reset_token`, `POST /password-reset/request` (generic JSON message; rate-limited), `POST /password-reset/confirm` (one-time token, min. 8-char password, bumps `token_version`). Email uses existing SMTP (tenant SMTP when set). Frontend: `/forgot-password`, `/reset-password`, `/provider/forgot-password`; link from staff and provider login. Requires `PUBLIC_APP_BASE_URL` for emailed links. Env: `PASSWORD_RESET_TOKEN_EXPIRE_MINUTES`, `RATE_LIMIT_PASSWORD_RESET_PER_HOUR`. Tests: `tests/test_password_reset.py`.

- **Working plan bulk month (GitHub #88):** **Apply to month** on the working plan creates the same shift on selected weekdays for the target calendar month (aligned with export month rules). Optional **skip days that already have a shift** preserves per-day edits and exceptions. New `POST /schedule/bulk`; `tests/test_schedule_bulk.py`; Puppeteer `test:working-plan` checks the new control.

- **Working plan Excel export (GitHub #89):** Staff with schedule access can choose a worker and download that person’s shifts for the visible calendar month (calendar view) or the month containing the Monday of the displayed week (week view) as `.xlsx`. New `GET /schedule/export` (`user_id`, `year`, `month`, optional `lang`) uses openpyxl; tenant- and role-scoped like the schedule API. Puppeteer `test:working-plan` checks export UI; backend `tests/test_schedule_export.py` covers the endpoint.

- **My shift overtime alert (GitHub #87):** Open clock-in sessions expose `open_duration_minutes`, `contract_threshold_minutes` (default 8h), and `over_contract` on work-session APIs and reports. **My shift** shows a warning banner and elapsed time while clocked in past the threshold; dashboard **My shift** card shows a short notice. Backend tests cover threshold logic.

- **Tenant `reservation_slot_minutes`:** Migration adds nullable column; staff Settings → Reservations can set the interval between public booking start times (5–120 minutes, or empty/0 for legacy 15-minute steps). Public `book-week-slots`, `next-available`, and staff overbooking default grid use this value.

### Changed

- **Docs — PostgreSQL username:** Clarified in `README.md`, `config.env.example`, and `docker-compose.yml` that the container superuser is **`POSTGRES_USER`** (default `pos`), not `postgres`, so IDE/`psql` defaults do not cause **`FATAL: role "postgres" does not exist`** confusion.

- **Password reset email i18n (GitHub #97):** Reset email subject/body use `messages.py` translations for all backend-supported locales; language matches `POST /password-reset/request` (`?lang` / `Accept-Language`, same as API message). Forgot/reset flows send `lang` from the in-app language picker (`ApiService`). Tests: `tests/test_password_reset.py`.

- **Staff reservations week grid (GitHub #94):** Create/edit on `/reservations` uses the same Mon–Sun availability grid as public `/book` (`GET /reservations/book-week-slots`), tenant timezone, party size, and public lead-time rules. Shared `ReservationWeekSlotGridComponent`; optional `exclude_reservation_id` on book-week-slots excludes the edited booking from demand. Saving without changing date/time still allowed (e.g. past slots).

- **Reservation emails (GitHub #91):** Default confirmation template and scheduled/staff-triggered **reminder** emails include a **Contact us** block with the tenant’s public phone and email (`tel:` / `mailto:` in HTML, plain lines in text) when those fields are set. New template placeholder `restaurant_contact_block_html`; Settings → Reservations hint text updated in all i18n files.

- **Public table menu (GitHub #85):** Product cards and featured items use a light primary tint and border while the product is in the cart; adding or incrementing shows a short highlight on the card and the matching cart line. Respects reduced-motion for the pulse animation.

- **Staff reservations modal (GitHub #84):** Create/edit dialog field order and labels match the public `/book` flow (date, time, party size, then name, phone, email, reservation notes, customer notes); staff-only notes remain at the end. Uses global form styling, optional email placeholder like the book page, and the same phone/email validation rules as the book form. Short hint explains calendar/time inputs vs. the public week grid.

- **Settings → Reservations (GitHub #82):** Pre-payment amount uses **whole amount** and **minor units** derived from the tenant currency via `Intl` (e.g. euros + cents); zero-decimal currencies show a single whole-unit field. Still stored as smallest-currency-unit integer (`reservation_prepayment_cents`).

- **Agents:** 001 log-reviewer review stamps (2026-03-25–26), `LOG-REVIEWER-PROMPT.md` data-deletion scope, and task queue updates for contact-us (#104).

### Fixed

- **Angular NG0200 ApiService circular dependency (GitHub #100):** `authInterceptor` no longer calls `inject(ApiService)` while `HttpClient` is constructed for `ApiService`; it resolves `ApiService` lazily via `Injector` inside the 401 error path (`front/src/app/auth/auth.interceptor.ts`).

- **Settings → logo remove (GitHub #95):** Removing the business logo now calls `DELETE /tenant/logo` (unlink file, clear `logo_filename`), matching header-background removal. Previously only the local preview was cleared.

- **Working plan Excel export hidden for non-admin staff (GitHub #90):** The worker dropdown and export button were omitted when `GET /users` failed (403 for roles with `schedule:read` but not `user:read`). The app now loads schedulable staff via `GET /schedule/plan-users`; export controls stay visible with a disabled state and hint when no plan users exist.

- **Tables → Open menu / table PIN (GitHub #86):** Staff “Open menu” from the tables list and tile view now uses the same short-lived `staff_access` link as staff orders, so placing an order no longer forces the public table PIN modal. QR codes and “Copy” still use the customer URL. The PIN modal still shows **which table** (`Table: …`) when a PIN is required (e.g. wrong PIN retry).

- **Settings → Email (SMTP) (GitHub #81):** Added missing `SETTINGS.*` translation keys for SMTP and reservation confirmation copy in Catalan, Spanish, German, French, Hindi, and Chinese (`public/i18n`). SMTP port and username placeholders use i18n like other fields.

- **Settings Security / 2FA (GitHub #83):** Spacing between OTP description hint and the enable action (and setup hint before the secret row) so the control is not flush against the copy.

## [2.0.60] - 2026-03-26

### Added

- **Staff contract templates & print view (GitHub #101):** Per-tenant contract document templates (`staff_contract_template` migration `20260326103000`), CRUD API `/staff-contract-templates` (`STAFF_CONTRACT_MANAGE`), safe delete when no `staff_contract` references the template key. `GET /staff-contracts/{id}/print` returns print-styled HTML with `{{placeholder}}` merge (employer/worker/role/dates/etc.) and signature block; falls back to a field summary when no template matches. Settings → **Contract templates**; **Contracts** links templates when creating a contract and adds **Print view**. Tests: `tests/test_staff_contract_templates.py`.

## [2.0.57] - 2026-03-25

### Added

- **Staff contracts (GitHub #99):** Tenant-scoped **employee** and **freelancer** agreements with statuses, versioning (`POST /staff-contracts/{id}/new-version`), payroll vs invoice payment structure, optional tax-id and jurisdiction notes, internal management notes, and signed **PDF** upload stored under `uploads/{tenant_id}/contracts/` (served only via authenticated `GET /staff-contracts/{id}/document`, not public `/uploads`). **RBAC:** `staff_contract:read` for all tenant staff (list filtered to own contracts unless owner/admin); `staff_contract:manage` for owner/admin (create/update/upload). Staff UI: sidebar **Contracts**, route `/contracts`. Migration `20260325180000_staff_contract.sql`. Tests: `tests/test_staff_contracts.py`.

## [2.0.56] - 2026-03-25

### Added

- **Tables floor plan (GitHub #75):** Selected-table panel links to **Staff orders** — `?focusOrder=` when the table has `active_order_id`, else `?focusTableId=` to jump to the right order/tab (scroll or open edit for history). Same roles as `/staff/orders`. New Puppeteer `test:tables-canvas-open-orders`.

### Changed

- **Reservation reminders (GitHub #74):** Reminder email HTML/text use the same manage-reservation link label as confirmation (“View or change your reservation online”); the href is HTML-escaped. URL remains `/reservation?token=…` when `PUBLIC_APP_BASE_URL` is set.
- **Deploy (amvara9, GitHub #73):** After successful **back** and **front** image builds, `scripts/deploy-amvara9.sh` runs `docker buildx prune -f` to trim unused BuildKit cache (non-interactive). `SKIP_BUILDX_PRUNE=1` skips; prune failure logs a warning and does not abort deploy. Documented in `docs/0001-ci-cd-amvara9.md`.
- **Agents:** Bump-version task for issue #70 moved from `UNTESTED-20260324-2131-bump-version` to `WIP-20260324-2131-bump-version` (tester notes: package/changelog at 2.0.54; refresh generated `commit-hash` / run `get-commit-hash.js` so the landing footer matches the package version).

### Fixed

- **Spanish register placeholders (GitHub #78):** Register page placeholders now follow the selected UI language (e.g. Spanish) instead of falling back to English.
- **Tax of iva dropdown (GitHub #79):** Settings → Contact information “Tax of iva” dropdown no longer renders empty; backend seeds default Spanish IVA taxes for tenants without tax rows and the UI loads all taxes to avoid validity edge cases.

## [2.0.55] - 2026-03-24

### Added

- **Tenant UI modules (GitHub #72):** Per-tenant toggles for staff areas (`tables`, `working_plan`, `providers`, `reservations`, `kitchen_bar`, `inventory`) stored in `tenant.ui_modules` (JSONB, compact), exposed on `GET`/`PUT` `/tenant/settings` as a resolved `ui_modules` map. Settings **Navigation** tab; sidebar and dashboard respect flags; direct URLs to disabled routes redirect to `/dashboard`. i18n en/es/de for new strings.

## [2.0.54] - 2026-03-24

### Added

- **Smoke test:** `npm run test:tables-waiter-assignment` — waiter Table view has read-only assignment cells (optional `WAITER_LOGIN_EMAIL` / `WAITER_LOGIN_PASSWORD`; skips if unset).
- **i18n (zh-CN, hi):** Kitchen prep stations UI strings (Settings, Products, KDS filter) aligned with en/de/es/ca.

### Fixed

- **Public feedback (browser tab title):** Document title also refreshes when locale JSON finishes loading (`onTranslationChange`), not only on language change, reducing stale or key-like titles on slow networks (GitHub #67).
- **Public feedback (error view):** Invalid or missing tenant now shows `FEEDBACK` strings via the translate pipe and includes the language picker so title and error lines follow the selected locale without a prior visit to `/feedback/1` (GitHub #67).
- **i18n (de):** Repaired invalid `de.json` (missing comma in `SETTINGS` after `RESERVATION_REMINDER_2H_HINT`) so the German locale file parses and loads; public feedback and all DE strings work again (GitHub #67).
- **Public feedback i18n:** French, Catalan, Hindi, and Simplified Chinese now include full `FEEDBACK.*` strings (form, errors, staff table columns); public language picker `aria-label` uses `SETTINGS.SELECT_LANGUAGE` (GitHub #67).
- **Public feedback (loading):** Language picker is shown while the tenant loads; rating “required” marker uses `FEEDBACK.FIELD_REQUIRED_MARK` in all locales (GitHub #67).
- **Public feedback (submit errors):** HTTP **429** and **422** responses map to `FEEDBACK.RATE_LIMIT` / `FEEDBACK.VALIDATION_ERROR` in all supported locales instead of English rate-limit or validation payloads (GitHub #67).
- **Catalog menu rows:** Prevent `tenantproduct.price_cents` from being cleared to NULL (database NOT NULL): flush-time coalesce from supplier or linked product price, safer product backfill from catalog-only items, and PUT ignores explicit null price.
- **Tables floor plan:** Selected-table panel shows read-only assigned waiter from table API for roles without `table:write`, consistent with Tiles/Table list (GitHub #65).

### Changed

- **Docs:** Removed the trailing “Reference paths (local)” section from `docs/agent-loop.md` (redundant mac-stats-reviewer paths; upstream context remains earlier in the doc).
- **Landing (`/`):** Hero, value props, and a two-column guest vs staff layout (table code / register CTA) using existing design tokens; section heading for restaurant list; copy and new `LANDING.*` keys in all locales (GitHub #69).
- **Agents:** Closed task `CLOSED-20260324-1558-feedback-page-needs-translation` moved to `agents/tasks/done/2026/03/24/`.
- **Repository:** Ignore `time-of-last-review.txt` at repo root (001 log-reviewer output), `.factory/` (local IDE settings), and vim `*.swp` swap files.
- **API (public tenant):** `GET /public/tenants/{tenant_id}` **404** `detail` uses the same localized catalog as other public endpoints (`Accept-Language` / `?lang=`), not a hardcoded English string (GitHub #67).
- **Smoke test:** `test:feedback-public-i18n` checks **de**, **fr**, **es**, **ca**, **zh-CN**, **hi**, `?token=` URL, invalid **`/feedback/0`** (with **en**), missing tenant **`/feedback/999999999`** (API 404), and **first-load locale** via a fresh Chromium profile with `navigator.language` stubbed to **es-ES** before navigation (document title + visible copy, no raw `FEEDBACK.*` in the DOM) (GitHub #67).
- **Agents:** 001-log-reviewer `time-of-last-review.txt` — GitHub/issue sweep and Docker log pass lines appended (2026-03-23, through 22:55Z UTC).

## [2.0.53] - 2026-03-24

### Fixed

- **Public feedback (browser tab title, production):** Tab title uses synchronous `translate.instant` plus `get()` and omits `takeUntilDestroyed` on the inner subscription so `production-static` builds (e.g. satisfecho.de) update `document.title` instead of leaving the index default while the page copy is translated (GitHub #67).

## [2.0.52] - 2026-03-24

### Added

- **Smoke test:** `npm run test:feedback-public-i18n` — public `/feedback/:tenant` resolves translations (en + de); fails if raw `FEEDBACK.*` keys appear in the DOM (GitHub #67).

### Fixed

- **i18n bootstrap (Accept-Language interceptor):** Inject `LanguageService` only for API requests (`environment.apiUrl`). Loading `/i18n/*.json` during bootstrap no longer hits a circular dependency, so ngx-translate loads locale files and public routes (`/feedback/*`, `/book/*`, etc.) show translated copy on first paint (GitHub #67).
- **Public feedback (browser tab title):** Tab title uses `FEEDBACK.LOADING` / `FEEDBACK.TITLE` / `FEEDBACK.THANK_YOU` plus tenant name when available (GitHub #67).
- **i18n (ca, fr, hi, zh-CN):** `NAV.GUEST_FEEDBACK` and `RESERVATIONS.VIEW_FEEDBACK_PAGE` translated (GitHub #67).

## [2.0.51] - 2026-03-23

### Added

- **Week view for online reservations:** Guests can pick a day and time using a clear week layout: open slots look green, full ones red, and closed or past times are greyed out (GitHub #64).
- **Smarter suggested times:** The booking flow suggests a time a few minutes after "now" instead of always defaulting to the same evening hour; staff get the same idea when creating reservations (GitHub #62).
- **Extras on each order line:** Staff can note swaps, add-ons, and removals (for example pizza-style changes). Kitchen tickets and printed bills show a short, readable summary (GitHub #50).
- **Kitchen and bar prep stations:** Owners can name prep stations (kitchen, bar, grill, etc.), choose whether each station shows on the kitchen or bar screen, map products to stations, and set defaults so drinks and dishes go to the right place (GitHub #66).
- **"My shift" on the dashboard:** Team members see at a glance if they are clocked in and can open their shift page in one tap (GitHub #57).
- **Edit your own suppliers:** Restaurants can update contact details for providers that belong to them under Settings (GitHub #25).
- **Tips and Revolut:** Short owner-facing note on how tip buttons relate to card payments with Revolut, plus small tests around edge cases (GitHub #58 follow-up).
- **Planning docs:** Extra roadmap material for larger future themes (GitHub #52 planning).

### Changed

- **Pay earlier in the flow:** When your rules allow it, staff see a clearer "Pay now" path and short explanation that the kitchen can still be finishing dishes until you mark the order complete (GitHub #23).
- **Catalog cards:** Long descriptions can expand and collapse; prices line up neatly across the grid (GitHub #34).
- **Safer server updates:** Production deploy builds new images before stopping the app, keeps the database running during routine updates, and waits until the site answers health checks again. Overlapping deploy jobs are avoided (GitHub #49).
- **Automated browser checks:** Default test runs no longer pop up a browser window unless you ask for one; optional deeper navigation checks when credentials are configured.
- **How we ship code:** Day-to-day work lands on a development branch first; production still follows the main branch when you promote a release.

### Fixed

- **Who waits which table:** Waiters and reception can read table and floor assignments without needing extra admin rights (GitHub #65).
- **New staff accounts:** Resolved a database mismatch that could block creating some users.
- **Order list layout:** Action buttons on order cards stay aligned when extra lines appear (GitHub #59).
- **Product list layout:** Removed odd empty space below the products table (GitHub #33).

### Contributors

- Agent playbooks, task folders, and a small **pos-agent-loop** helper script were added so automated assistants can follow the same steps as the team. Issue tracking hooks are documented for those workflows.

## [2.0.50] - 2026-03-23

### Added

- **GitHub #62 — Public book page:** **Month calendar** next to the date field (Mon–Sun grid, prev/next month, legend). **Closed days** use opening hours (`GET /reservations/book-calendar`); **past days** and **outside the 12‑month window** are disabled. **Tenant `timezone`** is included on **`GET /public/tenants/{id}`** so “today” and time filtering match the restaurant. **Public** bookings require **at least 10 minutes** lead time (`RESERVATION_PUBLIC_MIN_LEAD_MINUTES`); **`GET /reservations/next-available`** gains **`min_lead_minutes`** (default **10**; staff uses **0**). Time dropdown for **today** hides slots before that cutoff. i18n: **`BOOK.CAL_*`**. API message **`reservation_min_lead_time`** (en, es).

## [2.0.49] - 2026-03-23

### Added

- **GitHub #58 — POS tips**: **Settings → Payments** — up to **four tip percentages** (default 5/10/15/20), optional **tip VAT rate** for invoice breakdown. **`PUT /orders/{id}/mark-paid`** and **`PUT /orders/{id}/finish`** accept optional **`tip_percent`**; order stores **`tip_percent_applied`** and **`tip_amount_cents`**. **`GET /orders`** returns **`subtotal_cents`**, tip fields, and **`total_cents`** including tip. **Unmark paid** clears tip. **Printed invoice** shows subtotal, tip line, and VAT split when configured. Migration **`20260323140000_tenant_tip_presets_and_order_tip.sql`**. Tests: **`back/tests/test_order_tip.py`**. i18n: **`ORDERS.*`** tip keys, **`SETTINGS.TIP_*`**.
- **GitHub #57 — staff attendance (clock in/out)**: Table **`work_session`** for **recorded** on-site times (separate from **working plan** `shift` scheduling). API: **`GET /users/me/work-session`**, **`POST .../work-session/start`**, **`POST .../work-session/end`**, **`GET /users/me/work-sessions`**; **start/end IP** from the server’s view (proxy headers) for audit. Staff page **`/my-shift`** + nav **My shift**; **Reports** adds an **attendance** table and **`GET /reports/work-sessions`**. Migration **`20260323150000_work_session.sql`**. Test **`back/tests/test_work_session.py`**. i18n: **`MY_SHIFT.*`**, **`REPORTS.WORK_SESSIONS_*`**, **`NAV.MY_SHIFT`**.

## [2.0.48] - 2026-03-23

### Added

- **GitHub #52 (follow-up)**: **`GET /billing-customers`** list now includes **`birth_date`** (aligned with single-customer and order payloads). **Customers** (`/customers`) — table column and add/edit **birth date** field with i18n. Migration **`20260323120500_billing_customer_birth_date.sql`** added to the repo (idempotent `IF NOT EXISTS`). **`docs/0032-github-issues-roadmap.md`** — per-theme **implementation status** for all #52 bullets; **`docs/0017-billing-customers-factura.md`** and **`ROADMAP.md`** updated accordingly.
- **GitHub #56**: **Kitchen / bar** — **wait-time progress bar** (fill toward red threshold; color matches timer tier). **Staff urgent** — **`order.staff_urgent`**, **`PUT /orders/{id}/staff-urgent`**, waiter toggle on **Orders**, kitchen **badge + sort**. **Reports CSV/Excel** — export **`lang`** from **`LanguageService`**; localized reservation **source/status** in Excel; **products CSV** includes **category**; **`report_export_labels`** fallback for language tags. Migration **`20260323130000_order_staff_urgent.sql`**. Tests: **`back/tests/test_report_export_i18n.py`**.

## [2.0.47] - 2026-03-23

### Added

- **GitHub #50 — order customizations (pizza-style):** **Multi-select** choice questions: staff save options as **`{ choices: string[], multi: true }`** (or a plain list for single select). Public **menu** shows checkboxes; **`customization_answers`** may store **`string[]`** per question id. **`POST /menu/.../order`** validates answers server-side and merges lines using normalized equality. **`OrderItem.customization_summary`** snapshots **“Label: value · …”** for kitchen, staff orders, order history, current order, and **printed invoice**. Migration **`20260323121000_orderitem_customization_summary.sql`**. Module **`back/app/product_customization.py`**. Docs: **`docs/0031-order-customizations-plan.md`**.

## [2.0.46] - 2026-03-23

### Added

- **GitHub #24 (fast checkout)**: Staff **Orders** — **Finish** marks **all active line items as delivered** and **marks the order paid** in one API call (`PUT /orders/{id}/finish`). Green **Finish** button on order cards, **Finish (serve all & pay)** in the status menu, and in **Edit order**; payment method matches **Mark as paid**. Requires **`order:update_status`** and **`order:mark_paid`**. **i18n**: `ORDERS.FINISH_*` in all locale files.

### Fixed

- **Customers / Angular build**: **`createBillingCustomer`** TypeScript payload allows **`birth_date: null`** so the billing form matches the API type and **`ng serve`** compiles.

## [2.0.45] - 2026-03-23

### Added

- **Birth date on billing customers (#52 — CRM)**: Optional **`birth_date`** on **`BillingCustomer`**; **`POST/PUT/GET`** `/billing-customers/{id}` and nested **`billing_customer`** on **orders** return it. API + model + i18n keys; see **`docs/0017-billing-customers-factura.md`**. (List endpoint, **Customers** UI, migration file, and roadmap status table completed in **2.0.48**.)

## [2.0.44] - 2026-03-23

### Added

- **Google Maps on public pages (GitHub #54)**: **Settings → Contact** includes an optional **Google Maps link** (`public_google_maps_url`). **Public API** also exposes **`address`** so guests see the street address on **book**, **reservation view**, and **feedback** pages, with an **Open in Google Maps** button when the maps URL is set. **Note:** Google does not allow auto-posting reviews; the existing **Google review** field remains the supported way to deep-link guests to leave a public review after private feedback.

## [2.0.43] - 2026-03-23

### Added

- **Per-restaurant currency (GitHub #41)**: **Settings → Payments** uses an **ISO 4217** dropdown (EUR, USD, GBP, JPY, MXN, and other common codes). **`currency_code`** is the source of truth; the legacy symbol column stays aligned on save.

### Fixed

- **Currency display (GitHub #41)**: **`GET /tenant/settings`** and **`PUT /tenant/settings`** responses, and the **public menu** payload, now expose a **consistent** `currency_code` + symbol (no more **EUR** with a **$** label from an old legacy field). Staff **Products**, **Catalog**, **Orders**, **Reports**, and **customer menu** formatting use the ISO code first; defaults remain **EUR** when unset.
- **Landing / table code (GitHub #38)**: The homepage field expected the **menu URL token** (from the QR code), while guests type the **printed table name** (e.g. `T01`), which showed a confusing menu error. **`GET /public/table-lookup`** resolves token or printed name (case-insensitive, trimmed); the landing page calls it before opening **`/menu/...`**. If several tenants share the same table name, the user picks a restaurant. **`slowapi`**: `public_table_lookup` takes **`response: Response`** so rate limiting with **`key_func`** does not return 500. **Tests**: **`back/tests/test_public_table_lookup.py`**. Register page test matcher **`test-register-page.mjs`** extended for the updated guest hint.

## [2.0.42] - 2026-03-23

### Added

- **Guest feedback (staff)**: **`/guest-feedback`** shows a **QR code** for the public form (`/feedback/{tenantId}`), **copy link**, and **Print QR** — print stylesheet hides sidebar and the feedback table so owners get a clean page for table tents or the register.
- **i18n**: **`FEEDBACK.QR_*`** / **`COPY_FEEDBACK_URL`** / **`PRINT_QR`** / **`URL_COPIED`** in all locale files.

## [2.0.41] - 2026-03-23

### Added

- **Products / menu customizations (GitHub #50, Phase 1)**: Staff **`/products`** edit form includes **customer menu customizations** for saved products (list, add, edit, delete, reorder). Backend: **`PATCH` / `DELETE` `/products/{id}/questions/{question_id}`**, **`PUT` `/products/{id}/questions/reorder`**, stricter **`options`** validation on create/update (`choice` list, `scale` min/max, `text`). **`ProductQuestion.options`** typing allows JSON arrays.
- **i18n**: New **`PRODUCTS.*`** strings for the customization editor (**`en`**, **`es`**, **`de`**, **`fr`**, **`ca`**, **`zh-CN`**, **`hi`**).

### Changed

- **`docs/0031-order-customizations-plan.md`**: Phase 1 marked **done**; API / staff UI rows updated.

## [2.0.40] - 2026-03-23

### Fixed

- **UX (GitHub #32)**: Form dialogs move keyboard focus to the first `input` / `select` / `textarea` when opened. The shared `appFocusFirstInput` directive now uses `afterNextRender` plus short deferred passes so focus reliably wins over the opening click and late-rendered fields. Wired on billing **Customers**, inventory **suppliers**, **items** (create/edit + adjust stock), **purchase orders** (create + receive-goods), and the menu **payment message** step; existing modals (reservations, orders, settings, etc.) use the same directive.

## [2.0.39] - 2026-03-22

### Fixed

- **Tables (#48)**: Floor plan links to **tile grid** and **list** now open `/tables?view=tiles` / `?view=table` so the correct view shows; **localStorage** restore no longer overrides that choice on first paint.
- **Products / tenant settings (#41)**: **`GET /tenant/settings`** fills missing **`currency_code`** / **`currency`** with **`EUR`** / **`€`** so staff product prices format in euros when the tenant never set currency.

### Changed

- **i18n (`en`, `es`)**: Tables view labels clarify **tile grid (mosaic)** vs **list view**.
- **Deploy (GitHub Actions #49)**: **`deploy-amvara9`** uses **`concurrency`** per branch, checks out the pushed branch (**`github.ref_name`**) instead of hard-coding **`master`**, and **retries** landing + health smoke checks with backoff.

## [2.0.38] - 2026-03-22

### Changed

- **i18n**: Register and settings email/website placeholders no longer use **`example.com`** / “example”-style domains ( **`en`**, **`es`**, **`ca`**, **`fr`**, **`de`**, **`zh-CN`**, **`hi`** ).
- **Seeds**: **`wine_import`** and **`pizza_import`** image downloads send the same **`User-Agent`** as **`beer_import`** (GitHub repo contact URL).

## [2.0.37] - 2026-03-22

### Changed

- **Settings (SMTP user)**: Input placeholder uses **`you@your-mail.com`** instead of **`user@example.com`**.
- **Beer import seed**: Wikimedia **`User-Agent`** contact URL points at the **GitHub** repo instead of **`example.com`**.

## [2.0.36] - 2026-03-22

### Changed

- **`back/app/settings.py`**: **`PUBLIC_APP_BASE_URL`** field description examples use **`satisfecho.de`** / **`localhost:4202`** instead of **`example.com`**.
- **README**: Backend tests blurb mentions **`tests/test_settings_defaults.py`**.
- **`commit-hash.ts`**: Synced to match post-**2.0.35** git short hash.

## [2.0.35] - 2026-03-22

### Added

- **Backend test** `tests/test_settings_defaults.py`: Asserts **`EMAIL_FROM`** model default is **`noreply@satisfecho.de`** (guards against regressing to **`example.com`**). Mentioned in **`docs/testing.md`**.

## [2.0.34] - 2026-03-22

### Changed

- **Mail-related tests & docs**: Replaced **`@example.com`** placeholders in Puppeteer scripts (defaults and comments), **`AGENTS.md`**, **`docs/testing.md`**, **`docs/screenshots/README.md`**, and **`docs/0001-ci-cd-amvara9.md`** with **`@amvara.de`** (or project-consistent demo addresses) per **no-example.com** rules for paths that register, log in, or rate-limit with real addresses.
- **`back/tests/test_contact_validation.py`**: Normalization case uses **`amvara.de`** instead of **`example.com`**.
- **Backend default `EMAIL_FROM`**: Fallback is **`noreply@satisfecho.de`** instead of **`noreply@example.com`** when SMTP sends without a tenant-specific from address.

## [2.0.33] - 2026-03-22

### Changed

- **Dev `environment.ts`**: Import **`version`** from **`package.json`** as a named binding (instead of the whole JSON object) for a slightly leaner dev bundle.

## [2.0.32] - 2026-03-22

### Changed

- **Dev `environment.ts`**: Version fallback when **`commit-hash.ts`** is **`0.0.0`** now comes from **`package.json`** (via **`resolveJsonModule`**) instead of a manually maintained **`DEV_VERSION_FALLBACK`** constant.

## [2.0.31] - 2026-03-22

### Fixed

- **Dev `environment.ts`**: **`DEV_VERSION_FALLBACK`** matched **`package.json`** again (was **2.0.21**; used only when **`commit-hash.ts`** still has version **`0.0.0`**, e.g. **`ng serve`** without running **`get-commit-hash.js`** first).

## [2.0.30] - 2026-03-22

### Added

- **Docker dev — landing footer hash:** **`docker-compose.yml`** passes optional **`COMMIT_HASH`** into the **`front`** service (bind mount has no **`.git`**). **`./run.sh`** exports **`COMMIT_HASH`** from **`git rev-parse --short HEAD`** when unset so **`docker-entrypoint.sh`** / **`get-commit-hash.js`** can show the correct short hash without committing **`commit-hash.ts`** after every commit.
- **Docs**: **`README.md`**, **`AGENTS.md`**, and **`config.env.example`** describe **`COMMIT_HASH`** for manual **`docker compose`** usage.

## [2.0.29] - 2026-03-22

### Fixed

- **Dev landing footer**: Regenerated **`front/src/environments/commit-hash.ts`** with `node scripts/get-commit-hash.js` so the displayed **version** matches **`package.json`** (it had stayed at **2.0.21** when only the bind-mounted front tree was present). The committed **git short hash** is refreshed the same way (and **`docker-entrypoint.sh`** runs this script on container start when `/app/scripts/get-commit-hash.js` exists).

## [2.0.28] - 2026-03-22

### Changed

- **README**: Under **Development**, added **Backend tests** with the `pytest /app/tests` Docker one-liner and a pointer to **`docs/testing.md`**.
- **Docs / comments**: `get_current_order` fallback comment now says **open** orders (not paid/cancelled) instead of “unpaid” only.

## [2.0.27] - 2026-03-22

### Changed

- **`GET /menu/{token}/order`**: Fallback order lookup now excludes **paid** and **cancelled** rows in the SQL filter (same behaviour as before, less redundant filtering in Python).

## [2.0.26] - 2026-03-22

### Changed

- **Docs**: `docs/testing.md` — reservation capacity tests: note they run under **`pytest /app/tests`**, add a **`-T`** `docker compose exec` example, and clarify why SQLite uses a minimal table set.

### Fixed

- **Comments**: `create_order` shared-order branch comment now mentions **cancelled** as well as paid when describing when a new order row is created.

## [2.0.25] - 2026-03-22

### Added

- **Backend test** `tests/test_public_menu_order_response.py`: Asserts the first **`POST /menu/{token}/order`** on a table returns **`status: "created"`** and a follow-up post returns **`"updated"`** with the same `order_id` (regression guard for shared-order `is_new_order`).

## [2.0.24] - 2026-03-22

### Fixed

- **Public menu `POST /menu/{token}/order`**: Removed a line that always forced `is_new_order = False`, so the first order on a table again returns **`status: "created"`** and publishes **`new_order`** to Redis (was incorrectly always **`updated`** / **`items_added`**).

### Changed

- **Backend**: Replaced `print` debug noise in `get_menu` and `create_order` with **`logger.debug`** (and **`logger.exception`** on menu query failure). Dropped a duplicated CORS comment line.

## [2.0.23] - 2026-03-22

### Changed

- **Backend**: Replaced deprecated FastAPI `@app.on_event("startup" | "shutdown")` with a single **`lifespan`** context manager (same DB init, migrations, and reservation reminder heartbeat). Removes `DeprecationWarning` noise during `pytest` and matches current FastAPI guidance.

## [2.0.22] - 2026-03-22

### Fixed

- **Public menu — customer cancel**: Clearing the table’s `active_order_id` when the shared order is cancelled so the next `POST /menu/{token}/order` creates a **new** order (matches “new order after cancel” behaviour and avoids reusing a cancelled row).
- **`GET /menu/{token}/order`**: Ignores **cancelled** shared orders the same way as **paid** ones so customers do not see a cancelled cart as current.

### Changed

- **Backend tests**: `RATE_LIMIT_ENABLED=false` for pytest / `PgClientTestCase` (`tests/conftest.py`, `tests/pg_client_mixin.py`) so SlowAPI does not break or flake on `TestClient` runs. Session-isolation test binds `Order.session_id` in the DB to assert PUT/DELETE session checks. Guest feedback, payment security, and public-tenant WhatsApp tests use the same Postgres rollback mixin instead of SQLite `create_all`.

## [2.0.21] - 2026-03-22

### Added

- **Backend dev/test deps**: `httpx` and `pytest` in `back/requirements.txt` so `TestClient` tests run inside the **back** Docker image after rebuild (`docker compose build back`).

### Changed

- **Docs**: `docs/testing.md` — run backend `pytest` in the **back** container (after `docker compose build back`).
- **`tests/test_users_me_anonymous.py`**: Uses `TestClient` only (no in-memory SQLite `create_all`; full schema uses Postgres-only types such as JSONB). Imports `app` from the package root so it runs both on the host (`back/`) and in Docker (`/app`).

## [2.0.20] - 2026-03-22

### Changed

- **API — `GET /users/me`**: Returns **200** with JSON **`null`** when there is no valid session (instead of **401**). Same as before when logged in (user JSON). Lets the SPA check auth without a failed-network / console noise for guests. **Breaking** for any client that relied on 401 to detect “not logged in”; use status **200** + null body instead.

### Added

- **Backend test**: `tests/test_users_me_anonymous.py` asserts anonymous `GET /users/me` → 200 + null (uses FastAPI `TestClient`; `httpx` is now in `requirements.txt`).

## [2.0.19] - 2026-03-22

### Fixed

- **Landing page**: Stopped calling `checkAuth()` a second time on load. `ApiService` already requests `/users/me` once at bootstrap; the landing component now waits for that to finish via `waitForInitialAuthCheck()`, then redirects or loads public tenants. Cuts duplicate requests and avoids an extra **401** in the network log for guests.

## [2.0.18] - 2026-03-22

### Fixed

- **Docker dev — version footer**: `docker-entrypoint.sh` runs `get-commit-hash.js` before `ng serve` so `commit-hash.ts` tracks **`package.json` version** on each container start. The script **keeps the previous short hash** when git is unavailable (e.g. only `./front` is bind-mounted), instead of overwriting with `git hash`.

## [2.0.17] - 2026-03-22

### Fixed

- **Angular NG0505 (hydration)**: Removed `provideClientHydration` from the **browser** `app.config.ts`. Shipped dev and prod builds use CSR only (`development-no-ssr`, `production-static`), so there was no serialized SSR payload and the client logged NG0505 on every load. SSR builds still get hydration via `app.config.server.ts`.
- **Dev landing version string**: Regenerated `commit-hash.ts` so `version` matches `package.json` (was `0.0.0`, which forced the stale `DEV_VERSION_FALLBACK`). Aligned `DEV_VERSION_FALLBACK` with the current package version for when the script has not run.

## [2.0.16] - 2026-03-22

### Fixed

- **Reports (NG0955)**: `@for` over “by product” now tracks **product id + name** (matches backend aggregation key), so duplicate `product_id` values no longer break change detection. Revenue chart Y-axis ticks track by **Y position** so max revenue **1¢** does not duplicate the `tick.value` key.

## [2.0.15] - 2026-03-22

### Added

- **Reports export (#35)**: CSV/Excel column and sheet titles follow the UI language. `GET /reports/export` accepts optional `lang` (e.g. en, es, de, ca, fr, zh-CN, hi). The app sends the current ngx-translate language when downloading exports.

### Changed

- **Reports & Products — locale for numbers (#41)**: Shared `intlLocaleFromTranslate` maps the UI language to a BCP 47 locale for `Intl` — currency and short dates on Reports match the selected language, and changing language refreshes formatted values. **Products**: tenant currency settings load before the product list (avoids a flash of the wrong symbol); price formatting uses the same locale mapping; when settings omit currency, the default prefix is **€** instead of **$**.

## [2.0.14] - 2026-03-22

### Fixed

- **Customers / orders (#30)**: English string **Print invoice** instead of “Print Factura” for `CUSTOMERS.PRINT_FACTURA`.
- **Catalog (#43, #42, #44)**: “Set your price” field uses a **currency prefix + input** row so the symbol no longer overlaps the amount; catalog card **image area** has padding and a neutral background; **Remove from menu** is an **outline** button so it reads clearly vs solid **Add to menu**.
- **Reports (#45)**: Data table cells use **vertical-align: middle**; **Share (%)** column cells get a **minimum height** so the last row aligns better with the bar + percentage.

## [2.0.13] - 2026-03-22

### Added

- **Guest feedback (issue #54 – MVP)**: Public page `/feedback/:tenantId` (optional `?token=` reservation magic link) for star rating, optional comment, and optional contact fields; thank-you step with button to the tenant’s **Google review URL** when configured. Staff list at `/guest-feedback` (same access as reservations). Settings: **Google review link** (`public_google_review_url`, http/https only). API: `POST /public/tenants/{id}/guest-feedback` (rate-limited per IP/hour, `RATE_LIMIT_GUEST_FEEDBACK_PER_HOUR`), `GET /tenant/guest-feedback`; public tenant payloads include `public_google_review_url`. Migration `20260322190000_guest_feedback_and_google_review_url.sql`. i18n: `FEEDBACK.*`, `NAV.GUEST_FEEDBACK`, `SETTINGS.PUBLIC_GOOGLE_REVIEW_*`, `RESERVATIONS.VIEW_FEEDBACK_PAGE` (en, de, es + en strings for fr, ca, hi, zh-CN). Reservation view links to the feedback form with token when present.

## [2.0.12] - 2026-03-22

### Fixed

- **Cancel reservation modal**: The footer no longer shows the left dismiss button—only **Yes, cancel reservation** remains (header × and clicking the backdrop still close without cancelling). Applies to staff reservations list and public reservation view. Other confirmation modals keep both footer buttons via `showSecondaryButton` (default `true`).

## [2.0.11] - 2026-03-22

### Fixed

- **Public booking – “View or cancel” link**: Reservations created via `/book/...` while a staff session cookie was present had no `token`, so the success-page link and token-based flow failed. Every new reservation now receives a magic-link token (staff-created bookings included).
- **Cancel reservation dialog**: Confirm and dismiss actions no longer both read as “Cancel” in English; primary action is **Yes, cancel reservation**, secondary is **Close** (staff list and public reservation view).

### Added

- **Contact on confirmation**: After a successful public booking, the success card shows the restaurant’s phone, WhatsApp, and email when configured.
- **Email validation**: `email-validator` on `POST /register`, `POST /register/provider`, admin `POST/PUT /users`, and reservation create/update when an email is provided; registration and booking forms use stricter client checks.
- **Phone validation**: `phonenumbers` (libphonenumber) on reservation create/update and optional provider registration phone; numbers stored in E.164 when valid.
- **12-month booking horizon**: Reservation date cannot be more than ~12 months ahead (366 days, tenant-local “today”) on create and staff update.
- **Delay notice**: `PUT /reservations/{id}/public` rate-limits non-empty delay updates per client IP per reservation (rolling 1h, Redis; configurable via `RATE_LIMIT_RESERVATION_DELAY_PER_HOUR`). UI `maxlength="500"` and API `max_length=500` on delay text.

## [2.0.10] - 2026-03-22

### Fixed

- **POST /register and POST /register/provider 500 (SlowAPI)**: With `headers_enabled`, SlowAPI’s sync wrapper injects rate-limit headers into a `Response` instance. Endpoints that returned a plain `dict` passed `None` there and raised, producing `500 Internal Server Error` on account creation. Both routes now return `JSONResponse` with `201 Created` (same approach as public menu and table mutations).

## [2.0.9] - 2026-03-22

### Added

- **Reservations – turn time and walk-in buffer**: Tenant settings `reservation_average_table_turn_minutes` (optional) and `reservation_walk_in_tables_reserved` (default 0). When turn is set, capacity treats each table as busy only for `[start, start + turn)` from the earliest of `reservation.seated_at` (set when staff seats), `order.created_at`, or `table.activated_at` / now for active sessions. When turn is unset, busy tables remain excluded for the full calendar day (tenant TZ) as before. Walk-in buffer removes the smallest tables (by `seat_count`, then `id`) from the reservation pool. Migration `20260322120000_reservation_turn_walk_in_seated_at.sql` (`reservation.seated_at`, tenant columns, backfill seated rows). Settings UI (en, es, de, ca, fr) and `docs/0025-reservation-overbooking-detection.md`. Unit tests: `back/tests/test_reservable_capacity_turn_walkin.py`.

### Changed

- **Reservations – opening hours and per-slot capacity**: `POST/PUT /reservations` reject times outside opening hours; slot capacity endpoints evaluate **per requested time** (not only once per day). Overbooking report top-level `total_seats` / `total_tables` are physical counts; each slot row uses reservable capacity for that time. Public book time dropdown respects opening hours. `GET /tables/with-status` and seating a reservation treat `is_active` and `partially_delivered` orders as occupied; seating is blocked if the table is still activated for ordering.

## [Unreleased]

### Changed

- **Catalog (GitHub #42–#44)**: Card image area uses normal card inset (**no full-bleed negative margin**), extra inner padding, centered **`object-fit`**. **“Set price”** row: wider currency cell and input padding so values don’t overlap the **€** symbol (**#43**). **Remove from menu** uses light red fill + **dashed** border vs solid primary **Add** (**#44**).
- **Reports (GitHub #45)**: **Share** column cells (**`td.share-with-bar`**) use a taller **`min-height`** and **`box-sizing`** so the **%** row aligns with bar height.
- **Product image upload (GitHub #40)**: **`POST /products/{id}/image`** (and provider product image upload) infer **`Content-Type`** from filename or **Pillow** when the client omits it; deleting the previous file supports both **`tenant_id/products/…`** and **`providers/…`** catalog paths.
- **Scripts**: **`go-ahead-loop.sh`** only **pull + pytest + landing smoke** (no auto-**`commit-hash.ts`** commits; syncing that file each cycle would always lag **`HEAD`** and create endless chore commits).
- **API service**: WebSocket **`console.log`** diagnostics (open/close/reconnect) run only when **`!environment.production`**; **`console.warn`** / **`console.error`** unchanged.
- **Menu (public order)**: Geolocation errors are ignored silently when building the order payload (no **`console.log`**).
- **Purchase orders**: Remove debug **`console.log`** after loading inventory items for the create modal.
- **Seeds**: **`update_wine_details`** ImportError message refers to **`wine_import`** Tusumiller helpers (not only **`fetch_wine_detail_page`**).
- **Seeds**: **`update_wine_prices`** and **`update_wine_details`** reuse **`FORM_DATA_BASE`** from **`wine_import`** for Tusumiller search **`POST`** bodies (with **`update_wine_prices`** still reusing **`API_ENDPOINT` / `HEADERS` / `COOKIES`**).
- **Seeds**: **`products`** CLI hoists **`argparse`** to module level.
- **Seeds**: **`beer_import`**, **`pizza_import`**, and **`wine_import`** hoist **`traceback`** to module level (CLI error handler).
- **Seeds**: **`migrate_provider_tokens`** hoists **`shutil`** and **`uuid4`** imports to module level.
- **Seeds**: **`update_wine_details`** imports **`requests`** and **`API_ENDPOINT` / `HEADERS` / `COOKIES`** at module level instead of inside the per-product loop.
- **Seeds**: **`wine_import`** drops a redundant inner **`import re`** (module already imports **`re`** at top level).
- **Docs**: **`0004-deployment.md`** HTTPS **`config.env`** snippet uses **`yourdomain.com`** instead of **`example.com`** for API / WS / CORS origins.
- **Env examples**: **`.env.example`** login placeholders use **`@your-restaurant.com`**; **`config.env.example`** CORS / **`PUBLIC_APP_BASE_URL`** comments avoid **`example.com`**.
- **Docs**: `0005-email-sending-options.md` SendGrid/Resend example snippets use **`guest@yourrestaurant.com`** instead of **`customer@example.com`**.
- **Docs**: `AGENTS.md` documents optional `ssh amvara9` access from the configured dev machine for production diagnostics; reservation-email troubleshooting doc updated accordingly.

### Added

- **Scripts**: **`scripts/start-go-ahead-loop-background.sh`** — starts **`go-ahead-loop.sh`** with **`nohup`**, records **`.go-ahead-loop.pid`** (gitignored); same env vars as the main loop.
- **Scripts**: **`scripts/go-ahead-loop.sh`** — opt-in long run (default **~8h**): **`git pull --rebase --autostash`**, Docker **pytest** + **`npm run test:landing-version`** on an interval (no auto-commits; **`commit-hash.ts`** stays manual/agent). Requires **`GO_AHEAD_LOOP=1`**; log defaults to **`.go-ahead-loop.log`** (gitignored). Documented in **`docs/testing.md`**; **`AGENTS.md`** points to it for long-running smokes.
- **Orders – unmark paid**: Staff can revert a paid order to unpaid. "Unmark paid" in the status popover clears the paid mark only; order status is restored from item statuses. Backend: `PUT /orders/{id}/unmark-paid`; permission `order:mark_paid`. i18n: `ORDERS.UNMARK_PAID` (en, es, ca, de, fr, zh-CN, hi).
- **Orders – soft-delete**: Orders can be marked as deleted (excluded from list and book-keeping) for test/cleanup. Backend: `Order.deleted_at`, `deleted_by_user_id`; migration `20260320100000_add_order_deleted_at.sql`; `DELETE /orders/{id}` (soft-delete, clears table active_order_id); permission `order:delete` (owner, admin); list, reports, and public order history exclude deleted orders. Frontend: "Delete order" button on order cards and in history grid (with confirmation); i18n: `ORDERS.DELETE_ORDER`, `DELETE_ORDER_CONFIRM`, etc.

### Changed

- **Orders – status popover**: Popover opens directly below the status button, has no animation, and uses a higher z-index so it appears above adjacent order cards.
- **Tables – canvas header**: `/tables/canvas` now shows the same header options as `/tables`: title "Tables", Floor Plan (active), List View link, Tiles/Table view links, Add Table button (focuses shape palette), and Save Layout when there are unsaved changes.

### Added

- **Orders – pre-pay (mark as paid before delivery)**: Staff can mark an order as paid on `/staff/orders` even when not all items are delivered (e.g. customer pays while kitchen is still preparing). Backend: `PUT /orders/{id}/mark-paid` no longer requires order status “completed”; it only rejects already-paid or cancelled orders. Frontend: “Mark as paid” appears in the order status dropdown for any non-paid, non-cancelled order (pending, preparing, ready, partially_delivered, completed).
- **Docs – printing when backend is outside restaurant WiFi**: `docs/PRINTING.md` describes the print-agent-on-LAN approach, options (WebSocket bridge, browser extension + native host, Node/Python agent), and references (WebApp Hardware Bridge, Ninja Printer, node-thermal-printer, etc.).

- **Tax system (IVA)**: Tax-inclusive pricing with per-line and per-rate totals on invoices. Backend: `Tax` model (name, rate_percent, valid_from, valid_to), tenant default tax, product-level tax override; order items store applied tax snapshot (tax_id, tax_rate_percent, tax_amount_cents). Spanish IVA: 10% (food/drinks immediate consumption), 21% (services), 0% (exempt). Settings: default tax dropdown, Taxes tab with CRUD; Products: tax override dropdown. Seed: `back/app/seeds/seed_spanish_taxes.py`. Migrations: `20260318100000_add_tax_system.sql`, product availability dates, provider tenant_id, `20260318130000_ensure_provider_tenant_id.sql` (idempotent repair).
- **Smoke test – sidebar navigation**: `test-settings-logo-upload.mjs` now visits every sidebar link after the logo flow and asserts no 5xx responses (catalog, tenant-products, tables, etc.).

### Fixed

- **Orders – history tab**: "Historial de Pedidos" now includes paid orders (`completedOrders` filter includes status `paid`) so paid invoices appear in the history list.
- **Kitchen/bar timer and frontend build**: Timer settings button and per-order “Waiting” timer now appear after fixing Angular template errors: use component methods instead of `Object.keys`/`Array.isArray` in templates (kitchen-display, orders, menu); optional chaining for `tenant()` in book and reservation-view. Added Puppeteer test `test-kitchen-timer.mjs` and npm script `test:kitchen-timer`.
- **Backend 500 (slowapi)**: Endpoints that return dict/list under global rate limiting now inject `response: Response` and/or return `JSONResponse` so slowapi can set rate-limit headers. Fixed for `/catalog`, `/catalog/categories`, `/catalog/{id}`, `/tenant-products`, `/tables/with-status`, tenant settings, tenant logo, and tax CRUD. **Public menu endpoints** now return `JSONResponse`: `GET /menu/{token}`, `GET /menu/{token}/order`, `GET /menu/{token}/order-history`, `POST /menu/{token}/order`, `POST /menu/{token}/order/{id}/request-payment`, `POST /menu/{token}/call-waiter`, `DELETE`/`PUT` order items, `DELETE` order (fixes 500 when opening table menu or requesting payment). Repair migration `20260318130000_ensure_provider_tenant_id.sql` ensures `provider.tenant_id` exists when schema version was applied without the column.

### Changed

- **Toasts – dismiss only on action**: Success and error toasts no longer auto-dismiss; they stay until the user closes them. Applies to Orders, Working plan, Tables, Provider dashboard, and Settings (Settings success/error toasts now have a dismiss button).
- **Orders – waiter alert shows customer message**: When a customer sends a message with “Call waiter” or “Request payment”, the staff alert banner now displays that message (in quotes) below the table name.
- **Docs – consolidation**: Removed `docs/0006-gmail-setup-instructions.md` (redundant with `docs/0018-gmail-setup.md`); all references (README, ROADMAP, config.env.example) now point to 0018. Merged `docs/0003-deploy-server.md` into `docs/0004-deployment.md`: single deployment guide with configuration (API_URL, WS_URL, CORS) and deploy steps (git pull, compose, migrations, seeds). Deleted 0003; docs index and CHANGELOG updated.

### Added

- **Rate limiting (extended)**: Public menu endpoints 30/min per IP; file uploads (tenant logo, product image, provider product image) 10/hour per user; admin/management endpoints (tenant settings, tables, providers) 30/min per user; per-order payment attempts 3/hour per IP. See `docs/0020-rate-limiting-production.md` and ROADMAP.md.

- **HAProxy SSL (amvara9) – durable certificate path**: SSL cert loaded from `./certbot/haproxy-certs` (same path used for certbot on amvara9). Compose mounts this dir into HAProxy; deploy creates `certbot/www` and `certbot/haproxy-certs` and does not overwrite certs. Workflow: `certbot certonly --webroot -w .../certbot/www`, then `cat fullchain+privkey > certbot/haproxy-certs/satisfecho.de.pem`, then `docker exec pos-haproxy kill -HUP 1`. See `certbot/README.md` and `docs/0026-haproxy-ssl-amvara9.md`.
- **Deploy**: Script run from server repo (not stdin); version inject via `front/scripts/inject-version-into-index.js`; force-remove front image before build; smoke test cache-bust and 5s delay; deploy step timeout 20 min.
- **Docs**: `docs/0026-haproxy-ssl-amvara9.md` (SSL durable setup and restore); `certbot/README.md`, `certs/README.md` (point to certbot path).

### Changed

- **HAProxy**: Bind 443 with `ssl crt /etc/haproxy/certs`; redirect HTTP to HTTPS except `/.well-known/acme-challenge`; removed `daemon` for Docker.
- **Working plan – Owner and Administrator as workers**: Owner and Administrator can be selected as the worker when adding/editing shifts. Backend: `create_shift`/`update_shift` accept `owner` and `admin`; frontend: `getUsersForSchedule()` includes owner/admin in dropdown.

### Fixed

- **Angular hydration (NG0505)**: Added `provideClientHydration(withEventReplay())` to the server app config (`app.config.server.ts`) so the server includes serialized hydration data in the response when using SSR. This removes the console warning "Angular hydration was requested on the client, but there was no serialized information present in the server response."
- **Deploy (amvara9) – front CSS / stale build**: Deploy script now builds the front image with `--no-cache` so each deploy serves assets from the current code (fixes wrong styling e.g. Settings > Opening hours). Nginx in the front container sends `Cache-Control: no-cache` for the HTML document so clients get new hashed asset URLs after deploy. See `docs/0024-deploy-css-fix-amvara9.md`.
- **Deploy (amvara9) – version not updating**: Fixed `docker compose build` flag order (`build --no-cache front`); added `up -d --force-recreate` so the front container is recreated with the new image; added a post-deploy step that prints the version served by the front container for verification.

## [2.0.8] - 2026-03-20

### Fixed

- **Public reservation – confirmation button**: Button on the confirmation page ("View or Cancel") now uses high-contrast styling (white background, dark text) so it remains readable when the tenant sets a blue or other colored public background.

## [2.0.7] - 2026-03-19

### Added

- **Tenant branding (public theme)**: Public background color (hex) and header background image for customer-facing pages. **Backend:** `Tenant.public_background_color`, `Tenant.header_background_filename`; migrations `20260319100000_add_tenant_public_background_color.sql`, `20260319110000_add_tenant_header_background.sql`; GET/POST/DELETE for header image (`/tenant/header-background`); public tenant and menu endpoints expose theme. **Frontend:** Settings > Business profile: color picker with RAL5002 (Azul) preset, header background upload and remove; book, menu, and reservation-view use tenant background color and header image (dark overlay when image set). i18n: `SETTINGS.PUBLIC_BACKGROUND_COLOR`, `HEADER_BACKGROUND`, etc. (en, es, ca, fr). See `docs/0028-tenant-public-branding.md`.
- **HAProxy self-signed certificate**: Base `docker-compose.yml` mounts `./haproxy/certs` (contains `default.pem`) so HAProxy can bind 443 without a real certificate. Fixes "unable to stat SSL certificate" when `certbot/haproxy-certs` is missing. Production override still uses `certbot/haproxy-certs`. See `haproxy/certs/README.md`.
- **Cursor rule – commit/changelog/version**: `.cursor/rules/commit-changelog-version.mdc` reminds to review CHANGELOG, README, and docs on "commit" and to bump version when changelog has substantial changes.
- **Smoke test – amvara9**: `front/scripts/test-amvara9-smoke.mjs` for amvara9 smoke runs.

## [2.0.6] - 2026-03-18

### Added

- **Cost price and profit**: Optional cost price per product for profit calculation. **Backend:** `cost_cents` on Product, TenantProduct, and OrderItem (snapshot when item is added); migration `20260318150000_add_product_cost_cents.sql`; product/tenant-product CRUD and order item creation accept and store cost; when adding from catalog, cost defaults from provider price; sales reports and CSV/Excel export include total cost, total profit, and per-product/category/table/waiter cost and profit. **Frontend:** Products form and table: cost price field and column; Reports: Total cost and Total profit summary cards, Cost and Profit columns in by-product/category/table/waiter when cost data exists; i18n for cost/profit labels (en, es, ca, de, fr, hi, zh-CN).

## [2.0.5] - 2026-03-18

### Fixed

- **Tables view – 500 when assigning waiter or activating table**: Rate-limited table endpoints (`PUT /tables/{id}/assign-waiter`, `POST /tables/{id}/activate`, `POST /tables/{id}/close`, `POST /tables/{id}/regenerate-pin`) now return `JSONResponse` so slowapi can inject rate-limit headers (fixes "parameter response must be an instance of starlette.responses.Response").

## [2.0.4] - 2026-03-18

### Fixed

- **Production build (TS2367)**: Cast `version` to `string` in `environment.ts` so the comparison with `'0.0.0'` is valid when the build injects the real version from package.json (fixes "This comparison appears to be unintentional because the types have no overlap" during `production-static` build).

## [2.0.3] - 2026-03-17

### Added

- **Reservations – overbooking detection and seating warnings (0025)**: Per-slot capacity checks and warnings. **Backend:** Capacity/demand helpers; `GET /reservations/overbooking-report` (per-slot metrics: over_seats, over_tables); `GET /reservations/slot-capacity` (seats/tables left for create/edit); `GET /reservations/upcoming-no-table-count` (for seat modal); create/update reservation returns 400 when slot would be over capacity; `GET /reservations/next-available` uses capacity (party_size param) instead of "first empty slot"; `GET /tables/with-status` includes `upcoming_reservation` per reserved table; reports payload adds `reservations.overbooking_slots_count`. **Frontend:** Reservations list shows "Overbooked" badge for over-capacity slots; create/edit shows seats left and tables left, keeps form open on 400; seat modal shows "You have N upcoming reservation(s) today with no table assigned" and per-table "Table X has an upcoming reservation at HH:MM (Name). Seat here anyway?"; reports show Overbooked slots card when count > 0. i18n: `RESERVATIONS.OVERBOOKED`, `SEATS_LEFT`, `TABLES_LEFT`, `UPCOMING_NO_TABLE`, `TABLE_UPCOMING`; `REPORTS.OVERBOOKING_SLOTS` (en, es). See `docs/0025-reservation-overbooking-detection.md`.

## [2.0.2] - 2026-03-17

### Added

- **Dashboard – Working plan card**: Quick-action card for Working plan (shift schedule) on the dashboard, with title and description from i18n.
- **Reports – revenue graph over time**: On `/reports`, a **Revenue over time** chart shows daily revenue as an SVG line chart with gradient area fill. Uses existing `summary.daily` data; Y-axis shows formatted currency (max, mid, zero), X-axis shows first/middle/last date. i18n: `REPORTS.REVENUE_OVER_TIME` (en, de, es, fr, ca, zh-CN, hi).
- **Tables – reassign orders and reservations when deleting**: Deleting a table that has orders no longer only blocks with an error. The UI offers to **reassign** its orders and reservations to another table, then delete. List and canvas table views: when delete returns 400 ("has orders"), a modal opens to choose the target table and confirm **Reassign and delete**. i18n: `TABLES.REASSIGN_AND_DELETE_TITLE`, `REASSIGN_AND_DELETE_MESSAGE`, `REASSIGN_TO_TABLE`, `REASSIGN_AND_DELETE`, `VIEW_TILES`, `VIEW_TABLE` (en, de, es, fr, ca, zh-CN, hi).
- **Tables – view mode persisted**: Tiles/table view preference is stored in `localStorage` and restored on load; view toggle buttons have icons and titles.
- **Tables – inline edit**: Table list inline edit supports floor dropdown and seat count in separate cells; layout adjusted for clarity.
- **App – dev favicon**: In development, the app uses a white favicon (`favicon-dev.svg`) to distinguish from production.
- **Working plan and opening hours – i18n (all locales)**: `WORKING_PLAN` section and `SETTINGS.PERSONNEL_PER_SHIFT`, `STAFF_*` added in ca, es, fr, hi, zh-CN; `NAV.WORKING_PLAN`, `DASHBOARD.WORKING_PLAN_TITLE` / `WORKING_PLAN_DESC` where missing.
- **.env.example**: Comments for test credentials (`LOGIN_EMAIL`, `LOGIN_PASSWORD`, `TENANT_ID`) for Puppeteer and other scripts.
- **Docs**: `docs/0022-oauth-social-login-notes.md` (OAuth/social login design notes).
- **Puppeteer**: `front/scripts/test-settings-logo-upload.mjs` for settings logo upload; `test-tables-page.mjs` improvements.

## [2.0.1] - 2026-03-17

### Added

- **Working plan (shift schedule) – full feature (0021)**: Shift CRUD with opening-hours alignment, personnel-per-shift in Settings (bar, waiter, kitchen, receptionist), owner notification (* in sidebar when staff update the plan), time step (30 min / 1 h), and "use any hour" option for cleaning. Schedule access for owner, admin, kitchen, bartender, waiter, receptionist. Backend: `Shift` model, GET/POST/PUT/DELETE `/schedule`, GET `/schedule/notification`; tenant fields `working_plan_updated_at` / `working_plan_owner_seen_at`. Frontend: `/working-plan` week view, add/edit/delete modal. See `docs/0021-working-plan.md`.
- **Working plan – suggested date**: When adding a shift, the form suggests the next open day with a free slot for the current user's role; closed days (e.g. Monday) are skipped. Owner/admin see the first day with any role gap; fallback is the first open day of the week. Current user is pre-selected when in the schedule list.
- **Working plan – toast notifications**: Success toasts on create ("Shift saved."), update ("Shift updated."), delete ("Shift removed."); error toasts with API message (e.g. role restriction). i18n: `WORKING_PLAN.SAVED`, `UPDATED`, `SAVE_FAILED`, `DELETED`, `DELETE_FAILED` (en, de).
- **AGENTS.md – compilation errors rule**: MUST ALWAYS DO rule: when working on the frontend, always check `docker compose logs --tail=80 front` for TypeScript/Angular build errors before concluding a change is done.

### Changed

- **Working plan – owner seen**: The asterisk (*) next to "Working plan" in the sidebar is cleared when the owner visits the page; backend now commits the "seen" timestamp after `_mark_working_plan_seen_by_owner` in GET `/schedule`.
- **Backend – shift assignment**: Receptionist can be assigned to shifts; `create_shift` allows kitchen, bartender, waiter, and receptionist (error message updated).
- **Docs**: `docs/0021-working-plan.md` added (implementation plan and status); `docs/0023-prioritisation-019-022.md` marks 0021 as Done; `docs/testing.md` Working plan test described as schedule roles (owner, admin, kitchen, bartender, waiter, receptionist).

### Fixed

- **Working plan – confirmation modal**: Fixed NG8002 (removed invalid `[open]` and other bindings on `app-confirmation-modal`; use conditional render and correct inputs).
- **Settings – setStaffRequired**: Method accepts `string` for role key to fix template type error; cast internally.
- **Working plan – DayHours**: Interface moved above `@Component` so the class is correctly decorated (fixes "Decorators are not valid here" build error).
- **Working plan – getApiErrorMessage**: Centralised API error extraction (string or validation array) for toast and form error.

## [1.0.15] - 2025-03-16

### Added

- **Testing docs – known issues and follow-up**: `docs/testing.md` now has a **Known issues and follow-up (to address later)** section: test-provider-register (unknown state), debug-reservations-public (422/time validation), login tests hitting 429 when run in quick succession, and no test data cleanup for provider/restaurant registration. Coverage summary table includes Kitchen display; cross-reference §5 → §4 fixed.

- **Rate limiting**: API rate limits per the security roadmap: global 100 req/min per IP; login `POST /token` 5 per 15 minutes; register `POST /register` and `POST /register/provider` 3 per hour; payment endpoints 10/min. Uses slowapi + Redis (in-memory fallback when Redis is down). Client IP from `X-Forwarded-For` when behind proxy. Each 429 is logged (path, method, client). Login page shows "Too many login attempts. Please try again later." on 429. Env: `RATE_LIMIT_ENABLED`, `RATE_LIMIT_REDIS_URL`, `RATE_LIMIT_*` (see `docs/0020-rate-limiting-production.md`). Tests: `test:rate-limit` (API, 429 after limit), `test:rate-limit-puppeteer` (Puppeteer, login 6 wrong attempts → error banner).
- **Reservations – no-show feature (standing out)**: Because “they didn’t show” deserved its own status. Staff can **mark as no-show** (with confirmation), freeing the table and recording the outcome instead of pretending it was a cancellation. Filter and badge for no-shows; optional **Send reminder** for booked reservations with an email (SMTP required). Backend: `ReservationStatus.no_show`, status handler clears `table_id`; `POST /reservations/{id}/send-reminder`; `send_reservation_reminder` in email service. i18n: STATUS_NO_SHOW, NO_SHOW, SEND_REMINDER, etc. (en, de, es, fr, ca, zh-CN, hi). The one feature that admits your guests are human.
- **No-show – implementation plan**: `docs/0019-no-show-implementation-plan.md` documents goals, what was implemented, step-by-step implementation plan (backend model/API/email, frontend, i18n), optional extensions (reports, view link in reminder, scheduled reminders), and a checklist. README Documentation table updated with link to the new doc.
- **Reports – reservations by status**: Sales report now includes reservation counts by status (booked, seated, finished, cancelled, no_show). Backend: `reservations_summary.by_status` in `_build_report_payload`; Excel export Reservations sheet includes Status/Count rows. Frontend: Reports page shows “Reservations – By status” block with translated labels; `SalesReport.reservations.by_status` and `getReservationStatusLabel()`. i18n: `REPORTS.RESERVATIONS_BY_STATUS` (en, de, es, fr, ca, zh-CN, hi).
- **Products page – search**: On `/products`, a search input above the category filters lets you filter the product list by name, ingredients, description, category, or subcategory (case-insensitive, live as you type). Works together with the existing category/subcategory ribbons. i18n: `PRODUCTS.SEARCH_PLACEHOLDER` (en, de, es, fr, ca, zh-CN, hi).
- **Per-tenant SMTP / email settings**: Restaurant owners can configure their own SMTP (host, port, TLS, user, password, from address/name) in **Settings → Email (SMTP)**. If left empty, the app uses the global SMTP from `config.env`. Backend: new optional fields on `Tenant` and `TenantUpdate`; GET/PUT `/tenant/settings` read and update them (password masked in responses). Email service uses tenant config when both `smtp_user` and `smtp_password` are set, otherwise falls back to global. Migration `20260316150000_add_tenant_smtp_email.sql`. i18n: `SETTINGS.EMAIL_SETTINGS`, `SMTP_*`, `EMAIL_FROM*` (en).
- **Gmail setup guide**: `docs/0018-gmail-setup.md` – step-by-step: create Gmail account, enable 2FA, create App Password at myaccount.google.com/apppasswords, then enter Gmail and password in **POS → Settings → Email (SMTP)**.
- **SMTP debug script**: `back/scripts/debug_smtp.py` – minimal script that parses `config.env` (handles passwords with apostrophes when wrapped in double quotes), tests SMTP connection, and optionally sends a test email. Run: `PYTHONPATH=back python back/scripts/debug_smtp.py [to_email]` from repo root, or pipe `config.env` into the back container.
- **Products – category labels from i18n**: On `/products`, the main category names (Starters, Main Course, Desserts, Beverages, Sides) are now translated. Added `PRODUCTS.CATEGORY_STARTERS`, `CATEGORY_MAIN_COURSE`, `CATEGORY_DESSERTS`, `CATEGORY_BEVERAGES`, `CATEGORY_SIDES` in en, de, es, ca, fr, zh-CN, hi. Category filter pills, dropdowns, table column, and Categories tab use the translated labels; stored values remain in English.
- **Supply chain hardening (npm)**: Pinned all dependency versions in `front/package.json` and the lockfile root to exact versions (no `^`/`~`). Added `front/.npmrc` with `save-exact=true` and `ignore-scripts=true` so new deps are pinned and install lifecycle scripts never run. Dockerfiles (`front/Dockerfile`, `front/Dockerfile.prod`) now copy `.npmrc` and use `npm ci --ignore-scripts`.
- **French (Français) locale**: New language for Morocco and Francophone users. Added `fr` to supported languages (label "Français", locale fr-FR) and full translation file `front/public/i18n/fr.json`. Language picker and app UI available in French.
- **Translations**: Review of remaining locales (de, es, ca, hi, zh-CN): removed English-only strings (e.g. Dashboard → Übersicht, Website → Webseite in German; Balance → Saldo, Stock → Existencias in Spanish), added missing keys (COMMON, MENU, ORDERS, REPORTS, RESERVATIONS, KITCHEN_DISPLAY, SETTINGS where needed), and localized placeholders (e.g. yourbusiness → example/udaharan where appropriate).
- **Invoice – open source footer**: Printed invoices (Print invoice / Print Factura) now show a small grey line at the bottom: "Open source · Made with ♥ in Barcelona and Mexico", GitHub repo URL (plain text for print), app version, and commit hash. A separator line above this block matches the total-row line; spacing is symmetric. Styled in 9px grey. i18n: `ORDERS.INVOICE_FOOTER`, `ORDERS.INVOICE_OSS_PREFIX` (en, es, ca, de, hi, zh-CN).
- **Tables – confirm before closing** ([#18](https://github.com/satisfecho/pos/issues/18)): Clicking "Close Table" now opens a confirmation modal ("Close table \"…\"? This will end the current session.") with Confirm and Cancel. On confirm, the table is closed and a success snackbar ("Table closed.") is shown. i18n: `TABLES.CLOSE_TABLE_CONFIRM`, `TABLES.TABLE_CLOSED` (en, de, es, fr, ca, zh-CN, hi).
- **Login and register – language selector** ([#16](https://github.com/satisfecho/pos/issues/16)): The login and create-account (register) pages now include the same language dropdown as the rest of the app, in the top-right of the auth card header, so users can switch language before signing in or creating an account.
- **Password confirmation and show/hide** ([#17](https://github.com/satisfecho/pos/issues/17)): Registration (tenant and provider) and user create/edit now have a "Confirm password" field; both fields must match before submit. All password inputs (login, register, provider login/register, Users modal) have an eye icon to toggle visibility. i18n: `AUTH.CONFIRM_PASSWORD`, `AUTH.PASSWORDS_DO_NOT_MATCH`, `AUTH.SHOW_PASSWORD`, `AUTH.HIDE_PASSWORD`; `USERS.CONFIRM_PASSWORD`, `USERS.PASSWORDS_DO_NOT_MATCH`, `USERS.SHOW_PASSWORD`, `USERS.HIDE_PASSWORD` (en, de, es, ca, fr, zh-CN, hi).
- **Reservations – email field**: The table reservation (book a table) page and staff reservations now include an optional **Email** field. Public booking form, success confirmation, and view-by-token page show it when provided; staff list and create/edit modal display and persist it. Backend: `customer_email` on `Reservation`, `ReservationCreate`, `ReservationUpdate`; migration `20260316160000_add_reservation_customer_email.sql`. i18n: `RESERVATIONS.CUSTOMER_EMAIL` (en, de, es, ca, fr, zh-CN, hi).
- **Opening hours – copy to other days and summary**: In **Settings → Opening hours**, a "Copy from [day]" dropdown and **Copy to other days** button copy one day’s hours to all others. A formatted summary (e.g. "Mon–Fri 09:00–22:00, Sat 10:00–20:00, Sun closed") is shown above the grid. Public tenant API now returns `opening_hours` so the book page can display them. i18n: `SETTINGS.COPY_FROM_DAY`, `SETTINGS.COPY_TO_OTHER_DAYS`, `BOOK.OPENING_HOURS` (en, de, es, ca, fr, zh-CN, hi).

### Changed

- **ROADMAP and README – customer accounts**: Customer accounts (end-customer registration, login, email verification, MFA, order history, customer-facing invoices) are now listed under **Completed** in [ROADMAP.md](ROADMAP.md). README planned list and Roadmap section no longer list them as planned; docs table entry for `docs/0002-customer-features-plan.md` describes the implemented scope.
- **Opening hours summary – localized**: The opening hours summary in **Settings → Opening hours** and the opening hours text on the public book page now use the current UI language: short day names (e.g. Lun, Mar, Mié in Spanish; Mon, Tue, Wed in English) via `Intl.DateTimeFormat`, and the word "closed" from `SETTINGS.CLOSED` (e.g. Cerrado, Closed, Geschlossen).
- **Opening hours and reservation time – 15-minute steps, 24h format**: Settings opening hours and the book (reservation) page now use time selectors with minutes **0, 15, 30, 45** only, in European 24h format (e.g. 20:00). Settings: time inputs replaced by dropdowns; existing values are rounded to the nearest quarter hour. Book page: time is a dropdown, default **20:00**; opening hours are shown in the hero when set. Next-available reservation slot API returns 15-minute slots.
- **Kitchen display**: On `/kitchen`, only orders that have at least one item in **pending** or **preparing** are shown; within each order only those items are listed (ready/delivered/cancelled lines are hidden). Status badge and dropdown buttons use the same size as on the Orders page (min-height 44px / 48px) for thumb-friendly tapping.
- **Documentation**: Merged `GEMINI.md` into `AGENTS.md`. Agent instructions now include project overview, architecture, setup & development (quick start, manual commands), development conventions, and key URLs in a single file.

### Fixed

- **Logout – single click and land on login view** ([#19](https://github.com/satisfecho/pos/issues/19)): Clicking "Close session" (logout) now logs out and navigates to the landing/login view in one click. Previously the app cleared auth state only after the logout request completed, while navigation ran immediately, so the landing page still saw a valid session and redirected back to the dashboard; a second click was needed. Now local state is cleared immediately and navigation runs after the server has processed logout. Same behaviour for provider dashboard logout.
- **Products – waiter cannot add/edit** ([#20](https://github.com/satisfecho/pos/issues/20)): Users without `product:write` (e.g. waiter) no longer see the "Add product" button. When they open a product (Edit), the form is read-only with the message "Only owners can edit products."; all inputs and the Save button are disabled, image upload is hidden, and Delete is not shown. Inline category/subcategory editing is disabled for non-editors. i18n: `PRODUCTS.ONLY_OWNERS_CAN_EDIT` (en, de, es, fr, ca, zh-CN, hi).
- **Products form – validation feedback** ([#15](https://github.com/satisfecho/pos/issues/15)): When adding or editing a product, submitting without a name or without a valid price now shows clear feedback: required fields are marked with an asterisk, a banner message asks to fill name and price, and inline errors appear under the name and price fields. Errors clear when the user corrects each field. i18n: `PRODUCTS.FILL_REQUIRED_FIELDS`, `PRODUCTS.NAME_REQUIRED`, `PRODUCTS.PRICE_REQUIRED` (en, de, es, fr, ca, zh-CN, hi).
- **Backend – config.env loading on reload**: Settings now load env files only from absolute paths under the project root, and only include paths that exist. This prevents `FileNotFoundError: config.env` when the backend reloads (e.g. after file changes) and the subprocess has a different working directory.

### Removed

- **GEMINI.md**: Removed; content merged into `AGENTS.md`.

## [1.0.14] - 2026-03-16

### Added

- **Billing customers (Factura)**: Register customers that require a tax invoice (Factura) with company details. New **Customers** section at `/customers`: add, edit, search by name, company, tax ID, or email. From **Orders** (active, not paid, or history): **Print Factura** opens a modal to select a billing customer; the printed invoice includes a "Bill to" block with company name, tax ID, address, and email. Optionally save the selected customer on the order for future reference. Backend: `BillingCustomer` model, `GET/POST/PUT/DELETE /billing-customers` with search, `PUT /orders/:id/billing-customer`; migration `20260316140000_add_billing_customer.sql`. Permissions: `billing_customer:read` / `billing_customer:write`. i18n: `CUSTOMERS.*`, `NAV.CUSTOMERS` (en, es, ca, de, zh-CN, hi). See `docs/0017-billing-customers-factura.md`.

### Changed

- **Sidebar and dashboard order**: Most-used options first: **Orders**, **Reservations**, **Tables**, **Kitchen display**, **Beverages display** (bar view, same route as kitchen), then Customers, Products, Catalog, Reports, etc. Dashboard quick-action cards follow the same order.
- **Dashboard Help section**: Friendlier, inviting copy (“Need help?”, “We’re here for you…”) and new line encouraging users to start a discussion for enhancements or open an issue. Light gradient background and clearer call-to-action. i18n: `DASHBOARD.HELP_TITLE`, `HELP_DESC`, `HELP_INVITE` (en, es, ca, de, zh-CN, hi).
- **Kitchen display – clickable item status**: On `/kitchen`, the item status badge (e.g. "Preparando") is now clickable for users with `order:item_status`. Clicking it opens the same status dropdown as on the Orders page (Move forward / Go back), so kitchen staff can advance items to "Ready" (Listo) or move them back without leaving the kitchen view. Uses the same transition logic and API as the Orders page.

## [1.0.13] - 2026-03-16

### Added

- **Settings – Tax ID and CIF**: In Settings → Contact, tenants can set **Tax ID / VAT** and **CIF / NIF** (e.g. for Spanish CIF). Values are stored in the database (migration `20260316120000_add_tenant_tax_id_cif.sql`) and included on printed invoices.
- **Orders – Print invoice**: Each order card on `/orders` has a **Print invoice** button. Clicking it opens a new window with a print-optimized invoice (business name, logo, address, Tax ID, CIF, order number, date, table, customer, line items, total) and triggers the browser print dialog so staff can print or save as PDF for customer handover. i18n: `ORDERS.PRINT_INVOICE`, `ORDERS.INVOICE`, `ORDERS.INVOICE_FOOTER` (en, es).

## [1.0.12] - 2026-03-15

### Added

- **Demo orders on virgin deploy**: Bootstrap now runs `seed_demo_orders` so tenant 1 gets paid and active orders (spread over ±90 days, biased to last 30). Reports (Informes) show meaningful revenue, by product, by table, etc. without manual seeding. New seed `back/app/seeds/seed_demo_orders.py` (idempotent: runs only when tenant 1 has no orders). `back/run_seeds.sh` supports `--demo-orders` to run the seed manually.

## [1.0.11] - 2026-03-15

### Added

- **Bartender role**: New user role for staff who prepare drinks and beverages. Same permissions as kitchen (order:read, order:item_status, product/catalog read); can access Orders and Kitchen display. Backend: `UserRole.bartender` in `models.py`, permissions in `permissions.py`; migration `20260315130000_add_bartender_role.sql` adds enum value. Frontend: role in Users (create/edit), i18n in all locales. Puppeteer test: `test:bartender-role` (admin/owner → Users → Add user → role dropdown includes Bartender). See `docs/testing.md` §12.

### Fixed

- **Product images on /products**: Demo products (from `seed_demo_products`) had no images. New seed `link_demo_products_to_catalog` runs after catalog imports (beer, pizza, wine) and links tenant products without images to provider products that have images. `GET /products` then backfills `Product.image_filename` from the catalog when staff load the Products page. Deploy script runs the seed automatically; on existing installs run `docker compose exec back python -m app.seeds.link_demo_products_to_catalog` then reload `/products`. See `back/app/seeds/link_demo_products_to_catalog.py`.

## [1.0.10] - 2026-03-15

### Added

- **Reports – average payment per client**: New KPI in the Reports (Informes) summary: average revenue per order (total revenue ÷ number of orders), shown as "Average payment per client" in a summary card. Backend: `average_revenue_per_order_cents` in `GET /reports/sales` summary. i18n for all locales (en, es, de, ca, hi, zh-CN).

## [1.0.9] - 2026-03-15

### Added

- **Reports – reservation stats**: Reports page now shows total reservations in the date range and breakdown by source (Public book page vs Staff). Source is inferred from reservation token (token set = public, no token = staff). Summary card and "By source" block; Excel export includes a Reservations sheet.
- **Dashboard sections** (`/dashboard`): Quick-action cards for Catalog, Reservations, Kitchen display, Reports, Inventory, Users, and Configuration. Reports, Inventory, Users, and Configuration are shown only to owner/admin; Catalog, Reservations, and Kitchen display are shown to all authenticated staff with route access.
- **Dashboard Help section**: Links to [GitHub Issues](https://github.com/satisfecho/pos/issues) and [GitHub Discussions](https://github.com/satisfecho/pos/discussions) for documentation and support. i18n for all new dashboard labels (en, es, de, ca, hi, zh-CN).

### Changed

- **Reports payload**: API `GET /reports/sales` and export now include `reservations: { total, by_source: [{ source, count }] }`. Reports empty state refined so summary and reservation stats are always visible; sales sections only when there are orders.

## [1.0.8] - 2026-03-15

### Added

- **Reports (Sales & Revenue)** (`/reports`): New section for restaurant owners and admins. Sales by date range (from/to), summary (total revenue, order count, daily series), by product, by category, by table, and by waiter. Simple CSS bar charts; export to CSV or Excel (full workbook). Uses existing order and product data (paid/completed orders only). Permission `report:read` for owner and admin. Backend: `GET /reports/sales`, `GET /reports/export`; dependency `openpyxl` for Excel. See [docs/0016-reports.md](docs/0016-reports.md).
- **Smoke tests required (AGENTS.md)**: New section stating that smoke tests are **required** after every new feature, fix, or code change; minimum (curl or landing test) and flow-specific tests (e.g. `npm run test:reports`).
- **Puppeteer test**: `test:reports` — login as owner/admin, open `/reports`, assert page and date range load. Script `front/scripts/test-reports.mjs`; npm script `test:reports`. Documented in `docs/testing.md`.

### Changed

- **Sidebar**: Reports link (chart icon) for users with report access (owner/admin).

## [1.0.7] - 2026-03-15

### Added

- **Migration `20260314000000_add_user_provider_id.sql`**: Adds `user.provider_id` and `user_role` value `'provider'` (required for provider portal login/register). Tracked in repo for deploy consistency.
- **CI/CD amvara9 doc**: Sections on login/register 500 (migrations to run), demo login (ralf@roeber.de) and how to restore it, and that deploy does not run `remove_extra_tenants`.

### Changed

- **remove_extra_tenants seed**: Docstring WARNING that it deletes all users of removed tenants (e.g. demo account); not run by deploy; how to restore demo login or use set_user_password.
- **deploy-amvara9.sh**: Comment clarifying the script does not run `remove_extra_tenants` and that that seed deletes other tenants and their users.

## [1.0.6] - 2026-03-15

### Added

- **Kitchen display** (`/kitchen`): Dedicated full-screen view for the kitchen — large, readable order cards; auto-refresh every 15 seconds and live updates via WebSocket; optional sound on new orders (toggle persisted in localStorage). Read-only: shows active orders (pending, preparing, ready, partially_delivered) with table, items, and item status. Access: same roles as Orders (owner, admin, kitchen, waiter, receptionist). Nav link "Kitchen display" in sidebar. i18n: EN, DE, ES, CA. See [docs/0015-kitchen-display.md](docs/0015-kitchen-display.md).

## [1.0.5] - 2026-03-15

### Added

- **Provider dashboard**: List and tile view toggle plus search (by name, catalog name, external ID) on `/provider`.
- **Company details toast**: Success toast "Company details saved." after saving provider company details.
- **Puppeteer test**: `test:provider-add-product` (login as provider, add product, assert it appears in list). Migration `20260315100000_add_provider_company_fields.sql` for provider table company/bank columns.

### Fixed

- **Provider create product 500**: Endpoint returns `model_dump(mode="json")` and wraps in try/except so DB/serialization errors return a clear 500 message.
- **Landing provider links test**: Navigate by URL to `/provider/register` instead of waiting for client-side navigation after click (fixes timeout with Angular routing).

## [1.0.4] - 2026-03-15

### Added

- **Provider portal**: Providers can register and log in to manage their catalog. New routes: `/provider/login`, `/provider/register`, `/provider` (dashboard). Provider users have `provider_id` on `User`; JWT supports `provider_id` for provider-scoped auth. API: `POST /register/provider`, `POST /token?scope=provider`, `GET/PUT /provider/me`, `GET/POST/PUT/DELETE /provider/products`, `POST /provider/products/:id/image`, `GET /provider/catalog`. Landing page footer includes a "Provider portal" link. `provider.guard.ts` and provider routes in `app.routes.ts`.
- **Provider registration company details**: Registration and profile support full company name, address, tax number, phone, company email, and bank details (IBAN, BIC, bank name, account holder). `PUT /provider/me` updates company details; dashboard shows a "Company details" section and edit modal.
- **Catalog on deploy**: Deploy script runs beer, pizza, and wine catalog imports so production (amvara9) has the same catalog as development. Deploy ensures `back/uploads` is writable by the back container (uid 1000) so import images are saved.
- **Puppeteer tests**: `front/scripts/test-catalog.mjs` (npm `test:catalog`) for catalog page and image loading; `test-order-8-status.mjs` (npm `test:order-8-status`) for order status dropdown on a given order; `test-register-page.mjs` (npm `test:register-page`) for register page "Who is this for?" explanation; `test-landing-provider-links.mjs` and `test-provider-register.mjs` for provider portal flows.
- **Register page explanation**: "Who is this for?" block on `/register` clarifying that the form is for restaurant/business owners (providers), not for guests. Guest hint: use "Book a table" or "Enter table code" on the homepage. i18n keys `REGISTER_WHO_IS_THIS_FOR`, `REGISTER_FOR_PROVIDERS`, `REGISTER_GUEST_HINT` in en, de, es, ca, zh-CN, hi.
- **Git hooks**: `scripts/git-hooks/prepare-commit-msg` strips Cursor/agent attribution from commit messages; `scripts/install-git-hooks.sh` installs hooks from `scripts/git-hooks/` into `.git/hooks/`.
- **Documentation**: `docs/0014-provider-portal.md` for provider portal; `docs/testing.md` for testing notes.

### Changed

- **Mark as paid**: `PUT /orders/{order_id}/mark-paid` now uses computed order status from items (all active items delivered) instead of stored `order.status`, so completed orders can be marked paid even when DB status was out of sync. Stored status is synced to `completed` before setting to `paid`. See `docs/0008-order-management-logic.md` edge case.
- **Order status dropdown**: `getOrderStatusTransitions` and `getItemStatusTransitions` normalize status with `(currentStatus ?? '').toString().toLowerCase()` so the transition map always matches; fixes pending orders not showing "Preparing" when status came in a different casing or type.
- **AGENTS.md**: Updates for provider tests and hooks as needed.

### Fixed

- **Nginx production**: `location ^~ /api/` so that `/api/uploads/.../image.jpg` is proxied to the backend instead of being handled by the static-asset regex (which was returning 404 for catalog images).
- **beer_import --clear**: Use `session.execute(text(...))` for raw SQL when checking tenant product references; `session.exec()` is for ORM only.

### Migration (existing DBs)

- **User.provider_id**: `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS provider_id INTEGER REFERENCES provider(id);`
- **user_role enum**: For provider registration to work, add the new value:  
  `ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'provider';`  
  (PostgreSQL; without this, provider registration returns 500.)
- **Provider company fields**: For provider registration/company details to persist, add columns to `provider` (PostgreSQL):  
  `ALTER TABLE provider ADD COLUMN IF NOT EXISTS full_company_name VARCHAR; ALTER TABLE provider ADD COLUMN IF NOT EXISTS address VARCHAR; ALTER TABLE provider ADD COLUMN IF NOT EXISTS tax_number VARCHAR; ALTER TABLE provider ADD COLUMN IF NOT EXISTS phone VARCHAR; ALTER TABLE provider ADD COLUMN IF NOT EXISTS email VARCHAR; ALTER TABLE provider ADD COLUMN IF NOT EXISTS bank_iban VARCHAR; ALTER TABLE provider ADD COLUMN IF NOT EXISTS bank_bic VARCHAR; ALTER TABLE provider ADD COLUMN IF NOT EXISTS bank_name VARCHAR; ALTER TABLE provider ADD COLUMN IF NOT EXISTS bank_account_holder VARCHAR;`

## [1.0.3] - 2026-03-14

(No notable changes.)

## [1.0.2] - 2026-03-14

### Added

- **Landing page version bar**: Footer shows app version and commit hash (from environment). Puppeteer test `front/scripts/test-landing-version.mjs` and npm script `test:landing-version`.
- **Products/Catalog placeholders**: When a product has no image, Products list and Catalog show a clear image-icon placeholder instead of empty/broken area; same for image load errors in Products.
- **remove_extra_tenants seed**: `back/app/seeds/remove_extra_tenants.py` keeps only the tenant named "Cobalto" (or renames tenant id=1 to Cobalto) and deletes all other tenants and their data. Used to clean amvara9 to a single Cobalto restaurant.
- **set_user_password seed**: `back/app/seeds/set_user_password.py` sets a user's password from env (`NEW_PASSWORD`, optional `USER_EMAIL`). For server/admin use (e.g. match dev password).

### Changed

- **Landing version Puppeteer test**: Uses fallback selector `.landing-version-bar` and 15s timeout for lazy route.

## [1.0.1] - 2025-03-14

### Added

- **Public landing page (`/`)**: Tenant/restaurant list with "Book a table", "Login", and "Enter table code" for ordering. Logout redirects to `/`.
- **Booking page (`/book/:id`)**: Hero header matching menu (logo, restaurant name, description, phone, email). Language selector. Extended public tenant API with `description`, `phone`, `email` and `GET /public/tenants/:id`.
- **Reservation view (`/reservation?token=...`)**: Same hero header as book/menu with restaurant branding and language selector.
- **Language selector**: On landing, booking, and menu pages. Default language from browser; `LanguageService` initialized at app bootstrap.
- **Reservation number**: Unique reservation number (#id) shown to client on booking success and on reservation view page. i18n key `RESERVATIONS.RESERVATION_NUMBER` in all locales.

## [1.0.0] - 2025-03-14

### Added

- **AVIF image upload support**: Accept AVIF format for all photo/picture uploads.
  - **Settings (tenant logo)**: File input and backend accept `image/avif`; logo upload validates and optimizes AVIF (Pillow), keeps `.avif` extension.
  - **Product details**: Product image upload accepts `image/avif` in the file picker and API; backend `ALLOWED_IMAGE_TYPES` and `optimize_image()` handle AVIF; stored filenames may use `.avif`.
  - Backend: `ALLOWED_IMAGE_TYPES` includes `image/avif`; `optimize_image()` saves AVIF with `AVIF_QUALITY`; allowed extensions for logo and product image include `.avif`.
  - Frontend: `accept` attributes updated to `image/jpeg,image/png,image/webp,image/avif` for both settings and products.
- **Table reservations**
  - **Staff**: Reservations list (`/reservations`) with filters (date, phone, status); create, edit, cancel, seat at table, finish. Table column always visible (name or "—" when not assigned). Permissions `reservation:read` and `reservation:write` for owner, admin, waiter, receptionist. Tables canvas: status "Reserved" (amber) when a reservation is assigned.
  - **End users (public)**: Book at **`/book/:tenantId`** (date, time, party size, name, phone; no login). After booking, link to **`/reservation?token=...`** to view or cancel. See `docs/0011-table-reservation-user-guide.md` for URLs and flow.
  - **API**: `POST/GET/PUT /reservations`, seat/finish/cancel; public create (with `tenant_id`), `GET /reservation/by-token`, `PUT /reservation/{id}/cancel?token=...`. Reservation responses include **`table_name`** when assigned. Table status in `GET /tables/with-status`: `available` | `reserved` | `occupied`.
- **Order history (public menu)**: Backend `GET /menu/{table_token}/order-history`; frontend menu shows order history section and `getOrderHistory()`; `OrderHistoryItem` in API service.
- **WebSocket**: Token-based auth for WS (`/ws-token`, token in URL); ws-bridge Dockerfile and main.py updates; frontend `getWsToken()` and URL handling for relative/absolute WS URLs. Script `front/scripts/test-websocket.mjs` for owner login and WS connectivity check.
- **Documentation**
  - `docs/0011-table-reservation-user-guide.md`: End-user flow, URL reference (book, view/cancel), testing steps.
  - `docs/0010-table-reservation-implementation-plan.md`: Implementation plan (existing).
  - Documentation consolidated under `docs/`: CUSTOMER_FEATURES_PLAN, DEPLOYMENT, EMAIL_SENDING_OPTIONS, GMAIL_SETUP_INSTRUCTIONS, IMPLEMENTATION_VERIFICATION, ORDER_MANAGEMENT_LOGIC, TABLE_PIN_SECURITY, TRANSLATION_IMPLEMENTATION, VERIFICATION_ALTERNATIVES (moved from repo root).
  - README rewritten: POS2 branding, features table, built-with, getting started; references to `docs/` and ROADMAP. ROADMAP updated: completed/missing features and doc references.
- **Agent / ops**
  - AGENTS.md: Docker status, port detection, log commands, reservation Puppeteer tests, demo tables seed/test instructions.
  - Frontend debug script `scripts/debug-reservations.mjs` (Puppeteer: login, create reservation, cancel). `.env` for demo credentials (gitignored); `puppeteer-core` dev dependency.
  - Public user test `scripts/debug-reservations-public.mjs` (Puppeteer: open `/book/:tenantId` without login, fill form, submit, then view/cancel by token). npm script: `debug:reservations:public`.
  - WebSocket test script `scripts/test-websocket.mjs` (Puppeteer: login, check WS connection after navigating to /orders).
  - Frontend dev proxy config `proxy.conf.json` for local API/WS proxying.
- **Demo tables**: Seed script `back/app/seeds/seed_demo_tables.py` (floor "Main" + **T01–T10** for tenant 1; idempotent). Check script `back/app/seeds/check_demo_tables.py` to verify T01–T10 exist. **Deploy** (`scripts/deploy-amvara9.sh`) runs the seed after migrations so tenant 1 always has 10 demo tables on new deployment. See AGENTS.md.
- **Demo products**: Seed script `back/app/seeds/seed_demo_products.py` (default menu for tenant 1: main courses + beverages; idempotent, no images). Deploy runs it after demo tables so the Demo Restaurant has tables and products on new deployment.
- **Puppeteer test (demo data)**: `front/scripts/test-demo-data.mjs` checks ≥10 tables, ≥10 products, and public /book/:id; use `LOGIN_EMAIL`/`LOGIN_PASSWORD` for full check. Optional `BOOK_TENANT_ID` (default 1). `npm run test:demo-data` or `node front/scripts/test-demo-data.mjs`.
- **Seeds for all tenants**: `seed_demo_tables` and `seed_demo_products` now run for every tenant that has no tables/products (not only tenant 1), so e.g. ralf@roeber.de (tenant 2) gets demo data on deploy. Table seed sets `is_active=false` for prod NOT NULL.
- **Deploy guide**: `docs/0004-deployment.md` for configuration and deploying latest master to a server (e.g. amvara8 at `/development/pos`).
- **Reservation tests (localhost + production)**: Script `scripts/run-reservation-tests.sh` runs public (and optional staff) Puppeteer reservation tests against configurable `BASE_URLS` (default: `http://127.0.0.1:4203` and `http://satisfecho.de`). See AGENTS.md.
- **CI/CD (amvara9)**: GitHub Actions workflow `.github/workflows/deploy-amvara9.yml` deploys to amvara9 on push to master/main (SSH key in repo secret `SSH_PRIVATE_KEY_AMVARA9`). Server setup: deploy key in `authorized_keys`, repo at `/development/pos`, `config.env` from example. See `docs/0001-ci-cd-amvara9.md`.

### Fixed

- **Migration 20260313150000 (tenant timezone)**: Idempotent `ADD COLUMN IF NOT EXISTS` so re-run or pre-existing column does not fail.
- **Production nginx (satisfecho.de)**: Front container’s `nginx.conf` now strips the `/api` prefix when proxying to the backend (`location /api` → `proxy_pass http://pos-back:8020/`), so the backend receives `/reservations` etc. and public reservation booking works on production.
- Reservation create "failed to create": DB columns `reservation_date` and `reservation_time` were `timestamp`; migration updates them to `DATE` and `TIME`.
- Reservations route and sidebar: Staff route `/reservations` before public `/reservation`; permission-based `reservationAccessGuard`; frontend build (Router, `minDate()`, `LowerCasePipe`).
- Reservation API: invalid date/time return HTTP 400 with clear message; parsing validates length and format.
- Reservations list: Table column always shown; API returns `table_name`; frontend shows name or "—" (`RESERVATIONS.TABLE_NOT_ASSIGNED`).
- Puppeteer test: create/cancel uses DOM form values and date filter; cancel confirmation works.
- Admin layout: main content full width (removed `max-width` on `.main`).
- API service: resolved merge (OrderHistoryItem, WebSocket URL handling); reservation and public menu APIs.
