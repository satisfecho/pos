# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions are listed **newest first**. Entries use **past tense**, one line per item where possible, and emphasize **user-visible impact**. Issue numbers in parentheses point to GitHub when they add context.

**Versioning:** [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`): incompatible API or behavior → major; backward-compatible features → minor; fixes and small improvements → patch.

## [Unreleased]

### Added

- **Marketing / Pizza Luna:** Registered **satisfecho.de/pizzaluna/es/** — manifest entry for **`087_pizzalluna`** (slug **`pizzaluna`** matches SPA **`baseHref`**; artifact **`pizzaluna-satisfecho-deploy`**; **`deploySubpath`** **`es`**).
- **Marketing / Rico Kebab:** Registered **satisfecho.de/rico-kebab/** — manifest entry for **`088_ricokebab`** (slug matches SPA **`baseHref`** `/rico-kebab/`; artifact **`rico-kebab-satisfecho-deploy`**).

### Fixed

- **Products / categories:** Staff **Products** category dropdowns and **Product categories** now always list all five standard categories (Starters, Main Course, Desserts, Beverages, Sides) even when the tenant has no products yet — `GET /catalog/categories` seeds empty subcategory lists for missing standard keys in fixed order (#263).
- **Marketing / Rico Kebab:** Corrected manifest and **`front/sites/`** slug from **`ricokebab`** to **`rico-kebab`** so paths match production **`/rico-kebab/`** and the SPA **`baseHref`** (`088_ricokebab`).
- **Marketing / Rico Kebab:** Sync **`rico-kebab-satisfecho-deploy`** into **`front/sites/rico-kebab/es/`** (manifest **`deploySubpath`**) so **`/rico-kebab/es/`** serves the current bundle instead of a stale root-only sync (`088_ricokebab` #2).
- **Marketing / Boss Kebab:** Restored **satisfecho.de/bosskebabypizzeria/** — `baseHref` and deploy paths now match the live slug so Angular scripts and styles load instead of 404 (blank page) after marketing build and amvara9 sync (`085_Bosskebabypizzeria` #1).

### Changed

- **Marketing / Wimpi:** Updated Google reviews copy on **satisfecho.de/wimpi/es/** — **4,8 / 5 · 239 valoraciones** (was 4,7 / 102) to match the current Google listing after marketing build and amvara9 deploy (`083_wimpi` #2).
- **Agent loop:** Per-step wall-clock limits on **`cursor-agent`** in **`agents2/pos-cursor-loop.sh`** (default **25** minutes; tester **32** minutes for deploy polling) so a hung step does not block the whole cycle — on timeout the orchestrator logs and continues; **`TESTING-`** / **`WIP-`** tasks are retried on the next pass. Disable with **`AGENT_CURSOR_TIMEOUT=0`**.
- **Marketing / Gustazo:** Removed gallery image **`local-04`** from live **satisfecho.de/gustazo/** after **`gustazo-dist`** bundle sync (`040_gustazo` #1).
- **Agent tasks:** **`move-agent-task-to-done.sh`** now parses **`CLOSED-MKT-<repo>-<issue>-…`** filenames when archiving marketing tasks to **`agents2/tasks/done/`**.
- **Release / production:** Promoted **`development` → `master`** and confirmed green **Deploy to amvara9** on production (**satisfecho.de**) — live **2.1.4** at merge **`41bc798a`** (#261).
- **Marketing / Wimpi:** Mobile opening-hours layout on **satisfecho.de/wimpi/es/** — short weekday labels (LUN–DOM), wrapped rows on narrow viewports, full names from 720px up (`083_wimpi` #1).
- **Agent loop:** Added **005 marketing repos reviewer** — preflight scans **`satisfecho/NNN_slug`** org repos for new sites, bundle updates, and untracked issues; registers **`config/marketing-sites.json`** and **`front/sites/<slug>/`**, can trigger **Deploy to amvara9**, and queues **`FEAT-MKT-*`** tasks for the feature coder. Wired into **`agents2/pos-cursor-loop.sh`** with gating env vars; **`010-feature-coder.md`** documents marketing-repo work.

## [2.1.4] - 2026-06-01

### Fixed

- **Products / subcategories:** Custom subcategories added on **Products → Categories** now persist after reload and appear in the product add/edit and bulk-import subcategory dropdowns for that category (#260).

## [2.1.3] - 2026-06-01

### Fixed

- **Products:** Image upload failures (e.g. file too large) now show an inline error in the add/edit form instead of only in the browser network tab (#259).
- **Settings / tenant purge:** **Delete restaurant permanently** now commits the database transaction — previously the API returned success but the tenant was rolled back and remained in the database.

### Changed

- **Image uploads:** Raised server and client upload limit from 2MB to **5MB** for product images and tenant logos; larger files are still compressed after upload via existing Pillow optimization (#259).

## [2.1.2] - 2026-06-01

### Changed

- **Public menu:** Category sections on **`/public-menu/:tenantId`** collapse and expand via an accessible accordion (keyboard-friendly toggle, **`aria-expanded`**) (#258).
- **Public menu:** Category headings follow the selected UI language (e.g. **Bebidas** in Spanish instead of raw API English) using existing product category i18n keys and new **`PUBLIC_MENU.*`** strings in all nine locales (#258).

### Fixed

- **Public menu:** Each product appears once when it is linked both as an active tenant product and a legacy **`Product`** row — public menu API dedupes before grouping (#258).

## [2.1.1] - 2026-06-01

### Added

- **Users / support access:** Owners and admins can grant temporary Administrator access to **`support@satisfecho.de`** from **Users** via **Add Satisfecho support** — pre-filled create or edit modal, **Support** badge on the user card, and guidance hints in all locales (#257).

## [2.1.0] - 2026-06-01

### Added

- **Landing / public menu:** Scannable QR code on each restaurant card on **`/`** opens a read-only **`/public-menu/:tenantId`** page (grouped menu, language picker, tenant branding) via the public menu API (#254).
- **Public API / marketing:** Read-only **`GET /public/tenants/{tenant_id}/menu`** for external marketing sites — grouped categories, optional **`lang`** query, tenant currency and price formatting, product images; no auth (#250).

### Changed

- **Landing / public menu:** Each tenant QR on **`/`** is now a link — desktop visitors can click through to **`/public-menu/:tenantId`** (same URL as scan); hint copy mentions scan or click and the link has a localized accessible name in all nine locales (#255).
- **Release / production:** Promoted **`development` → `master`** and confirmed green **Deploy to amvara9** on production (**satisfecho.de**) (#253). Closes the pending promotion noted for #252.

### Fixed

- **CI / amvara9 deploy:** **Deploy to amvara9** uses forced checkout and **`git clean -fd`** on the server so a dirty working tree (e.g. local edits to **`front/nginx.conf`** or marketing bundles) no longer blocks branch reset during CI (#253).
- **Staff UI / sidebar:** Mobile nav scroll no longer jumps back to the top after changing staff routes (#215).

## [2.0.87] - 2026-06-01

### Added

- **Landing / public menu:** Added a scannable QR code on each restaurant card on **`/`** that opens a read-only **`/public-menu/:tenantId`** page (grouped menu, language picker, tenant branding) using the existing public menu API (#254).

## [2.0.86] - 2026-05-29

### Added

- **Public API / marketing:** read-only **`GET /public/tenants/{tenant_id}/menu`** for external marketing sites — grouped categories, optional **`lang`** query, tenant currency and price formatting, product images; no auth; same product visibility rules as the table menu (#250).

### Fixed

- **Staff UI / sidebar:** mobile nav scroll no longer jumps back to the top after changing staff routes — **`ngOnDestroy`** no longer overwrites the saved scroll position with zero when the drawer closes (#215).

## [2.0.85] - 2026-05-28

### Added

- **Products / pricing helper:** modal from **Calculate ideal price** on the product form — **recipe/cost** flow (`GET /api/pricing/product/{id}/suggest`) using recipe cost via `calculate_product_cost` or `Product.cost_cents`, and **container simulator** (`POST /api/pricing/simulate`) with unit conversion; pour cost / margin / markup targets, waste, fixed extra, rounding; **Use this price** fills the price field only. Backend **`pricing_service.suggest_price`**, **`pricing_routes`**, pytest **`tests/test_pricing_service.py`**. New **`PRICING.*`** strings in all nine locale files (#209).
- **Login / tenant picker:** staff login now shows the selected restaurant name and logo when opened from `/login?tenant=…`, with a link back to choose a different restaurant (#206).
- **Fiscal invoicing (Spain / VeriFactu preparation):** per-tenant **`fiscal_mode`** (off / test / live), **`fiscal_invoice`** table with series and sequential numbering, **POST/GET `/orders/{id}/fiscal-invoice`** (stub AEAT payloads; no production AEAT HTTP call), **Settings → Payments** fiscal section, and **Print Factura** / edit-order print with **QR + disclaimer** when fiscal mode is on (#203).
- **Kitchen / bar displays:** header control to enter **browser fullscreen** (Fullscreen API with `webkit` / `moz` / `ms` fallbacks); exit via the same control, Escape, or leaving the page. Shared **`/kitchen`** and **`/bar`** view (`KitchenDisplayComponent`) (#202).
- **Settings / marketing — social posts (admin):** **Social posts** tab — compose **image + caption**, **Meta OAuth** (tokens encrypted server-side), **Facebook Page** and **Instagram Business** channels (IG needs **`PUBLIC_APP_BASE_URL`** for Graph image URL), **publish now / schedule**, **history** with per-channel status; background worker publishes due posts (#199).
- **Settings / delivery marketplaces (admin):** **Integrations** tab for third-party delivery brands; per-tenant **encrypted** API credentials, **test connection** (stub adapters for Uber Eats, Glovo, Deliveroo + sandbox), **catalog mapping** (external item id → POS product), **event log**, and **webhook ingest** URL. Ingested orders use the same **Order** / kitchen flow (no `table_id`); list as **Delivery** in the orders UI (#198).
- **Products / bulk import:** staff **JSON** bulk import (paste or file) with a read-only **preview** and explicit **confirm** before any rows are saved; optional menu-photo **vision** path feeds the same preview. Preview rows use **category** and **subcategory** dropdowns aligned with the single-product form (#242, #244).
- **Inventory:** **centiliter (cl)** volume unit — migration, API enum, unit pickers in inventory, purchase orders, and pricing helper (#214).

### Fixed

- **Public API / tenant discovery:** **`GET /public/tenants`** returned **500** on production when migration **`20260501120000_fiscal_invoice_verifactu`** was pending (ORM loaded **`tenant.fiscal_mode`** before columns existed). Migration SQL is now idempotent (**`IF NOT EXISTS`**); repair partial DBs with **`python -m app.migrate --sync-idempotent`** if needed (#211).
- **Products / bulk import:** **`POST /products/bulk-import/preview-json`** returned **500** under **`@admin_user_limit()`** because slowapi could not inject rate-limit headers on async handlers without a Starlette **`Response`** parameter (#243).

### Changed

- **Security / HTTP headers (production):** nginx **`server_tokens off`** in **`front/nginx.conf`** (prod image) and HAProxy **`http-response del-header Server`** on the public prod frontend so responses no longer expose **`Server: nginx/1.x`** (#210).
- **Dashboard / sidebar:** the home **Settings** card and the sidebar **Settings** entry now use the **same gear icon** and the **same translated title** in every locale (aligned `DASHBOARD.SETTINGS_TITLE` with `NAV.SETTINGS` where they differed) (#208).
- **Frontend / dependencies:** aligned **`@angular/cli`**, **`@angular/build`**, and **`@angular/ssr`** to **21.0.6** and refreshed **`front/package-lock.json`** so the **`@angular/build`** peer dependency **`@angular/ssr@^21.0.6`** is satisfied (previously **21.0.5**).
- **Settings / marketing — Social posts:** compose area uses a **secondary button + filename** (hidden file input) and preview below, matching other image pickers; **Publish immediately** is a standard inline checkbox row without the global full-width input styling on the control (#201).
- **Settings / marketing — Social posts:** section cards (**Connected networks**, **Compose**, **History**), image preview with remove, taller caption field, helper text under controls, disabled-state hint for publish/schedule, and responsive history table (#200).
- **Staff UI / sidebar:** tenant **Settings → name** shows on its **own line below** version and commit hash (muted, slightly smaller than version); top logo line is **POS** only; long names ellipsis with full text in `title`. Mobile header stacks **POS** then org name (#197).
- **API / rate limiting:** centralized SlowAPI helpers in **`back/app/rate_limits.py`**; **`admin_user_limit`** on included routers (**`/inventory`**, **`/reports`** (incl. attendance Excel), **`/staff-contracts`**, **`/staff-contract-templates`**, **`/tenant/data-export`**, **`/tenant/purge`**); **`public_menu_ip_limit`** on public tenant discovery (**`/public/tenants*`**, **`/public/legal-urls`**) and **`GET /internal/validate-table/{table_token}`**. **`docs/0020-rate-limiting-production.md`** updated (#193).
- Repository: ignored **`claude-session.log`** and **`agents2/001-gh-reviewer/time-of-last-review.txt`** (001 reviewer local stamp) so routine agent runs do not produce recurring diffs; stopped tracking the stamp file in Git.
- Agents: **`agents2/pos-cursor-loop.sh`** committer defaults **`AGENT_COMMITTER_USE_CURSOR=1`** — **`040-committer.md`** via **`cursor-agent`** commits finished work with a human-readable **`CHANGELOG.md`**, **`Refs #N`** in the message, and **`scripts/link-commit-to-github-issues.sh`** comments on linked issues after push; stamp-only **`agents2/001-gh-reviewer/time-of-last-review.txt`** still commits locally (**`AGENT_COMMITTER_LOCAL`**).
- Agents: **`AGENT_001_LOCAL_LOG_REVIEWER`** (default on): **`agents2/pos-cursor-loop.sh`** skips **`cursor-agent`** for **001** when only Docker log heuristics fire and **`G001_GH_OK=1`** with zero untracked issues; appends a stamp to **`agents2/001-gh-reviewer/time-of-last-review.txt`**; digest and Ollama triage stay local. **`AGENT_001_LOCAL_LOG_REVIEWER=0`** restores **`cursor-agent`** for that case. **`have_cursor_agent`** is checked only when the gate would invoke **`cursor-agent`**.
- Agents: 001 log triage (**`scripts/agent-ollama-log-triage.sh`**): **Ollama first** by default, then llama.cpp (**`AGENT_001_LLAMA_CPP_FIRST=1`** restores llama-first); one **alternate-backend** attempt if the primary reply is ambiguous; stricter **SKIP**/**ESCALATE** prompt and last-word parse; default **`OLLAMA_MODEL`** **`Gemma4:latest`** (loop passes it explicitly); optional **`AGENT_001_LOG_TRIAGE_DEBUG=1`**; **`docs/agent-loop.md`** updated for triage order and when **`cursor-agent`** still runs for **001**.
- Agents: GitHub reviewer (001) recorded latest preflight run in `agents2/001-gh-reviewer/time-of-last-review.txt`.
- Tables floor plan: payment chip on the SVG aligned with the bottom of the table shape; pill and label scale on very small shapes (#188).
- **Products / pricing helper:** modal restyled with design tokens and labeled sections; **plain labels** with **`field-hint`** copy, dynamic strategy hints, and **More options** for advanced fields; container **quantity + unit** paired on one row (#213, #232, #233).
- **Products:** price fields use a flex currency cell so the symbol no longer overlaps digits in narrow columns or at high zoom (#231).
- **Products:** standard subcategory codes (e.g. Fish, Meat) show translated labels in filters, forms, and menu; custom tenant subcategory names stay unchanged (#234).
- **Inventory / purchase orders:** status **help panel** (ⓘ) on list and detail describing all six statuses, with a **44×44** toggle and partial-receipt hint in the receive modal (#225, #226).
- **Inventory:** corrected and added i18n for PO placeholders, expected delivery column, detail labels, unit/category dropdowns, friendlier reorder copy, and transaction-type badges in **Recent transactions** (#216–#220, #228).
- **Inventory / purchase orders:** create modal **Order total** updates live with line edits; **Submit → Approve → Receive** and **cancel** wired on list and detail; status badges share one stylesheet (#223, #224, #229).
- **Inventory:** amounts format with the tenant **`currency_code`** via **`Intl`** instead of a hardcoded **`$`** (#222).
- **Inventory:** adjust-stock modal uses segmented controls instead of stretched native radios (#221).
- **Tables / floor plan:** new tables get non-overlapping default positions with an **overlap** hint on the canvas; **zoom** controls moved clear of the shape palette; palette shape names translated; long seat labels ellipsis inside the sidebar (#238–#240).
- **Tables / tiles:** equal-height cards with side-by-side session actions; **joined** groups use compact collapsible member rows with per-table QR (#236, #237).
- **Tables / floor plan:** failed **table-join** API restores the pre-drag layout instead of leaving tables stacked (#235).
- **Kitchen / bar display:** background poll and WebSocket refresh no longer show full-page loading or close open item-status dropdowns (#230).
- **Reservations / public book:** choosing **today** defaults to the **next bookable** quarter-hour, not a past morning slot; same-day hint in all locales (#241).
- **Staff UI:** data-entry modals no longer close on accidental backdrop click; lightweight confirmation dialogs still dismiss on backdrop (#227).
- **Staff UI / sidebar:** sidebar navigation scroll position preserved across staff route changes (#215).

### Fixed

- **Login (staff):** sign-in is no longer blocked when **iOS Safari / Keychain** autofills email and password without updating the reactive form; values are synced from the inputs on submit before validation, the submit button stays available when the form is not loading, and invalid empty submit shows field hints instead of a silent no-op (#204).

- **Landing / mobile:** public **`/`** layout on narrow viewports — language picker sits in the hero toolbar, value bullets stack at a consistent width, and the table-code input row no longer overflows (~320px+); wide desktop layout unchanged (#207).

- **Delivery integrations / webhooks:** creating order lines from marketplace payloads resolved **`Product`** via **`exec(select(...)).first()`**, which could return a SQLAlchemy **`Row`** and broke **`price_cents`** access; loading by primary key restores webhook ingest (**#198**).

- Tables / payments: `GET /tables/with-status` preserves **`payment_status: pending`** when kitchen orders are ready or completed and a bill was still relevant; improved detection of active order and `bill_requested_at` (#189).
- Orders / tables: staff **mark paid** and **finish order** no longer cleared `bill_requested_at`, so after **unmark paid** the floor plan still showed **payment pending** when a bill had been requested (#190).

## [2.0.84] - 2026-04-21

### Added

- **Reservations / opening hours:** database-backed **planned weekly patterns** (effective from a date) and **date-range overrides** (closed or alternate weekly-style hours); staff manage entries under **Settings → Opening hours**. Public `/reservations/book-*` endpoints and reservation validation resolve **effective hours per calendar date** (#194).

## [2.0.83] - 2026-04-21

### Fixed

- **Marketing deploy:** **`sync-all-marketing-sites.sh`** honors **`MARKETING_VERIFY_NO_PLACEHOLDERS=1`** (set in **`deploy-amvara9`** fetch step): if any **`config/marketing-sites.json`** slug still has **`bundle not loaded`** after sync, the workflow **fails** instead of deploying placeholders. Typical cause: PAT scoped only to **`040_gustazo`** while **`010_antillana`** and other repos need **Actions** artifact access.

### Changed

- **Documentation:** **`config.env.example`** — PAT must cover **every** listed marketing repo, not Gustazo alone.

## [2.0.82] - 2026-04-21

### Changed

- **CI / amvara9:** **`deploy-amvara9`** runs on **push to `master`** only (**`workflow_dispatch`** unchanged); **removed** **`development`** from **`on.push`** so commits to **`development`** no longer trigger deploy or front/back builds.

## [2.0.81] - 2026-04-21

### Fixed

- **Deploy (amvara9) / marketing:** **rsync** of **`front/sites/`** now runs **after** **`git reset --hard`** on the server. Previously, reset restored committed **placeholders** and **overwrote** the CI-fetched bundles, so production (e.g. **`/gustazo/`**) served the stub page. **Deploy** still needs **`GUSTAZO_ARTIFACT_TOKEN`** (or **`MARKETING_ARTIFACT_TOKEN`**) in GitHub for the “Fetch marketing” step. **Smoke** warns if Gustazo HTML still contains **“bundle not loaded”**.

## [2.0.80] - 2026-04-21

### Fixed

- **Production nginx:** **`marketing-sites.generated.conf`** is written to **`/etc/nginx/snippets/`**, not **`conf.d/`**. Files under **`conf.d/*.conf`** are merged at **`http`** context; **`location`** blocks there are invalid (**`directive is not allowed here`**). **`default.conf`** now **`include`**s the snippets file only inside the **`server`** block.

## [2.0.79] - 2026-04-21

### Fixed

- **Production nginx:** **`include`** for marketing static sites now uses an absolute path (see **2.0.80** for **`conf.d`** vs **`snippets`**). The previous relative **`include marketing-sites.generated.conf`** resolved to **`/etc/nginx/marketing-sites.generated.conf`** and nginx failed to start (**`open() … failed (2: No such file or directory)`**), **`pos-front`** restarted in a loop, HAProxy **`frontend_backend`** returned **503** on **`/`**.

## [2.0.78] - 2026-04-21

### Changed

- **Production (amvara9):** Promotes the current **`development`** line, including multi-repo **marketing** static sites (**`front/sites/<slug>/`**, generated nginx locations, deploy-time **`sync-all-marketing-sites.sh`** with **`MARKETING_ARTIFACT_TOKEN`**) as documented in **2.0.76** and **2.0.77**.

## [2.0.77] - 2026-04-21

### Changed

- **Marketing:** **`config/marketing-sites.json`** aligned with **satisfecho** GitHub org repos **`010_antillana`**, **`020_dilruba`**, **`030_flamanapolitana`**, **`040_gustazo`**, **`050_hakone`** (paths **`/antillana/`** … **`/hakone/`**); **`040_gustazo`** artifact **`gustazo-dist`**, branch **`main`**. Placeholder **`front/sites/<slug>/`** trees for packaging and nginx generation.

## [2.0.76] - 2026-04-20

### Added

- **Marketing SPAs** (repos named **`NNN_slug`**, three digits + underscore): **`config/marketing-sites.json`** lists **`slug`**, **`repo`**, **`branch`**, **`artifact`**, optional **`cloneDir`**, and **`autoDiscoverSiblingRepos`** to scan **`POS_REPO_ROOT/../*`** for **`^[0-9]{3}_*/package.json`**. **`scripts/sync-all-marketing-sites.sh`** fills **`front/sites/<slug>/`** from GitHub Actions artifacts (**`curl`/`jq`**, token **`MARKETING_ARTIFACT_TOKEN`** with fallbacks **`GUSTAZO_ARTIFACT_TOKEN`** / **`GH_TOKEN`**) or runs **`ng build`** in a sibling clone with **`--base-href /<slug>/`**. **`flatten-marketing-for-angular.sh`** mirrors into **`front/marketing-flat/<slug>/`** for **`development-no-ssr`**; **`front/scripts/generate-marketing-nginx-include.sh`** emits nginx **`location`** blocks at **prod image** build.
- **`scripts/fetch-marketing-artifact.sh`** — generic artifact download; **`scripts/fetch-gustazo-artifact.sh`** remains a thin wrapper for **`front/sites/gustazo`**. **`scripts/sync-gustazo-for-dev.sh`** delegates to **`sync-all-marketing-sites.sh`**.
- **Local dev**: optional sync on **`pos-front` start** via **`SYNC_MARKETING_ON_START`** (fallback **`SYNC_GUSTAZO_ON_START`**). **`docker-compose.dev.yml`** continues to mount **`./scripts`** and **`.:/repo`** with **`POS_REPO_ROOT=/repo`**.

### Changed

- **Deploy (amvara9)**: workflow runs **`sync-all-marketing-sites.sh`** and **rsync**’s **`front/sites/`** to the server before build; **`Dockerfile.prod`** copies **`front/sites`** to **`/usr/share/nginx/html/sites/`** and includes generated per-slug nginx config; **`nginx.conf`** no longer hard-codes Gustazo-only locations.
- **`docker-compose.yml`**: documents **`MARKETING_ARTIFACT_TOKEN`**; **`config.env.example`** comments updated accordingly.
- **`.gitignore`**: **`front/marketing-flat/`**.

## [2.0.75] - 2026-04-14

### Changed

- Tables floor plan: **`GET /tables/with-status`** exposes **`payment_status`** (`none` | `pending` | `paid`) and keeps **`operational_status`** for **kitchen / service** only. Table fill and legend reflect service state; **payment** uses a **bottom chip** on each table SVG. **`bill_requested_at`** drives **`pending`**; a still-referenced **paid** order can show **`paid`**. Joined groups merge **`payment_status`** like **`operational_status`**. Frontend `CanvasTable.payment_status`, i18n **`TABLES.PAYMENT_*`** / **`TABLES.LEGEND_PAYMENT_*`**. Tests: **`back/tests/test_tables_with_status_operational.py`** (#187).

## [2.0.74] - 2026-04-13

### Changed

- Landing: removed the **For restaurant staff** block and **Create staff account** CTA; **For guests** card centered with a max width (#183).
- Tables floor plan: **Ready to serve** vs **payment pending**; `bill_requested_at` drives pending state (#186). Legend **Ready to serve** for bill issued (#185).
- Tables / reservations: **POST /tables/{id}/close** marks **seated** reservations **finished** like the finish-reservation flow, so tables are not shown occupied only due to an old seated booking (#184).

## [2.0.73] - 2026-04-07

### Added

- Reports: Spanish **registro horario** monthly Excel export (#170).
- Google Review settings: i18n strings for public review description and instructions; settings screen uses clearer labels (#176).

### Changed

- Public booking page: stronger frosted hero panel; **Website** link gets a normalized `https://` URL and hostname as link text (#173).
- Tables canvas: on load and when switching floors, the view **fit and centered** tables with padding; **Reset** uses the same logic; repeat refreshes no longer reset pan/zoom (#172).
- Staff tables: joined groups appear as **one list row** and **one tile**; **Activate** / **Open menu** warn when another group member has a session or order; optional activity badges and floor-plan dot (#174).
- Orders: while a **line-item** status menu is open, the order card uses the same elevation as the order-level menu so dropdowns are not covered by the next card (#179).
- Landing: hero inner container widened for large viewports (#181). Staff panel hint merged into main copy; removed redundant hint key (#182).

### Fixed

- Tables: **DELETE /tables/{id}** no longer blocked after orders were soft-deleted; soft-delete clears `order.table_id` (migration + canvas queries ignore soft-deleted orders for “open order” checks) (#180).
- API: when PostgreSQL is unreachable, DB-backed endpoints return **503** with JSON **`detail`** instead of a generic **500**.
- English locale: restored full `front/public/i18n/en.json` after a fragment had broken the UI (#178).
- Frontend: `TenantSummary` in `api.service.ts` extended to match the backend (`take_away_table_token`, reservation fields), fixing template compile errors on book and reservation views.
- Reports: monthly attendance Excel — staff filter hint appears above the dropdown (#171).

## [2.0.72] - 2026-04-06

### Fixed

- Reports: monthly attendance Excel with **`staff_ids`** no longer returned 500 (Excel styling no longer shadowed `sqlmodel.col`) (#168).
