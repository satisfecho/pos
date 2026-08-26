# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions are listed **newest first**. Entries use **past tense**, one line per item where possible, and emphasize **user-visible impact**. Issue numbers in parentheses point to GitHub when they add context.

**Versioning:** [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`): incompatible API or behavior → major; backward-compatible features → minor; fixes and small improvements → patch.

## [Unreleased]

### Added

### Changed

### Fixed

## [2.1.159] - 2026-08-26

### Added

- **Product image deploy repair:** `sync_product_images` and `check_product_image_health` seeds repair stale `Product.image_filename` after catalog import; deploy runs them after linking demo products to catalog.

### Fixed

- **`/products` vs public menu:** `GET /products` no longer overwrites custom tenant upload paths when the file exists on disk; stale `providers/...` refs are repaired from the linked catalog.

## [2.1.158] - 2026-08-26

### Added

- **Customer stock alerts (#356):** QR menu and Satisfecho Delivery show **Only X left** when a product’s sellable stock is at or below its alert level. From discussion #21.
- **Tenant ID in staff header (#357):** The staff sidebar shows the logged-in tenant number after the version and commit hash (compact tooltip “Tenant ID”).

### Changed

- **Products form:** Default stock alert level for new products is **5** (was 0).

### Fixed

- **`/products` thumbnails vs public menu:** `GET /products` repairs stale `Product.image_filename` values when the file is missing on disk, using the linked `TenantProduct` / provider catalog image (same source as `/public-menu/{id}`).

## [2.1.157] - 2026-08-26

### Added

- **Product stock alerts (#356):** On `/products`, each product can enable a sellable-unit stock alert (`stock_qty` / `stock_alert_level`). Low stock shows a badge in the products list. From discussion #21.

## [2.1.156] - 2026-08-26

### Added

- **Platform owner/staff login counts (#315):** `/platform` All tenants table shows each owner's login count and last login; tenant detail staff table shows the same per user (from `login_event`).

## [2.1.155] - 2026-08-24

### Added

- **User manual translations (#354):** Full manual body HTML for de, fr, ca, bg, hi, ur, and zh-CN. `/manual-usuario` loads each locale’s content file; missing files fall back to English.
- **README starter paths (#355):** New “Start with one feature” section for newcomers who want only a QR menu or only online reservations — minimal setup steps, links to docs, and note that self-host has no license fee.

## [2.1.154] - 2026-08-24

### Added

- **User manual language switch (#353):** Public `/manual-usuario` is now an Angular page with the marketing language picker and shared footer. Spanish and English manual bodies load from `content/es.html` and `content/en.html`; other UI locales use English until more translations exist. Footer and About links use the SPA route.

## [2.1.153] - 2026-08-23

### Fixed

- **QR menu order history (#350):** Public `/menu/{table_token}` order history no longer lists every guest’s paid orders at the same table. `GET /menu/{table_token}/order-history` requires `session_id` and scopes results to that browser session or, when logged in, the end-user customer at the tenant. Table orders set `Order.customer_id` when the customer cookie is present. Staff back-office table views are unchanged.

## [2.1.152] - 2026-08-23

### Added

- **User manual on marketing site (#352):** Published the Spanish user manual at `/manual-usuario/` (static assets from `docs/manual-usuario/`). **User manual** links on the shared marketing footer, `/about`, and `/features`.

### Changed

- **Agent loop (FEAT waiting for human):** Feature coder step skips parked **FEAT** tasks after one waiting GitHub comment until a human replies on the linked issue (`scripts/agent-feat-waiting-human-preflight.sh`).

## [2.1.151] - 2026-08-20

### Added

- **Shared table cart for dine-in QR (#349):** Guests on the same activated table QR now share a live draft cart before Place Order (Redis + WebSocket). Each device keeps its own session for attribution; Place Order still sends only that device’s lines. Take Away stays local-only. Docs 0008/0009 updated.

## [2.1.150] - 2026-08-20

### Fixed

- **Feature page translations (#348):** Replaced English placeholders on `/features` and `/features/{slug}` with real copy in de, es, fr, ca, zh-CN, hi, ur, and bg (`FEATURES_PAGE` + all 31 `FEATURE_DETAIL` slugs). Compliance wording for VeriFactu/TSE stays honest. Locale parity and features smoke PASS.

## [2.1.149] - 2026-08-19

### Added

- **Feature landing pages (#347):** 31 public detail pages at `/features/{slug}` (e.g. `/features/reservations`, `/features/satisfecho-delivery`) with hero, benefits, how-it-works, and register/demo CTAs — no login. Grid cards on `/features` link to each page. Data-driven catalog in `feature-landings.ts`; `FEATURE_DETAIL.*` i18n in all locales; SEO meta and sitemap entries; honest preparation-only copy for invoicing/TSE. Smoke: `npm run test:features --prefix front`.

## [2.1.148] - 2026-08-13

### Fixed

- **Paid orders leave Active Orders (#345):** Full settlement (mark-paid, Finish, Stripe/Revolut, split bill, offline cash) sets `completed` when all items are delivered; pre-pay stays `paid` under Active until the last item is delivered, then moves to Order History. Active Orders / History filters and docs match that rule.
- **Enhancement preflight:** After a version cut, suppress `SIGNAL changelog_sparse` when Unreleased is empty and no `back/` / `front/src/` commits landed after the newest `## [X.Y.Z]` date (keeps the existing 2-day / 48h fresh-cut suppress).

## [2.1.147] - 2026-08-09

### Added

- **Talk to POS (#344):** Staff demo at `/talk` — browser voice (Web Speech) or typed commands map to navigation only (kitchen, tables, orders, etc.). No LLM, no API keys, no order/payment mutations. Doc: `docs/0076-talk-to-pos.md`. Smoke: `npm run test:talk --prefix front`.
- **Promo video recorder:** `front/scripts/record-promo-video.mjs` (`npm run record-promo-video`) captures a short public-page walkthrough via Puppeteer screencast, letterboxes to 1080p with ffmpeg, and muxes a **CC BY-SA 4.0** music bed (default: Homage by Kjartan Abel). Documented in `docs/0075-promo-videos.md` (mac-stats-style live capture pattern), including Loom-style **circular talking-head PiP** (QuickTime record, ffmpeg loop/overlay parameters, trim lead-in, music-only) and a small **bottom end-credit** for the music author (last ~6s).

### Changed

- **Agent loop daily promote:** Step **009** runs **`scripts/promote-development-to-master.sh`** after the committer so **`development` → `master`** (and Deploy to amvara9) happens at least once per day when there are pending commits (`AGENT_PROMOTE_INTERVAL_HOURS` default 24). Background helper: **`scripts/start-pos-cursor-loop-background.sh`**.
- **Loyalty wallet passes (#343):** Archived the verified agents2 task after PASS checks (migrate `20260801131339`, 5 wallet + 8 club-loyalty pytest, unconfigured join/fallback, staff `wallet_passes_enabled` toggle, i18n/landing/front compile, docs 0066). The feature itself shipped in 2.1.146; production Apple/Google issuer certs remain an ops follow-up.
- **Certified fiscal middleware (#342):** Archived the verified agents2 task after PASS checks (17 fiscal/TSE pytest including live gates and mock-live slice, HTTP smoke on `/` `/features` `/pricing` `/api/health`, marketing/Settings honesty). The feature itself shipped in 2.1.146; real AEAT/BSI remisión remains an ops follow-up with commercial Fiskaly credentials.

## [2.1.146] - 2026-08-01

### Added

- **Loyalty wallet passes (#343):** Apple PassKit `.pkpass` signing and PassKit web-service updates, plus Google Wallet loyalty object create/PATCH, when platform certs/issuer env are configured; per-tenant `wallet_passes_enabled` with balance-card fallback; Add-to-Wallet on join/card; setup steps in `docs/0066`. Real device acceptance still needs Apple/Google issuer credentials in each environment.
- **Certified fiscal middleware (#342):** Provider ADR (`docs/0074`) choosing Fiskaly SIGN ES (VeriFactu) and SIGN DE (TSE); adapters with `mock` / `generic` / Fiskaly modes; live issue and TSE sign require middleware acceptance (502 otherwise); mock blocked when `PRODUCTION=true`; Settings and `/features` stay honest until production credentials are verified.

### Changed

- **Roadmap (#341):** Moved end-user customer accounts (#340) from Deferred into Shipped; noted remaining MFA / self-serve invoice deferrals; refreshed Offline / loyalty / migration notes; added a short weekly ROADMAP review checklist; synced the offline row in `docs/0032`.

## [2.1.145] - 2026-07-31

### Added

- **Google Analytics 4:** Optional gtag in the Angular shell; measurement ID from gitignored `.secrets` (`GOOGLE_ANALYTICS_MEASUREMENT_ID`), injected at front container start via `runtime-config.js`. See `docs/0073-google-analytics.md`.
- **Secrets env overlay:** Optional gitignored `.secrets` (template `.secrets.example`) loaded by `./run.sh`, `deploy-amvara9.sh`, and `scripts/compose-env-file-args.sh` after `config.env`.

### Changed

- **Marketing sites:** Synced static builds into `front/sites/` (replaced placeholders for Dilruba, Hakone, Flama Napolitana, La Moca, La Bella Toscana, Wimpi, Boss Kebab, and related `/es` deploy paths).
- **End-user customer accounts (#340):** Archived the verified agents2 task after PASS checks (migrate, 7 pytest, API smoke, Puppeteer register→login→empty orders, staff Factura intact, front build). The feature itself shipped in 2.1.144.

## [2.1.144] - 2026-07-31

### Added

- **End-user customer accounts (#340):** First vertical slice — `Customer` model (separate from staff `User` and Factura `BillingCustomer`), register/login with `customer_access_token`, email verification + resend, `/customer` portal (profile + order list), nullable `order.customer_id`. MFA and self-serve invoices deferred. Smoke: `npm run test:customer-register-login --prefix front`.

### Fixed

- **GitHub license detection (#339):** Root file is now canonical `LICENSE` with the verbatim AGPL-3.0 text (project notice moved to README) so GitHub/Licensee can identify AGPL-3.0 instead of `NOASSERTION`.

## [2.1.143] - 2026-07-31

### Added

- **Public About us (#338):** Marketing `/about` page (no login) for Satisfecho / Amvara Consulting S.L., linked from landing/features/pricing nav and footer Support; company line in the shared marketing footer; SEO/sitemap and `npm run test:about`.

### Changed

- **WhatsApp reservation reminders (#335):** Clarified shipped Twilio send vs book-page `wa.me` CTA in `docs/0024-whatsapp-reminder-notes.md` (operator checklist, env vars, sandbox/template gaps); archived the verified audit task after PASS checks.

## [2.1.142] - 2026-07-30

### Changed

- **Loyalty Club settings (#337):** Settings → Loyalty Club is reorganized into Program / Earn & redeem / Bonuses & VIP / Public join / Members sections with per-field ⓘ tooltips (including clear Points vs Stamps Mode help), an improved members empty state, and matching i18n in all locales. UI/i18n only; earn/redeem behavior unchanged.
- **Agent loop:** `pos-cursor-loop.sh` drops invalid env `GITHUB_TOKEN`/`GH_TOKEN` so `gh` keyring auth works, and continues the cycle when a single step fails.
- **Offline deferred card (#333):** Archived the verified agents2 task after PASS checks (4 offline-cash pytest, landing smoke, i18n parity, staff queue→sync→mark-paid, API idempotency, no PAN/CVV or offline fiscal). The feature itself shipped in 2.1.140.
- **Roadmap (#332):** Archived the verified agents2 docs task after PASS checks (ROADMAP structure, no stale Missing for 2026-07-26 CLOSED features, required doc links, recurring 008 cadence, changelog line). The rewrite itself shipped in 2.1.139.
- **Production promote (#330):** Archived the verified agents2 ops task after PASS checks (GitHub release v2.1.138, `master` merge `f39127d7`, Deploy to amvara9 success, production landing/health/version smoke on satisfecho.de). Release/ops only; no new product code.
- **Day close-out (#329):** Archived the verified agents2 meta task after PASS checks (GitHub open issues empty, live queue clear of leftover product work, day archives #311–#328 present, landing + loyalty public API smoke). Status inventory only; no product code.
- **VeriFactu (#326):** Archived the verified agents2 task after PASS checks (hash-chain migration, 7 fiscal pytest, Settings Test save + Live 400, issue/cancel ValidarQR + sandbox, immutability 409→anulacion, landing smoke, docs 0018/0065). The feature itself shipped in 2.1.134.
- **Price promotions (#322):** Archived the verified agents2 task after PASS checks (7 pytest, Settings → Promotions create/toggle, QR menu live prices, order-line promo audit/tax, tenant isolation, landing smoke, front build). The feature itself shipped in 2.1.135.
- **Migration (#321):** Archived the verified agents2 task after PASS checks (17 pytest, CLI dry-run on sample CSV, invalid apply refused with no writes, docs 0062, landing smoke). The CSV cutover toolkit itself shipped in 2.1.134.
- **Docs (0051):** Archived the verified agents2 task after PASS checks confirming `docs/README.md` Feature guides lists the floor-plan table join/unjoin MVP (distinct from 0054 restaurant groups). The index itself shipped in 2.1.99.
- **Docs (SECURITY-REVIEW):** Archived the verified agents2 task after PASS checks confirming `docs/README.md` lists the security review notes under Quick links and Reference & notes. The index itself shipped in 2.1.103.
- **Inventory multi-warehouse (#320):** Archived the verified agents2 task after PASS checks (migration `20260726132730`, 6/6 pytest, warehouse CRUD + adjust/receive isolation, Stock Dashboard filter, landing smoke). The feature itself shipped in 2.1.134.
- **Guest feedback (#325):** Archived the verified agents2 task after PASS checks (12/12 pytest, staff trends + CSV export smoke, public `/feedback/1`, docs 0064, front build). The feature itself shipped in 2.1.134.
- **Guest birthdays (#324):** Archived the verified agents2 task after PASS checks (migration, 8/8 pytest, public book + staff create/edit/clear, settings capture/marketing consent toggles, front build, landing smoke). The feature itself shipped in 2.1.135.
- **Docs (0030):** Archived the verified agents2 task after PASS checks confirming `docs/README.md` lists the reservation confirmation email troubleshooting runbook under Email & SMTP and Quick links. The index itself shipped with the 0030 refresh in 2.1.100.
- **Hardware printing (#317):** Archived the verified agents2 task after PASS checks (print_jobs migration/API, Settings → Printing, dry-run LAN agent kitchen ticket, offline browser fallback, 401 without agent token, landing smoke). The feature itself shipped in 2.1.136.
- **Public pricing (#328):** Archived the verified agents2 task after PASS checks on the live `/pricing` page (saas config price/trial, paywall-inactive note, DE/ES i18n, `test:pricing`, and saas billing unit tests). The page itself shipped in 2.1.136.

## [2.1.141] - 2026-07-30

### Added

- **Products / bulk import (#336):** Staff **Products → bulk import** accepts **CSV/TSV** (file or paste) through the same preview → confirm pipeline as JSON; common header aliases; optional AI column mapping when vision is configured (`POST /products/bulk-import/preview-csv`). Docs: `docs/0062-pos-migration-import.md`.

## [2.1.140] - 2026-07-27

### Added

- **Loyalty VIP + referral (#334):** Tenant-configurable VIP silver/gold thresholds on **lifetime earn** (not balance), surfaced on staff member list and public card; referral codes/links award referrer (and optional invitee) units once on successful referred join. Settings → Loyalty club; see `docs/0066-club-loyalty.md`.
- **Offline deferred card (#333):** Staff offline sale panel can queue `payment_intent=card` (intent metadata only — no PAN/CVV). Sync creates an unpaid take-away order; card is collected online after reconnect. True offline card capture and offline fiscal numbering remain blocked; ADR updated in `docs/0063-offline-capable-client.md`.

## [2.1.139] - 2026-07-26

### Added

- **Overnight completeness (#331):** Split bill **by line** (pick order items in the payment modal; tracked via `order_payment_item`), loyalty **birthday bonus** units (program setting + optional birthday on join; awarded once per year on a paid order), and German **TSE auto-sign** when offline-cash sales sync (plus a payment audit leg). See `docs/0071-split-bill.md`, `docs/0066-club-loyalty.md`, `docs/0072-tse-fiscal-compliance.md`.

### Changed

- **Roadmap (#332):** Rewrote root `ROADMAP.md` into short Shipped / In progress / Deferred tables (links to `docs/` + issues); removed the inline rate-limit strategy draft (still in `docs/0020`); synced `docs/0032` #52 statuses for split bill, promos, join tables, and birthdays; documented recurring refresh with agent **008** / `docs/agent-loop.md`.

## [2.1.138] - 2026-07-26

### Fixed

- **Club loyalty (#327):** Public join, balance, and wallet endpoints no longer return 500 under live SlowAPI — correct `@public_menu_ip_limit()` usage and inject `response: Response` like other public menu routes.

### Changed

- **Club loyalty (#327):** Archived the verified agents2 task after PASS checks (live public APIs under SlowAPI, UI join + card, 5 pytest, landing smoke, docs 0066). The MVP itself shipped in 2.1.134.

## [2.1.137] - 2026-07-26

### Added

- **German TSE / KassenSichV preparation (#316):** Cloud-TSE ADR and Phase 1 MVP — per-tenant fiscal country and TSE mode (off/test/live, independent of VeriFactu), stub-signed sale/storno on pay and unmark-paid, receipt TSE fields (print-bridge + browser), DSFinV-K date-range export stub, Settings UI and `/features` honesty. Live mode stays gated until provider unlock; not marketed as BSI-certified. See `docs/0072-tse-fiscal-compliance.md`.

## [2.1.136] - 2026-07-26

### Added

- **Split bill / partial payments (#318):** Staff can record multiple payment legs on one order (by amount), with remaining-balance reconciliation; order marks paid only when covered. One Factura/VeriFactu alta per settled order; loyalty still earns once. See `docs/0071-split-bill.md`.
- **Public pricing page (#328):** Real `/pricing` route shows trial length and monthly hosted price from `GET /saas/config` (not hardcoded), plus AGPLv3 self-host tier; respects `SAAS_PAYWALL_ENABLED` so inactive billing is not implied everywhere. Multi-tier-ready `plans[]` on the config payload.
- **Hardware printing (#317):** Option C ADR + LAN print agent — staff `POST /print-jobs` (kitchen|receipt), agent auth token, poll/claim/complete, Settings → Printing, ESC/POS agent script (`scripts/print-agent/`), browser `window.print()` fallback with offline warning (`docs/0070-hardware-printing.md`).

## [2.1.135] - 2026-07-26

### Added

- **Branch hub fulfillment (#323):** ADR chooses linked tenants via restaurant groups (not a parallel site hierarchy); warehouses stay same-tenant stock bins. Designate a group **hub kitchen**, branch staff can request HQ prep (fulfillment record), hub marks **prepared at HQ**; Orders show the state. See `docs/0069-branch-hub-fulfillment.md`.
- **Price promotions (#322):** Tenant %-off category engine (time window + channel eligibility), Settings → Promotions, live QR/public menu prices, order-line promo audit snapshot, shared order-level discount helper for loyalty (`docs/0068-price-promotions.md`).
- **Guest birthdays (#324):** Optional month/day on reservations (public `/book` + staff create/edit), staff visibility, tenant settings for capture vs marketing consent (capture-only by default; no outbound messages). See `docs/0067-guest-birthday.md`.

## [2.1.134] - 2026-07-26

### Added

- **Club loyalty (#327):** Tenant points/stamps program — Settings tab, public join `/loyalty/{tenantId}` + balance card, auto-earn once per paid order, staff redeem at checkout (`loyalty_discount_cents` until #322 promos), append-only ledger; Apple/Google Wallet issuance gated on certs (`docs/0066-club-loyalty.md`).
- **VeriFactu (#326):** Production-path prep — Phase 0 build-vs-buy ADR (`docs/0065-verifactu-production.md`), internal hash chain, AEAT ValidarQR URL shape, test-mode sandbox submission, order immutability after fiscal issue, anulación (credit-note cancel) endpoint; `fiscal_mode: live` gated until middleware unlock. Official AEAT SOAP/huella still via certified middleware (not invented in-app).
- **Guest feedback (#325):** Staff trends dashboard (averages, star distribution, daily volume) and CSV export on `/guest-feedback`; APIs `GET /tenant/guest-feedback/summary` and `GET /tenant/guest-feedback/export` (`docs/0064-guest-feedback-analytics.md`).
- **Migration (#321):** CSV cutover toolkit for products + categories — sample CSV, idempotent CLI (`--dry-run` / `--apply`), validation report that refuses writes on bad rows, and cutover runbook (`docs/0062-pos-migration-import.md`).
- **Inventory (#320):** Multi-warehouse (almacenes) MVP — tenant-scoped warehouses, per-location stock on receive/adjust, warehouse CRUD under Inventory, and stock dashboard filter by location.

## [2.1.133] - 2026-07-26

### Added

- **Offline POS (#319):** Architecture ADR + threat model (`docs/0063-offline-capable-client.md`); staff MVP queues a take-away **cash** sale offline and syncs via idempotent `POST /orders/offline-cash`, with a clear offline/pending banner.

## [2.1.132] - 2026-07-26

### Changed

- **Docs (0060 / 0021):** Confirmed the working-plan implementation plan is marked **historical / pre-build** (use the living 0021 guide) and archived the verification task.

## [2.1.131] - 2026-07-26

### Changed

- **Ops (#311):** Closed the verified production promote task for release **2.1.92** (merge to `master`, GitHub release, Deploy to amvara9, and production smoke already green).

## [2.1.130] - 2026-07-26

### Changed

- **Repo hygiene (#314):** Removed stale merged remote and local feature branches while keeping `development`, `master`, and unmerged tips that still need a human keep-or-delete decision.

## [2.1.129] - 2026-07-26

### Changed

- **Docs (0022):** Marked OAuth / social-login notes as **research / deferred** (auth remains email/password; do not queue implementation from this doc) and aligned README plus the 0019–0022 prioritisation guide.

## [2.1.128] - 2026-07-26

### Changed

- **Docs (0031 / #50):** Marked core order customizations as **shipped** (staff product questions, public menu answers including multi-select, kitchen/invoice summary); optional per-option price deltas remain open — aligned README and ROADMAP.

## [2.1.127] - 2026-07-26

### Changed

- **Docs (0002):** Clarified the customer features plan as **partial** — staff Billing Customers (Factura) and fiscal invoices are shipped; end-user accounts, MFA, and self-serve history are not — and aligned README indexes plus ROADMAP.

## [2.1.126] - 2026-07-26

### Changed

- **Docs (0009):** Marked table PIN security as **shipped** (staff activate / PIN / regenerate / close; public-menu gates; optional GPS flagging off by default) and aligned the docs README Plans blurb.

## [2.1.125] - 2026-07-26

### Changed

- **Docs (0051):** Marked floor-plan table join/unjoin as a **shipped** behavioural reference (canvas join/unjoin, combined seats, reservation pool, per-table QR tokens) and aligned the docs README Feature guides blurb.

## [2.1.124] - 2026-07-26

### Changed

- **Docs (0008):** Marked the order-management logic spec as **shipped core / design reference** (session-scoped orders are live; do not re-open the shared unpaid-order problem as backlog) and aligned the docs README blurb.

## [2.1.123] - 2026-07-26

### Added

- **Platform operator dashboard (#315):** Show all-time login count and last-login time on `/platform` (API `logins_total` / `last_login_at`, metric cards, i18n, smoke coverage).

### Changed

- **Docs (0057):** Marked the amvara9 deploy/CSS stale-build guide as **shipped** (`deploy-amvara9.sh` `--no-cache` front + SPA `index.html` no-cache headers) and aligned the docs README blurb.

## [2.1.122] - 2026-07-26

### Changed

- **Docs (0005):** Marked email-sending options as **research only** (not a shipping checklist), with ops pointers to **0056** (Gmail/SMTP) and **0030** (confirmation troubleshooting), and aligned the docs README blurb.

## [2.1.121] - 2026-07-26

### Changed

- **Docs (0050 / #52):** Marked the GitHub #52 split plan as **historical** (parent umbrella closed; do not re-file paste bodies without review) and aligned the docs README Plans blurb toward **0032** and shipped feature docs.

## [2.1.120] - 2026-07-26

### Changed

- **Docs (0028):** Documented that tenant public branding (background colour and header image) also covers waitlist and guest feedback, marked the guide as shipped, and aligned the docs README blurb.

## [2.1.119] - 2026-07-26

### Changed

- **Docs (0013):** Marked customer verification alternatives as **research only** (not a shipping decision; app uses email/password), softened SMS “recommended” framing to research-relative language, and aligned the docs README Reference blurb.

## [2.1.118] - 2026-07-26

### Changed

- **Docs (0010):** Marked the table-reservation implementation plan as **shipped core / design history** (pointing readers to **0011** for live how-to) and reframed later-phase items as backlog; updated the docs README Plans blurb.

## [2.1.117] - 2026-07-26

### Changed

- **Ops docs (0027):** Clarified that amvara9 upload routes are already shipped; JSON `Image not found` means a missing file or orphan DB ref (not a StaticFiles redeploy), and aligned orphan-clear compose paths plus the docs README blurb.

## [2.1.116] - 2026-07-26

### Changed

- **Docs (0032 / #52 roadmap):** Noted first-party **Satisfecho Delivery** as **Partial / shipped core** (with link to 0053), and clarified that **Uber Eats** remains separate **Not started** aggregator work; short cross-link in the 0050 Issue 10 context.

## [2.1.115] - 2026-07-26

### Changed

- **Docs (0023):** Refreshed prioritisation for docs 0019–0022 so **0021 (working plan)** is treated as shipped background and the next open item is **0022 (OAuth)**, with optional **0020** rate-limit follow-ups as non-blocking hardening; aligned the docs README index blurb.

## [2.1.114] - 2026-07-26

### Changed

- **Docs (0007):** Marked the January 2026 implementation verification report as a **historical** snapshot (stale `main.py` line refs are not current truth) and clarified the docs README index to point readers to 0008 / live code / tests for order behaviour.

## [2.1.113] - 2026-07-26

### Changed

- **Overbooking docs (0025):** Marked reservation overbooking detection as **shipped** (live report API, 400 on over capacity, UI/reports pointers, 0058 / checker links) and aligned the docs README Plans blurb so agents no longer treat it as an unstarted proposal.

## [2.1.112] - 2026-07-26

### Changed

- **Testing docs:** Documented `test:working-plan-calendar` (direct `/working-plan/calendar` load, fails on console errors) in section 2b and the npm scripts table, distinct from week-view `test:working-plan`.

## [2.1.111] - 2026-07-26

### Changed

- **Docs Quick links:** Added multi-location restaurant groups (`0054-restaurant-groups.md`) so operators can open that guide from the docs index without digging into Feature guides.

## [2.1.110] - 2026-07-26

### Changed

- **Docs index (VeriFactu):** Feature guides now list `0018-verifactu-fiscal-invoicing.md` after billing/Factura 0017, with a short cross-link on the 0017 blurb (tenant `fiscal_mode`, server-issued fiscal stub, Factura QR/disclaimer; no production AEAT submission yet).

## [2.1.109] - 2026-07-26

### Changed

- **Docs index (reservations):** Feature guides and Quick links now mention the public waiting list (`/waitlist/:tenantId`) and staff Waiting list tab alongside booking in the 0011 blurbs.

## [2.1.108] - 2026-07-26

### Changed

- **Docs index (agent-loop):** Reference blurb now points at the live `agents2/tasks/` queue (+ prompts), with a short note that legacy `agents/` may appear in older notes.

## [2.1.107] - 2026-07-26

### Changed

- **Reports guide (0016):** Documented the Overbooking slots summary card (`overbooking_slots_count`, shown when count &gt; 0) and cross-linked to 0025 overbooking detection; updated the docs README 0016 blurb.

## [2.1.106] - 2026-07-26

### Changed

- **Docs index (Deployment):** Listed `0027-amvara9-menu-images-troubleshooting.md` under Deployment & operations in `docs/README.md`, with short see-also links from the 0004 and 0026 blurbs, so operators find the uploads-404 runbook next to HAProxy/deploy docs.

## [2.1.105] - 2026-07-26

### Changed

- **Docs Quick links:** Added Satisfecho Delivery (`0053`), SaaS signup paywall (`0052`, keep-off until runbook), and platform operator (`0059`) so operators find those guides without digging into Feature guides.

## [2.1.104] - 2026-07-26

### Changed

- **Docs renumber (working plan):** Kept the living shift-schedule guide as `0021-working-plan.md`; moved the pre-build BetterShift/implementation plan to `0060-working-plan-implementation-plan.md` with a historical banner. Updated `docs/README.md` Implementation plans rows.

## [2.1.103] - 2026-07-26

### Changed

- **Docs index:** Listed `SECURITY-REVIEW.md` under Quick links and Reference & notes in `docs/README.md` (structured security pass — not a pentest).
- **Agent cursor-rules catalog:** Related link in `docs/agent-cursor-rules.md` now points at `agents2/TASKS-README.md` and the live `agents2/tasks/` queue (legacy `agents/tasks/` noted only).

## [2.1.102] - 2026-07-26

### Changed

- **Docs renumber (platform operator):** Kept kitchen display as `0015-kitchen-display.md`; moved the platform operator portal guide to `0059-platform-operator-portal.md`. Updated Feature guides, root README, ROADMAP, testing, screenshots, and SaaS paywall cross-links.

## [2.1.101] - 2026-07-26

### Changed

- **Docs renumber (unique prefixes):** Kept VeriFactu as `0018`, WhatsApp as `0024`, and overbooking detection as `0025`; moved Gmail setup → `0056-gmail-setup.md`, deploy CSS fix → `0057-deploy-css-fix-amvara9.md`, and overbooking one-empty-table scenario → `0058-test-scenario-one-empty-table.md`. Updated `docs/README.md`, cross-links, and `config.env.example`.

## [2.1.100] - 2026-07-26

### Changed

- **Reservation confirmation email troubleshooting (0030):** Refreshed the ops runbook — current-status banner with links to Gmail setup (now `0056-gmail-setup.md`) and email research (0005), local Docker diagnose command, log strings aligned with the backend, and indexing under Email & SMTP plus Quick links in `docs/README.md`.

## [2.1.99] - 2026-07-26

### Changed

- **Agent committer:** Stamp/scan-only dirty trees (`agents2` 001/005/008 `time-of-last-review` / `last-scan.json`) are no longer auto-committed; stamps stay local until a commit that also includes real code, docs, or task work (#313).
- **Docs index:** Listed `0051-table-groups-mvp.md` under Feature guides in `docs/README.md` (floor-plan join/unjoin MVP; distinct from 0054 restaurant multi-location groups).

## [2.1.98] - 2026-07-26

### Changed

- **Customers / Factura docs (0017):** Documented that **Customers (Invoice)** (`/customers`) lives under **Operations** in the staff sidebar, not under Catalog & inventory, so operators find the page after the #290 nav regroup.

## [2.1.97] - 2026-07-26

### Changed

- **Root ROADMAP:** Listed shipped Jul areas under Completed Features — Satisfecho Delivery, waiting list, restaurant groups, SaaS signup paywall, platform operator portal, and order/item comments — with links to `docs/0052`–`0054`, platform operator, kitchen display, and reservation guides.

## [2.1.96] - 2026-07-26

### Changed

- **Docs index:** Listed `agent-cursor-rules.md` under Reference & notes in `docs/README.md` (categorized Cursor/agent stack rules; also linked from `AGENTS.md`), next to `agent-loop.md`.

## [2.1.95] - 2026-07-26

### Fixed

- **Satisfecho Delivery product images:** Public `/delivery/{tenantId}` now loads product photos through `/api/uploads/...` (HAProxy → backend) instead of bare `/uploads/...`, which 404’d on the front container. Public menu omits `image_url` when the file is missing on disk so the UI shows placeholders instead of broken images (#312).

### Changed

- **Deploy-via-images plan (0029):** Marked as deferred / not scheduled; `docs/README.md` points operators at the current build-on-server path in 0001 / 0004.

## [2.1.94] - 2026-07-26

### Changed

- **Gmail setup docs (0018):** Mapped Settings Email SMTP fields to Gmail values (host `smtp.gmail.com`, port `587`, TLS on, App Password, optional From) so operators can fill every field without guessing or opening sibling docs.

## [2.1.93] - 2026-07-26

### Changed

- **Docs index:** Listed `PRINTING.md` under Reference & notes in `docs/README.md` (LAN/kitchen ticket print design; not implemented; browser/invoice print supported today).

## [2.1.92] - 2026-07-26

### Changed

- **WhatsApp reminder docs (0024):** Marked reservation reminders as shipped via Twilio (email and/or WhatsApp on Send reminder), documented `TWILIO_*` / `DEFAULT_PHONE_COUNTRY`, and reframed older sections as historical design notes; updated the `docs/README.md` Reference blurb.

## [2.1.91] - 2026-07-26

### Changed

- **Postgres ad-hoc SQL docs (0033):** Documented restaurant group tables as `restaurant_group` and `restaurant_group_member` (with wrong-name hints and a join example by tenant), so operators inspecting multi-location groups avoid relation errors.

## [2.1.90] - 2026-07-26

### Changed

- **Testing docs:** Indexed `npm run debug:working-plan-calendar` in `docs/testing.md` (working-plan §2b and npm scripts table) as a debug inspector for red/staffing days — not a pass/fail smoke; points to `test:working-plan` / `test:working-plan-calendar` for CI checks.

## [2.1.89] - 2026-07-26

### Changed

- **Printing docs:** Marked `docs/PRINTING.md` as design notes / not implemented (no LAN print agent or `/api/print-jobs` yet); clarified that browser and invoice print remain the supported path today.

## [2.1.88] - 2026-07-26

### Changed

- **Kitchen display docs (0015):** Documented Satisfecho Delivery cards (table label “Satisfecho Delivery”), the five active kitchen/bar statuses including `paid`, and that `out_for_delivery` is dropped after courier pickup; updated the Feature guides blurb in `docs/README.md`.

## [2.1.87] - 2026-07-26

### Changed

- **Postgres ad-hoc SQL docs (0033):** Documented the waiting-list table as `waiting_list_entry` (with tenant/status filters and an example active-queue query), and noted that Satisfecho Delivery rows live on `"order"` — there is no separate `deliveryorder` table.

## [2.1.86] - 2026-07-26

### Fixed

- **Translation how-to docs (0012):** Replaced the “add a new language” walkthrough that still used French/`fr` (already shipped) with a hypothetical Portuguese/`pt` example, and noted that §4 locales including `fr` and `bg` should not be recreated.

## [2.1.85] - 2026-07-26

### Changed

- **Root README Features / Access Points:** Documented restaurant groups (create/join/leave, optional shared customers and catalog; link to `docs/0054`) and waiting list (Reservations cue + public `/waitlist/{tenantId}` Access Point; link to `docs/0011`).

## [2.1.84] - 2026-07-26

### Changed

- **Deployment ops docs:** Indexed the hourly unpaid public Satisfecho Delivery cleanup cron (all tenants) in `docs/README.md` (0001 Deployment blurb) and `docs/0004-deployment.md` (deploy steps + summary), with links to `docs/0001` and `scripts/cleanup-unpaid-public-delivery-on-server.sh`, so operators scanning indexes see it beside the tenant-1 demo reset.

## [2.1.83] - 2026-07-26

### Changed

- **Public features docs:** Indexed the marketing `/features` page (no login) in root README Features and Access Points, and in `docs/README.md` Quick links / Feature guides, so contributors can find the prospect-facing capabilities list without digging through changelog or Angular routes.

## [2.1.82] - 2026-07-26

### Changed

- **AGENTS.md Key URLs:** Listed public booking, waiting list, Satisfecho Delivery, marketing features, courier portal, and platform operator entry points so agents can find Jul guest/ops routes without hunting feature docs.

## [2.1.81] - 2026-07-26

### Changed

- **Public guest feedback docs:** Added the public `/feedback/{tenantId}` Access Point in the root README, and short public/staff feedback pointers (`/feedback/:tenantId`, `/guest-feedback`) in the table reservation user guide (`docs/0011`).

## [2.1.80] - 2026-07-26

### Changed

- **Root README Configuration:** Documented `SAAS_PAYWALL_ENABLED` (default `false`; when `true`, new restaurant signups hit `/paywall`) with a link to `docs/0052-saas-signup-paywall.md`.

## [2.1.79] - 2026-07-26

### Fixed

- **Overbooking scenario docs (0058, maps 0025):** Corrected demo venue seat math to `5×4 + 5×2 = 30` (was a wrong `10×4 + 10×2` formula) in `docs/0058-test-scenario-one-empty-table.md` (formerly `0025-test-scenario-one-empty-table.md`), and indexed `check_overbooking_0025` plus its unittest under Backend / data checks in `docs/testing.md`.

## [2.1.78] - 2026-07-26

### Changed

- **Provider portal docs:** Clarified that `/provider` is the supplier catalog portal, not the courier delivery portal (`/courier`), with a callout in `docs/0014-provider-portal.md` and a matching Feature guides row in `docs/README.md` linking to Satisfecho Delivery (`docs/0053`).

## [2.1.77] - 2026-07-26

### Changed

- **Root README Access Points:** Added a Bar display row (`http://localhost:4202/bar`) next to Kitchen, noting it is the beverage-station view of the kitchen display.

## [2.1.76] - 2026-07-26

### Changed

- **Root README Documentation index:** Added links to the July feature guides for SaaS signup paywall (`docs/0052`), Satisfecho Delivery (`docs/0053`), and restaurant groups (`docs/0054`).

## [2.1.75] - 2026-07-26

### Changed

- **Agent loop docs:** `docs/agent-loop.md` now points the live task queue, archive, and orchestrator at `agents2/tasks/`, `agents2/TASKS-README.md`, and `agents2/pos-cursor-loop.sh` (legacy `agents/tasks` mentions kept only for mac-stats sources and the symlink note).

## [2.1.74] - 2026-07-26

### Changed

- **SaaS signup docs:** Documented the guided restaurant signup wizard (`/register` / `/signup`) in `docs/0052-saas-signup-paywall.md` — steps 0–4, paywall vs dashboard finish destinations, 402-exempt priming paths, and a link to the platform operator portal — with a matching `docs/README.md` index blurb.

## [2.1.73] - 2026-07-26

### Changed

- **Security review docs:** Documented public waiting-list signup (PII, per-IP rate limit, no public status page) and restaurant groups (`join_code` capability secret, share flags) in `docs/SECURITY-REVIEW.md`, with links to `docs/0011`, `docs/0020`, and `docs/0054`.

## [2.1.72] - 2026-07-26

### Fixed

- **HAProxy SSL docs (amvara9):** `docs/0026-haproxy-ssl-amvara9.md` now points the production `bind *:443` SSL config at `haproxy.prod.cfg` (not the HTTP-only local `haproxy.cfg`), with a short local/dev vs prod/amvara9 split.

## [2.1.71] - 2026-07-26

### Added

- **Orders edit smoke alias:** `npm run test:review-order-edit` runs the existing staff Orders Edit / modal / status popover Puppeteer smoke, indexed in `docs/testing.md`.

## [2.1.70] - 2026-07-26

### Changed

- **Agent task paths:** Root `AGENTS.md` and always-applied cursor rules now name the live queue as `agents2/tasks/` (with `agents2/TASKS-README.md`) instead of the legacy `agents/tasks/` path.

## [2.1.69] - 2026-07-26

### Changed

- **Root README (Delivery / courier / SaaS):** Features, Multi-tenant roles, and Access Points now cover Satisfecho Delivery, the courier portal, SaaS signup paywall (default off), and the platform operator portal, with links to `docs/0052`, `docs/0053`, and `docs/0015-platform-operator-portal.md`.

## [2.1.68] - 2026-07-26

### Removed

- **One-off Puppeteer scripts:** Deleted undocumented `front/scripts/review-orders-buttons.mjs` and `capture-reports-screenshot.mjs`. Use `npm run capture-screenshots` and `npm run test:reports` instead.

## [2.1.67] - 2026-07-26

### Changed

- **Enhancement reviewer (owned SIGNAL stamp-only):** When the NEW backlog is deep and every digest SIGNAL theme is already owned (or a known false positive) with no failing demo SIGNAL, 008 now stamps only (`stamp-only: owned_signals`) instead of inventing more README/index/smoke micro-tasks; a new unqueued product/demo finding can still queue up to three tasks. Documented in `docs/agent-loop.md`.
- **Agent task queue:** Archived the stale July-12 changelog Unreleased NEW and its retarget follow-up under `agents2/tasks/done/`, and retargeted sibling Evidence so Unreleased ownership points at the committer workflow instead of an outdated root NEW.

## [2.1.66] - 2026-07-26

### Added

- **Platform operator Puppeteer smoke alias:** `npm run test:platform-operator` runs the existing `/platform` login → dashboard metrics → tenant detail delivery-link smoke, indexed in `docs/testing.md` with env/seed notes and a pointer to `docs/0015-platform-operator-portal.md`.

## [2.1.65] - 2026-07-26

### Changed

- **Enhancement preflight (deep NEW backlog):** When root `NEW-*` tasks exceed the pause threshold (default 20), preflight now emits `SIGNAL task_backlog new=…` and increments `G008_TASK_SIGNALS` (in addition to the existing `PAUSE new_backlog`), so the agent loop can stop piling more FEAT/doc tasks until the queue drains. Below the threshold it prints a soft `hint new_queue` only.

## [2.1.64] - 2026-07-26

### Changed

- **No-show docs (reminder channels):** `docs/0019-no-show-implementation-plan.md` now matches the live send-reminder API — email and/or WhatsApp when phone + Twilio are set — with a link to `docs/0024-whatsapp-reminder-notes.md`, and notes shipped scheduled reminders and `PUBLIC_APP_BASE_URL` view/cancel links.

## [2.1.63] - 2026-07-26

### Changed

- **Kitchen display docs (order comments):** `docs/0015-kitchen-display.md` now documents optional order/item comments (#284) — public menu Add comment and order-level note, staff edit on `/orders`, highlighted full text on `/kitchen` and `/bar` — with a short pointer in `docs/0008-order-management-logic.md` and a `docs/README.md` index cue.

## [2.1.62] - 2026-07-26

### Changed

- **Satisfecho Delivery docs (product IDs):** `docs/0053-satisfecho-delivery-order-channel.md` now states that staff and public create accept tenant-scoped `TenantProduct.id` (resolved to `Product`) or legacy `Product.id`, with pointers to the regression pytest and `test:delivery-checkout` (#304).
- **Config example (unpaid delivery cleanup):** `config.env.example` now points operators to the unpaid public Satisfecho Delivery TTL cleanup CLI, amvara9 cron wrapper, and related docs (`docs/0053`, `docs/0001`).

## [2.1.61] - 2026-07-26

### Changed

- **Enhancement preflight (stale docs):** When a stale `docs/*.md` basename is already covered by an open root task, preflight logs `docs_stale_owned` instead of emitting `SIGNAL docs_stale` / bumping `G008_DOC_DRIFT`, so 008 is not re-woken for work already queued.

## [2.1.60] - 2026-07-26

### Changed

- **Testing docs index:** `docs/testing.md` now documents five existing Puppeteer npm aliases — settings logo upload, support access, kitchen timer, book WhatsApp CTA, and my-shift clock QR — with how-to sections and npm scripts table rows.

## [2.1.59] - 2026-07-26

### Changed

- **Security review (public delivery IDs):** `docs/SECURITY-REVIEW.md` now documents that public Satisfecho Delivery create accepts tenant-scoped `TenantProduct.id` or legacy `Product.id` (#304), with a residual note on the dual ID space and the regression test cite.

## [2.1.58] - 2026-07-26

### Added

- **Public delivery-checkout Puppeteer smoke alias:** `npm run test:delivery-checkout` runs the committed public `/delivery/:tenantId` checkout smoke (menu → cart → address → create), indexed in `docs/testing.md` with a courier portal section (`test:courier-actions`).

## [2.1.57] - 2026-07-26

### Added

- **Jul product screenshots:** `capture-screenshots.mjs` now captures public delivery and waitlist (by `TENANT_ID`), plus optional courier and platform operator pages; new PNGs and README sections under `docs/screenshots/` (classic staff shots regenerated in the same run).

## [2.1.56] - 2026-07-26

### Added

- **Puppeteer smoke aliases:** `test:api-docs`, `test:websocket`, `test:amvara9-smoke`, `test:menu-logo`, `test:settings-contact-tax`, and `test:staff-menu-link` in `front/package.json`, indexed in `docs/testing.md` (amvara9 smoke documents its production default `BASE_URL`).

### Fixed

- **Enhancement preflight cadence:** `last_review_iso` now uses the latest agent stamp (`| FEAT:` / `| NEW:`) from the append-only review log instead of the first line, so weekly cadence no longer stays due after a same-week 008 run.

### Changed

- **Docs index (0053 Feature guides):** `docs/README.md` Feature guides blurb for Satisfecho Delivery now covers public checkout, fee/zone/radius, guest `/track`, and unpaid TTL cleanup — not only the staff/courier API (#297 / #306).
- **Courier portal test credentials:** Documented commented `COURIER_EMAIL` / `COURIER_PASSWORD` in `config.env.example`, plus matching manual-testing notes in `AGENTS.md` and the `test:courier-actions` row in `docs/testing.md` (defaults aligned with the smoke script and demo courier seed).
- **Daily demo reset ops doc:** `docs/0001-ci-cd-amvara9.md` now states that tenant-1 daily reset clears/reseeds orders (including Satisfecho Delivery samples), reservations, and waiting-list entries — not only orders and reservations.
- **Rate-limit ops doc:** `docs/0020-rate-limiting-production.md` now lists public `satisfecho-delivery-config` and `delivery-status` GETs under the shared public-menu IP bucket (`RATE_LIMIT_PUBLIC_MENU_PER_MINUTE`), including that track-page polling shares that budget.

## [2.1.55] - 2026-07-26

### Added

- **Public delivery-track Puppeteer smoke alias:** `npm run test:delivery-track` runs the committed invalid-token / error-state smoke for `/delivery/:tenantId/track`, indexed in `docs/testing.md` (cites `docs/0053`).

### Changed

- **Enhancement preflight:** When `check_demo_tables` fails but an open root task already owns demo-table repair, emit an informational line instead of a wake SIGNAL so 008 is not re-woken on the same owned failure.
- **Enhancement preflight:** After a recent CHANGELOG version cut (newest `## [X.Y.Z]` within 2 UTC days, or CHANGELOG touched within 48h with empty Unreleased), suppress `SIGNAL changelog_sparse` so an intentionally empty Unreleased does not keep waking 008.
- **Security review (delivery track):** `docs/SECURITY-REVIEW.md` now covers Satisfecho Delivery zone/fee validation, public config and delivery-status endpoints, the 24h `public_order_token` (pay + track), and the 2h unpaid-create cleanup residual; corrected the stale token-expiry comment in `main.py` (#306).

## [2.1.54] - 2026-07-26

### Added

- **Staff guest-feedback Puppeteer smoke:** `npm run test:guest-feedback-staff` covers staff `/guest-feedback` (login, page shell, list GET, no raw `FEEDBACK.*` keys; empty list OK), indexed in `docs/testing.md`.

## [2.1.53] - 2026-07-26

### Added

- **Public features page Puppeteer smoke:** `npm run test:features` covers `/features` (hero title, category sections, home/register nav), indexed in `docs/testing.md`.

### Changed

- **Agent task queue:** Archived the superseded demo-tables repair NEW (duplicate of #305) under `agents2/tasks/done/`, and retargeted the preflight skip-owner wording so it no longer points at that dead task.

## [2.1.52] - 2026-07-25

### Added

- **Bar display Puppeteer smoke:** `npm run test:bar-display` covers staff `/bar` route load (chrome + Bar title, not Kitchen), indexed in `docs/testing.md`.

## [2.1.51] - 2026-07-25

### Added

- **Guided signup wizard Puppeteer smoke:** `npm run test:guided-signup-wizard` covers `/register` step 0 intro → account fields + Back/Next without creating a tenant, indexed in `docs/testing.md`.

## [2.1.50] - 2026-07-25

### Added

- **Staff Satisfecho Delivery Puppeteer smoke:** `npm run test:staff-delivery` covers staff `/staff/orders` create + edit delivery metadata (channel badge, address, phone), indexed in `docs/testing.md`.

## [2.1.49] - 2026-07-25

### Added

- **Order comments Puppeteer smoke:** `npm run test:order-comments` covers public Take Away item + order notes through kitchen highlight (`.item-notes` / `.order-notes`), indexed in `docs/testing.md`.

### Changed

- **Front entrypoint commit-hash regen:** `docker-entrypoint.sh` now logs regen progress, the written `version`/`commitHash`, and clear warnings on script failure or package mismatch (container still starts). Dockerfile `ENTRYPOINT` uses the bind-mounted `/app/docker-entrypoint.sh` so host edits apply without baking a stale script into the image.

### Fixed

- **Landing footer git hash:** Regenerated `commit-hash.ts` so the landing footer short hash matches current `HEAD` while semver stays aligned with `package.json` (strict `test:landing-version` no longer needs a skip workaround).

## [2.1.48] - 2026-07-25

### Added

- **Restaurant groups Puppeteer smoke:** `npm run test:restaurant-groups` covers Settings → Restaurant group (create/join or member/leave), indexed in `docs/testing.md` and pointed from `docs/0054-restaurant-groups.md`.

## [2.1.47] - 2026-07-25

### Fixed

- **Chinese and Hindi UI strings:** Filled ~189 missing keys in `zh-CN.json` and `hi.json` (auth OTP, orders/tax, public take-away, Revolut payments, products availability/tax, reservations, reports overbooking, providers/taxes/OTP/UI modules, Settings delivery-integrations labels, co-owner hint, working-plan toasts) so Simplified Chinese and Hindi match English leaf keys.

## [2.1.46] - 2026-07-25

### Fixed

- **Catalan UI strings:** Filled ~132 missing `ca.json` keys (auth OTP, orders/tax, products availability, reservations, reports overbooking, providers/taxes/OTP/UI modules, Settings delivery-integrations labels, co-owner hint, working-plan toasts) so Catalan matches English leaf keys.

## [2.1.45] - 2026-07-25

### Fixed

- **Bulgarian UI strings:** Filled 25 missing `bg.json` keys (`PRODUCTS.PRODUCT_IMAGE` and Settings delivery-integrations labels) so Bulgarian matches English leaf keys.

## [2.1.44] - 2026-07-25

### Fixed

- **French UI strings:** Filled ~149 missing `fr.json` keys (auth OTP, kitchen stations, settings taxes/providers/security/UI modules, reservations notes/overbooking, products tax/availability, orders/tax, and related menu/reports/working-plan strings) so French matches English leaf keys.

## [2.1.43] - 2026-07-25

### Fixed

- **German UI strings:** Filled ~91 missing `de.json` keys (auth OTP, settings taxes/providers/security, reservations notes/overbooking, products tax/availability, book validation, and related menu/orders/reports strings) so German matches English leaf keys.

## [2.1.42] - 2026-07-25

### Added

- **Waiting list Puppeteer smoke:** `npm run test:waiting-list` covers public `/waitlist/:tenantId` join (success path) and staff Reservations → Waitlist tab (`GET /waiting-list`), indexed in `docs/testing.md`.

## [2.1.41] - 2026-07-25

### Fixed

- **Spanish UI strings:** Filled ~15 missing `es.json` keys (book validation, working-plan toasts, reservation cancel/rate-limit, auth, menu customize, co-owner hint) and corrected the terms-of-service placeholder key typo so Spanish matches English leaf keys.

## [2.1.40] - 2026-07-25

### Changed

- **Features page Delivery card:** Satisfecho Delivery marketing copy now mentions zone-based fees and customer order tracking across all shipped locales, matching the shipped Delivery product.

## [2.1.39] - 2026-07-25

### Added

- **Demo waiting-list check:** `python -m app.seeds.check_demo_waiting_list` fails when tenant 1 lacks at least one `waiting` and one `notified` Waitlist row, so ops/preflight catch a dropped waiting-list seed instead of relying on `demo_tables_check=ok` alone.

## [2.1.38] - 2026-07-25

### Added

- **Demo delivery orders check:** `python -m app.seeds.check_demo_delivery_orders` fails when tenant 1 has no Satisfecho Delivery sample orders (soft-warns only if courier is unassigned), so ops/preflight catch a dropped Delivery seed instead of relying on `demo_tables_check=ok` alone.

## [2.1.37] - 2026-07-25

### Added

- **Demo courier user:** Tenant 1 seed / `reset_demo_data` / bootstrap now create a courier-role user when missing (defaults match courier Puppeteer smokes), so Satisfecho Delivery samples can assign courier and `out_for_delivery` after daily reset. Run: `python -m app.seeds.seed_demo_courier_user`.

## [2.1.36] - 2026-07-25

### Added

- **Demo delivery fee/zone settings:** Tenant 1 seed / `reset_demo_data` now sets a demo Satisfecho Delivery fee (250¢) and Madrid postal codes when unset, so public `/delivery/1` shows a fee and rejects out-of-zone codes after daily reset. Check: `python -m app.seeds.check_demo_delivery_settings`.

## [2.1.35] - 2026-07-25

### Fixed

- **Demo products seed for partial tenants:** `seed_demo_products` now fills missing default menu names on tenants that already have catalog/import rows (instead of skipping any non-empty tenant), and `check_demo_products` verifies tenant 1 has the full demo set.
- **Delivery checkout smoke harness:** Public `test-delivery-checkout.mjs` now waits for the real cart step (`ul.delivery-cart-list`) and the cart Continue control, so it no longer false-passes on menu “View cart / Ver carrito” copy and then fails opening the address step.

## [2.1.34] - 2026-07-25

### Added

- **Marketing artifact refresh helper:** `scripts/refresh-expired-marketing-artifacts.sh` detects expired or missing GitHub Actions artifacts for sites in `config/marketing-sites.json` and can re-dispatch each site’s Build workflow (`DRY_RUN=1` / `WAIT=1`) before Deploy (#309).
- **Orphan provider image cleanup:** Seed `python -m app.seeds.clear_orphan_provider_product_images` clears DB image refs when files are missing under `uploads/providers/`.

### Changed

- **README discoverability:** Added license/stars/last-commit and stack badges, a topics line, live demo CTA, a three-image screenshot collage (dashboard, kitchen, menu), and a Star History chart; screenshots index updated to match (#310).
- **Agent queue paths:** Live prompts, `TASKS-README`, archive helper examples, and `pos-cursor-loop` now point at `agents2/tasks/`; added `agents2/tasks/done/README.md` and main coder prompt `agents2/002-coder/CODER.md`.
- **Enhancement reviewer backlog pause:** Preflight emits `PAUSE new_backlog` when the NEW queue is deep so 008 stamps only and does not mint more tasks until the coder drains work.

### Fixed

- **Catalog provider images:** API responses only include provider product image URLs when the file exists on disk, so staff Catalog no longer hammers missing `/uploads/providers/...` paths with 404s.
- **Deploy marketing fetch:** Artifact download skips expired Actions artifacts, scans recent successful runs, and reports clear HTTP/expiry errors; sync verify checks `deploySubpath` index paths and missing files so Deploy to amvara9 fails with actionable guidance instead of opaque download failures (#309).

## [2.1.33] - 2026-07-25

### Added

- **Public marketing SEO:** Per-route titles, meta descriptions, canonical and Open Graph/Twitter tags for public pages; `robots.txt`, `sitemap.xml`, and share image; nginx serves crawl files as static assets (not the SPA shell); staff/auth routes are `noindex` (#307).

## [2.1.32] - 2026-07-23

### Added

- **Satisfecho Delivery zones, fees, and live tracking:** Restaurants can set a delivery fee, radius, and/or allowed postal codes; public checkout validates the address and includes the fee in payment totals; customers get a token-gated track page with live statuses (received → preparing → out for delivery → delivered) without maps (#306).

### Fixed

- **Public order token verify:** HMAC digests that contain `.` no longer fail intermittent token checks on public delivery flows.

## [2.1.31] - 2026-07-23

### Added

- **Demo waiting-list entries:** Tenant 1 seed / `reset_demo_data` now clears and reseeds a small Waitlist queue (waiting + notified) so staff Waitlist and public `/waitlist/1` stay populated after daily demo reset.

## [2.1.30] - 2026-07-23

### Added

- **Demo Satisfecho Delivery orders:** Tenant 1 seed / `reset_demo_data` now creates a small mix of paid and active Satisfecho Delivery samples (address/phone, optional courier when one exists) so Delivery, kitchen, and courier demos stay populated after daily reset.

### Changed

- **Committer version bumps:** Regenerating and staging `commit-hash.ts` via `get-commit-hash.js` is now required whenever `front/package.json` is bumped, so the landing footer and landing-version smoke stay aligned with the new semver.

## [2.1.29] - 2026-07-23

### Added

- **i18n locale leaf-parity check:** `scripts/check-i18n-locale-parity.py` compares every shipped UI locale to `en.json` and fails when sibling locales miss keys; documented in `docs/testing.md`, referenced from the ngx-translate Cursor rule, and optionally runnable warn-only from `go-ahead-loop.sh` via `I18N_PARITY_CHECK=1`.

### Changed

- **Public `/features` page:** Added July capability cards — waiting list, Satisfecho Delivery, order comments, restaurant groups, guided signup, SaaS trial/paywall, and platform oversight — with localized copy in all shipped locales.
- **Enhancement reviewer stamp:** Preflight now rotates `agents2/008-enhancement-reviewer/time-of-last-review.txt` when it exceeds a line cap (default 100), archiving older lines instead of letting the stamp grow without bound.

## [2.1.28] - 2026-07-23

### Added

- **Unpaid public delivery cleanup cron:** Documented amvara9 host cron (hourly UTC) and added `scripts/cleanup-unpaid-public-delivery-on-server.sh` so abandoned unpaid public Satisfecho Delivery checkouts are cleaned on all tenants (separate from tenant-1 demo reset). Cron is installed and verified on amvara9 (hourly UTC at `:15`).
- **SaaS paywall production enablement:** Ordered ops checklist in `docs/0052` (Stripe Price, webhook secret, grandfather check, flag flip, smoke) plus an amvara9 keep-off pointer in `docs/0001`; paywall stays off until operators follow the runbook.

### Fixed

- **Public Satisfecho Delivery checkout:** Catalog items from the public menu now create orders successfully — line IDs resolve `TenantProduct` → `Product` (still accepts legacy `Product.id`); regression pytest + delivery smoke cover create past cart (#304).

## [2.1.27] - 2026-07-23

### Added

- **Unpaid public delivery cleanup:** Ops can cancel abandoned unpaid Satisfecho Delivery guest checkouts past a 2h TTL (`python -m app.seeds.cleanup_unpaid_public_delivery`); staff-created delivery orders are never touched, and kitchen is not re-notified.

### Changed

- **Security review:** Residual risk for unpaid public delivery orders now documents the TTL cleanup seed and how to run it.

## [2.1.26] - 2026-07-23

### Added

- **Platform operator Delivery link:** Tenant detail Public pages now include a deep-link to Satisfecho Delivery checkout (`/delivery/{tenantId}`), with i18n labels and docs; the platform-operator smoke asserts the link.

## [2.1.25] - 2026-07-23

### Fixed

- **Demo tables seed:** Tenants with a partial T01–T10 set (especially tenant 1) are repaired on seed — missing names are created and wrong seat counts corrected — so `check_demo_tables`, Take Away, and demo/book smokes stay green (#305).

## [2.1.24] - 2026-07-22

### Added

- **Public Satisfecho Delivery checkout:** Guests can order delivery at `/delivery/{tenantId}` (menu → cart → address → pay) via `POST /public/tenants/{id}/satisfecho-delivery`; kitchen notify waits until Stripe/Revolut payment with `public_order_token` (#302). Follow-up: catalog menu IDs (`TenantProduct`) still need mapping on create (#304).
- **Daily demo data reset:** Documented amvara9 host cron (`0 4 * * *` UTC) and made `scripts/reset-demo-data-on-server.sh` executable so tenant 1 orders/reservations can refresh automatically.
- **Restaurant groups guide:** Documented multi-location restaurant groups (create/join/leave, share customers/products, Settings tab) in `docs/0054-restaurant-groups.md` and indexed it under Feature guides.

### Changed

- **Rate limiting ops doc:** `docs/0020` now lists waiting-list, public Satisfecho Delivery create, and marketplace delivery webhook limits (shared public-menu IP bucket) plus related env vars.

### Fixed

- **Demo data reset:** Clearing tenant 1 orders no longer fails on fiscal invoice / inventory FK rows; child rows are deleted before orders.
- **Delivery webhook:** `POST /public/webhooks/delivery/{token}` is rate-limited with the public-menu IP bucket and returns SlowAPI headers.

## [2.1.23] - 2026-07-22

### Added

- **SaaS signup paywall:** New restaurant signups can be required to start a free trial or subscribe before using the staff app (`/paywall`, 402 lock when enabled). Existing tenants stay grandfathered; paywall stays **off** by default (`SAAS_PAYWALL_ENABLED`) (#296).
- **SaaS Stripe webhook:** `POST /saas/webhook` verifies Stripe signatures and syncs trial/active/`past_due`/cancel without relying only on browser `confirm-checkout` (#296).
- **Paywall smoke test:** `npm run test:paywall` covers register → `/paywall` → trial → dashboard (skips cleanly when paywall is off).

### Changed

- **Security review:** Documented SaaS paywall middleware, platform Checkout, and signed billing webhook; residual risk is ops readiness before enabling the paywall in production (#296).

## [2.1.22] - 2026-07-21

### Fixed

- **ws-bridge build:** Pin Compose images to `pos-back` / `pos-ws-bridge` and build the bridge `FROM pos-back` via Compose `additional_contexts`, so clones named `pos` (not `pos2`) no longer fail resolving `pos2-back`; CMD remains `uvicorn main:app` on **8021** (#303).

## [2.1.21] - 2026-07-21

### Added

- **Courier status actions:** On `/courier/orders/{id}`, couriers can **accept**, **reject**, **mark picked up** (`out_for_delivery`), and **mark delivered**; `POST /courier/orders/{id}/actions` keeps Order/OrderItem status aligned with kitchen (#301).

## [2.1.20] - 2026-07-21

### Added

- **Courier Mine tab:** Couriers see staff-assigned deliveries on `/courier` (**Mine**) with address, customer, phone, and totals; **Available** shows unassigned open orders; list API includes assignment fields; refresh control on the courier home (#300).

## [2.1.19] - 2026-07-21

### Added

- **Staff Satisfecho Delivery UI:** On `/staff/orders`, staff can create delivery orders (address required, optional courier), filter a **Delivery** tab with channel badges, and edit address/courier via the existing delivery API; `GET /users/couriers` feeds the assign dropdown (#299).

## [2.1.18] - 2026-07-21

### Removed

- **Marketing / Gustazo:** Stopped serving and syncing the Gustazo marketing SPA from POS — removed from **`config/marketing-sites.json`**, deleted **`front/sites/gustazo/`**, dropped Gustazo-only deploy smoke and legacy fetch wrappers; remaining marketing sites continue via the generic sync (#298).

## [2.1.17] - 2026-07-20

### Added

- **Satisfecho Delivery orders:** Staff can create and update first-party delivery orders (channel, address, phone, optional courier) via the API; kitchen/order lists distinguish them from table orders, and courier list/detail return the real delivery address and phone instead of nulls (#297).

## [2.1.16] - 2026-07-14

### Added

- **Platform operator portal:** Tenant list and detail pages for operators — owner/staff contact emails, activity stats (products, tables, users, orders, reservations), and links to each tenant's public menu, booking, and waitlist pages at **`/platform/tenants/{id}`** (#292).

### Changed

- **Platform operator dashboard:** All-tenants table with owner contact and public-menu shortcuts; recent logins show user email and tenant name with links to tenant detail (#292).

## [2.1.15] - 2026-07-13

### Fixed

- **Deploy to amvara9 (GitHub Actions):** CI now connects over SSH port **60022** (amvara9 default) instead of port 22 — `ssh-keyscan`, `ssh`, and marketing-site `rsync` all honor optional repository Variable **`DEPLOY_SSH_PORT`**; restores checkout, bundle sync, and post-deploy smoke after the server moved SSH off port 22 (#294).

### Changed

- **Reservation user guide:** `docs/0011-table-reservation-user-guide.md` now documents the waiting list — guest flow at **`/waitlist/:tenantId`**, the link from **`/book/:tenantId`**, staff queue actions on **`/reservations`**, and local/production URL examples; **`README.md`** pointers updated to match (#282).
- **Release / production:** Promoted **`development` → `master`** and deployed to amvara9 (**satisfecho.de**) — live **2.1.15** (#295).

## [2.1.14] - 2026-07-12

### Added

- **Platform operator portal:** SaaS operators sign in at **`/platform/login`** (platform auth scope) and view a read-only dashboard — tenant count, sign-ups in the last 30 days, login activity (24h and 7d), and tables of recent tenants and logins; accounts use the **`platform_operator`** role and are provisioned via **`ensure_platform_operator`** seed + env (#292).

### Changed

- **Staff sidebar:** **Customers (Invoice)** (`/customers`) now appears under **Operations** alongside tables and kitchen/bar displays instead of under Catalog & inventory — the Operations group also shows when customers is the only visible sub-item (#290).
- **Agent loop:** Weekly **enhancement reviewer** (agent **008**) scans docs/changelog drift, demo seed health, and the task queue — emits preflight signals and creates up to three **`FEAT-0-*`** / **`NEW-0-*`** follow-up tasks; **`pos-cursor-loop.sh`** adds an **`enhancement`** step (#291).
- **Release / production:** Promoted **`development` → `master`** and deployed to amvara9 (**satisfecho.de**) — live **2.1.14** (#293).

## [2.1.13] - 2026-07-12

### Added

- **Restaurant groups:** Multi-location operators can create a restaurant group with a join code and optionally share billing customers and products across linked tenants — sibling locations see shared data read-only; Settings includes a **Restaurant group** tab for owners (#283).
- **Staff sidebar:** Grouped navigation with collapsible sections (**Operations**, **Planning**, **Catalog & inventory**, **Administration**) — primary links (Home, My shift, Orders) stay top-level; groups hide when all child modules are disabled (#287).

### Changed

- **New signups:** Fresh restaurants get a tighter default navigation — **Tables**, **Reservations**, and **Kitchen & bar** on; **Working plan**, **Product catalog**, **Inventory**, **Contracts**, and **Users** off — existing tenants are unchanged (#288).
- **Release / production:** Promoted **`development` → `master`** and deployed to amvara9 (**satisfecho.de**) — live **2.1.13** at **`a8bfe7f9`** via manual SSH after GitHub Actions **deploy-amvara9** could not reach the server (SSH refused from runners); post-deploy smoke passed for waitlist, signup wizard, order comments, and **`/api/health`** (#285, #289).

## [2.1.12] - 2026-07-12

### Added

- **Order comments:** Guests can add optional free-text notes per cart line and for the whole order on the table menu — comments appear on the current-order tracker, kitchen and bar displays (highlighted), and staff order cards with inline edit (#284).
- **Guided signup:** New multi-step restaurant onboarding at **`/register`** and **`/signup`** — collect address, phone, and maps link; confirm default starter beverages (coffee, Coca Cola, water) with prices; optional product photos; finish with a QR code for the public menu (#286).

## [2.1.11] - 2026-07-12

### Added

- **Waiting list:** Guests can join a tenant waiting queue with name, party size, and phone — public form at **`/waitlist/:tenantId`** and a link from **`/book/:tenantId`** when no table is available; staff manage the queue on **`/reservations`** (Waiting list tab) with mark notified, book table, seated, and cancel actions (#282).

## [2.1.10] - 2026-07-07

### Fixed

- **Demo Take Away menu:** Beverages no longer show wrong catalog images and descriptions (e.g. Coca Cola with a beer photo) — demo product linking now matches catalog names only, repairs mismatched links from prior round-robin runs, and clears stale `Product` image/description backfills when no catalog link remains (#280).

### Changed

- **Release / production:** Promoted **`development` → `master`** (including hotfix for stale demo product backfills) and confirmed green **Deploy to amvara9** on production (**satisfecho.de**) — live **2.1.10** at **`f0433b5a`** (#281).

## [2.1.9] - 2026-07-06

### Fixed

- **Table menu:** Guests opening the ordering menu via table QR or the landing **Take Away** demo no longer see each dish twice — `GET /menu/{table_token}` now skips legacy `Product` rows already represented by linked `TenantProduct` entries, matching the public-menu dedup from #258 (#278).

### Changed

- **Release / production:** Promoted **`development` → `master`** and confirmed green **Deploy to amvara9** on production (**satisfecho.de**) — live **2.1.9** includes the table-menu dedup fix (#279).

## [2.1.8] - 2026-07-02

### Added

- **Features page:** New public **`/features`** route lists Satisfecho capabilities in four groups (guest experience, operations, business, platform) — QR menu, kitchen and bar displays, shift planning, online payments, inventory, courier portal, and more — with navigation from the landing page and localized copy in all locale files.
- **Marketing / Ariba Döner:** Registered **satisfecho.de/ariba-doner/es/** — manifest entry for **`090_aribakebab`** (slug **`ariba-doner`** matches SPA **`baseHref`**; artifact **`ariba-doner-satisfecho-deploy`**; **`deploySubpath`** **`es`**).
- **Marketing / Amigo Kebab:** Registered **satisfecho.de/amigo-kebab/es/** — manifest entry for **`089_amigokebab`** (slug **`amigo-kebab`** matches SPA **`baseHref`**; artifact **`amigo-kebab-satisfecho-deploy`**; **`deploySubpath`** **`es`**).
- **Marketing / La Bella Toscana:** Registered **satisfecho.de/labellatoscana/es/** — manifest entry for **`060_labellatoscana`** (slug **`labellatoscana`** matches SPA **`baseHref`**; artifact **`labellatoscana-satisfecho-deploy`**; **`deploySubpath`** **`es`**).
- **Marketing / Pizza Luna:** Registered **satisfecho.de/pizzaluna/es/** — manifest entry for **`087_pizzalluna`** (slug **`pizzaluna`** matches SPA **`baseHref`**; artifact **`pizzaluna-satisfecho-deploy`**; **`deploySubpath`** **`es`**).
- **Marketing / Rico Kebab:** Registered **satisfecho.de/rico-kebab/** — manifest entry for **`088_ricokebab`** (slug matches SPA **`baseHref`** `/rico-kebab/`; artifact **`rico-kebab-satisfecho-deploy`**).
- **Demo tables:** **`seed_demo_tables`** idempotently ensures a **Take Away** table on tenant 1 so visitors can try guest ordering from the public landing demo without a physical table QR.

### Fixed

- **Products / categories:** Translated category strings (e.g. **Entrantes**, **Plat principal**, **Vorspeisen**) are normalized to canonical English keys on product create/update, bulk import, and catalog merge — staff no longer see duplicate category options for the same logical category; existing data is repaired idempotently on migrate (#265).
- **Products / categories:** Staff **Products** category dropdowns and **Product categories** now always list all five standard categories (Starters, Main Course, Desserts, Beverages, Sides) even when the tenant has no products yet — `GET /catalog/categories` seeds empty subcategory lists for missing standard keys in fixed order (#263).
- **Marketing / Rico Kebab:** Corrected manifest and **`front/sites/`** slug from **`ricokebab`** to **`rico-kebab`** so paths match production **`/rico-kebab/`** and the SPA **`baseHref`** (`088_ricokebab`).
- **Marketing / Rico Kebab:** Sync **`rico-kebab-satisfecho-deploy`** into **`front/sites/rico-kebab/es/`** (manifest **`deploySubpath`**) so **`/rico-kebab/es/`** serves the current bundle instead of a stale root-only sync (`088_ricokebab` #2).
- **Marketing / Boss Kebab:** Restored **satisfecho.de/bosskebabypizzeria/** — `baseHref` and deploy paths now match the live slug so Angular scripts and styles load instead of 404 (blank page) after marketing build and amvara9 sync (`085_Bosskebabypizzeria` #1).

### Changed

- **Landing and features pages:** Extracted the dark marketing footer (bottom CTA, account/partners/support links, version bar) into a shared component — **`/features`** now shows the same footer as the home page instead of a minimal back-home strip.
- **Landing page:** Hero headline now leads with **“Reduce your application costs by 50%”** and a subtitle about replacing multiple single-purpose apps with one open-source platform; the features preview section links to the full **`/features`** page.
- **Landing page:** Restructured the site footer — bottom CTA, grouped **Account / Partners / Support** link columns, and version bar now share one dark footer block (no fixed overlay); QR demo card keeps a single **Open menu** action; new footer section labels in all locale files.
- **Landing page:** Redesigned the **For guests** section with a dark two-column layout — clearer table-name label, **Try demo: Take Away** one-click ordering, and new localized strings in all locale files; table lookup and multi-restaurant picker behaviour unchanged.
- **Contact us:** **Contact us** mailto links on login, register, and provider auth pages now use **hello@satisfecho.de**, matching the landing footer and current support address.
- **Landing page:** Redesigned the public home with a dark gradient hero, navigation bar, feature cards, and a dedicated **QR demo** section — scannable code for tenant 1's live public menu with step-by-step copy, Book/Login actions, and localized strings in all locale files; guest table lookup and footer links unchanged.
- **Repository:** Removed a committed diagnostics zip archive from the repo root and added **`diagnostics_*.zip`** to **`.gitignore`** so local diagnostics dumps are not tracked in version control (#267).
- **Marketing / Wimpi:** Removed carta and booking CTAs from **satisfecho.de/wimpi/es/** per venue request after marketing build and amvara9 deploy (`083_wimpi`).
- **Public menu API:** `GET /public/tenants/{id}/menu` groups sections by **subcategory** when set (e.g. Carta principal, Ensaladas); otherwise by the **localized** standard category label (Desserts → Postres for `lang=es`) — marketing sites and `/public-menu/:id` show restaurant-style section titles instead of raw English category keys.
- **Marketing / Wimpi:** Updated Google reviews copy on **satisfecho.de/wimpi/es/** — **4,8 / 5 · 239 valoraciones** (was 4,7 / 102) to match the current Google listing after marketing build and amvara9 deploy (`083_wimpi` #2).
- **Agent loop:** Per-step wall-clock limits on **`cursor-agent`** in **`agents2/pos-cursor-loop.sh`** (default **25** minutes; tester **32** minutes for deploy polling) so a hung step does not block the whole cycle — on timeout the orchestrator logs and continues; **`TESTING-`** / **`WIP-`** tasks are retried on the next pass. Disable with **`AGENT_CURSOR_TIMEOUT=0`**.
- **Marketing / Gustazo:** Removed gallery image **`local-04`** from live **satisfecho.de/gustazo/** after **`gustazo-dist`** bundle sync (`040_gustazo` #1).
- **Agent tasks:** **`move-agent-task-to-done.sh`** now parses **`CLOSED-MKT-<repo>-<issue>-…`** filenames when archiving marketing tasks to **`agents2/tasks/done/`**.
- **Marketing / Wimpi:** Mobile opening-hours layout on **satisfecho.de/wimpi/es/** — short weekday labels (LUN–DOM), wrapped rows on narrow viewports, full names from 720px up (`083_wimpi` #1).
- **Agent loop:** Added **005 marketing repos reviewer** — preflight scans **`satisfecho/NNN_slug`** org repos for new sites, bundle updates, and untracked issues; registers **`config/marketing-sites.json`** and **`front/sites/<slug>/`**, can trigger **Deploy to amvara9**, and queues **`FEAT-MKT-*`** tasks for the feature coder. Wired into **`agents2/pos-cursor-loop.sh`** with gating env vars; **`010-feature-coder.md`** documents marketing-repo work.
- **Release / production:** Promoted **`development` → `master`** and confirmed green **Deploy to amvara9** on production (**satisfecho.de**) — live **2.1.8** at merge **`de9faf4f`**.

## [2.1.7] - 2026-06-29

### Added

- **Courier portal (Phase 2):** Couriers see a mobile-friendly delivery order list after login — **Available**, **Mine**, and **Completed** tabs with status badges and item summaries; tap an order for detail (customer, pickup context, notes, line items, total). New **`GET /courier/orders`** and **`GET /courier/orders/{id}`** APIs are tenant-scoped for delivery orders; **Mine** stays empty until assignment ships in a later phase (#275).

### Changed

- **Landing page:** Public home now shows a single **Restaurant Demo** card for tenant 1 instead of listing every registered restaurant — localized title via **`LANDING.RESTAURANT_DEMO_NAME`**; Book, login, and public-menu QR links still target tenant 1 (#276).
- **Release / production:** Promoted **`development` → `master`** and confirmed green **Deploy to amvara9** on production (**satisfecho.de**) — live **2.1.7** at merge **`34e1eed4`** (#277; includes courier order list #275 and landing demo filter #276).

## [2.1.6] - 2026-06-22

### Fixed

- **Courier / auth:** Aligned production **`user.role`** column from legacy PostgreSQL enum **`userrole`** to **`user_role`** so **`courier`** role queries succeed — **`POST /api/token?scope=courier`** no longer returns **500** after migrate (#273).

## [2.1.5] - 2026-06-21

### Added

- **Courier portal (Phase 1):** New **Courier** role for tenant-scoped delivery drivers — owners/admins assign it in **Users**; couriers sign in at **`/courier/login`**, land on a placeholder **`/courier`** home, and use **`GET /courier/me`** for profile and tenant context; route guards keep couriers off staff pages and staff off courier routes (#270).
- **Pricing helper:** Optional per-serving ice, lemon, and other garnish costs in a visible **Garnishes** section — amounts combine with **Extra fixed cost** before pour-cost or margin calculation (#269).

### Fixed

- **Working plan / schedule:** Staff with `schedule:write` who are not owner or admin can create, edit, delete, and bulk-assign **only their own** shifts — cross-user writes return 403 on the API and edit/delete controls are hidden for others' shifts in **Working plan** (#271).

### Changed

- **Release / production:** Promoted **`development` → `master`** and deployed to amvara9 (**satisfecho.de**) — live **2.1.5** (#272; includes courier portal #270, pricing helper #269, schedule write auth #271).

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
