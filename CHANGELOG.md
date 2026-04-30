# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions are listed **newest first**. Entries use **past tense**, one line per item where possible, and emphasize **user-visible impact**. Issue numbers in parentheses point to GitHub when they add context.

**Versioning:** [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`): incompatible API or behavior → major; backward-compatible features → minor; fixes and small improvements → patch.

## [2.0.84] - 2026-04-21

### Added

- **Reservations / opening hours:** database-backed **planned weekly patterns** (effective from a date) and **date-range overrides** (closed or alternate weekly-style hours); staff manage entries under **Settings → Opening hours**. Public `/reservations/book-*` endpoints and reservation validation resolve **effective hours per calendar date** (#194).

## [Unreleased]

### Added

- **Kitchen / bar displays:** header control to enter **browser fullscreen** (Fullscreen API with `webkit` / `moz` / `ms` fallbacks); exit via the same control, Escape, or leaving the page. Shared **`/kitchen`** and **`/bar`** view (`KitchenDisplayComponent`) (#202).
- **Settings / marketing — social posts (admin):** **Social posts** tab — compose **image + caption**, **Meta OAuth** (tokens encrypted server-side), **Facebook Page** and **Instagram Business** channels (IG needs **`PUBLIC_APP_BASE_URL`** for Graph image URL), **publish now / schedule**, **history** with per-channel status; background worker publishes due posts (#199).
- **Settings / delivery marketplaces (admin):** **Integrations** tab for third-party delivery brands; per-tenant **encrypted** API credentials, **test connection** (stub adapters for Uber Eats, Glovo, Deliveroo + sandbox), **catalog mapping** (external item id → POS product), **event log**, and **webhook ingest** URL. Ingested orders use the same **Order** / kitchen flow (no `table_id`); list as **Delivery** in the orders UI (#198).

### Changed

- **Settings / marketing — Social posts:** compose area uses a **secondary button + filename** (hidden file input) and preview below, matching other image pickers; **Publish immediately** is a standard inline checkbox row without the global full-width input styling on the control (#201).
- **Settings / marketing — Social posts:** section cards (**Connected networks**, **Compose**, **History**), image preview with remove, taller caption field, helper text under controls, disabled-state hint for publish/schedule, and responsive history table (#200).
- **Staff UI / sidebar:** tenant **Settings → name** shows on its **own line below** version and commit hash (muted, slightly smaller than version); top logo line is **POS** only; long names ellipsis with full text in `title`. Mobile header stacks **POS** then org name (#197).
- **API / rate limiting:** centralized SlowAPI helpers in **`back/app/rate_limits.py`**; **`admin_user_limit`** on included routers (**`/inventory`**, **`/reports`** (incl. attendance Excel), **`/staff-contracts`**, **`/staff-contract-templates`**, **`/tenant/data-export`**, **`/tenant/purge`**); **`public_menu_ip_limit`** on public tenant discovery (**`/public/tenants*`**, **`/public/legal-urls`**) and **`GET /internal/validate-table/{table_token}`**. **`docs/0020-rate-limiting-production.md`** updated (#193).
- Repository: ignored **`claude-session.log`** and **`agents2/001-gh-reviewer/time-of-last-review.txt`** (001 reviewer local stamp) so routine agent runs do not produce recurring diffs; stopped tracking the stamp file in Git.
- Agents: **`AGENT_COMMITTER_LOCAL`** (default on) and **`AGENT_COMMITTER_USE_CURSOR`** (default off): **`agents2/pos-cursor-loop.sh`** committer runs **`git commit`** / **`git push`** locally when the only dirty paths are **`agents2/001-gh-reviewer/time-of-last-review.txt`**; set **`AGENT_COMMITTER_USE_CURSOR=1`** to run **`040-committer.md`** via **`cursor-agent`** for full **`CHANGELOG.md`** / version handling.
- Agents: **`AGENT_001_LOCAL_LOG_REVIEWER`** (default on): **`agents2/pos-cursor-loop.sh`** skips **`cursor-agent`** for **001** when only Docker log heuristics fire and **`G001_GH_OK=1`** with zero untracked issues; appends a stamp to **`agents2/001-gh-reviewer/time-of-last-review.txt`**; digest and Ollama triage stay local. **`AGENT_001_LOCAL_LOG_REVIEWER=0`** restores **`cursor-agent`** for that case. **`have_cursor_agent`** is checked only when the gate would invoke **`cursor-agent`**.
- Agents: 001 log triage (**`scripts/agent-ollama-log-triage.sh`**): **Ollama first** by default, then llama.cpp (**`AGENT_001_LLAMA_CPP_FIRST=1`** restores llama-first); one **alternate-backend** attempt if the primary reply is ambiguous; stricter **SKIP**/**ESCALATE** prompt and last-word parse; default **`OLLAMA_MODEL`** **`Gemma4:latest`** (loop passes it explicitly); optional **`AGENT_001_LOG_TRIAGE_DEBUG=1`**; **`docs/agent-loop.md`** updated for triage order and when **`cursor-agent`** still runs for **001**.
- Agents: GitHub reviewer (001) recorded latest preflight run in `agents2/001-gh-reviewer/time-of-last-review.txt`.
- Tables floor plan: payment chip on the SVG aligned with the bottom of the table shape; pill and label scale on very small shapes (#188).

### Fixed

- **Delivery integrations / webhooks:** creating order lines from marketplace payloads resolved **`Product`** via **`exec(select(...)).first()`**, which could return a SQLAlchemy **`Row`** and broke **`price_cents`** access; loading by primary key restores webhook ingest (**#198**).

- Tables / payments: `GET /tables/with-status` preserves **`payment_status: pending`** when kitchen orders are ready or completed and a bill was still relevant; improved detection of active order and `bill_requested_at` (#189).
- Orders / tables: staff **mark paid** and **finish order** no longer cleared `bill_requested_at`, so after **unmark paid** the floor plan still showed **payment pending** when a bill had been requested (#190).

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
