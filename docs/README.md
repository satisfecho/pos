# POS2 Documentation

This folder contains deployment guides, feature documentation, implementation plans, and reference notes. The main [README.md](../README.md) and [ROADMAP.md](../ROADMAP.md) in the repo root link to specific docs below.

---

## Quick links

| Need to… | See |
|----------|-----|
| Run Puppeteer/UI tests | [testing.md](testing.md) |
| Deploy to a server | [0004-deployment.md](0004-deployment.md) |
| Set up CI/CD (amvara9) | [0001-ci-cd-amvara9.md](0001-ci-cd-amvara9.md) |
| Configure Gmail for email | [0018-gmail-setup.md](0018-gmail-setup.md) |
| Understand reservations (staff + public) | [0011-table-reservation-user-guide.md](0011-table-reservation-user-guide.md) |
| Rate limits (production) | [0020-rate-limiting-production.md](0020-rate-limiting-production.md) |
| Capture screenshots | [screenshots/README.md](screenshots/README.md) |

---

## Deployment & operations

| Doc | Description |
|-----|-------------|
| [0001-ci-cd-amvara9.md](0001-ci-cd-amvara9.md) | CI/CD: deploy to amvara9 on push to master (GitHub Actions, SSH key, secrets). |
| [0004-deployment.md](0004-deployment.md) | Deployment guide: configuration (API_URL, WS_URL, CORS), deploy steps (git pull, compose, migrations, seeds). |
| [0024-deploy-css-fix-amvara9.md](0024-deploy-css-fix-amvara9.md) | Fix for stale front build on deploy (force front image rebuild, Cache-Control for index.html). |
| [0026-haproxy-ssl-amvara9.md](0026-haproxy-ssl-amvara9.md) | HAProxy SSL on amvara9: durable cert path (certbot/haproxy-certs), reload without overwriting certs. |
| [0029-deployment-images-plan-next-month.md](0029-deployment-images-plan-next-month.md) | **Todo (next month):** Deploy via images (CI build → registry → pull on server), two-slot so production stays up, CI production build to catch errors. |

---

## Email & SMTP

| Doc | Description |
|-----|-------------|
| [0005-email-sending-options.md](0005-email-sending-options.md) | Email sending options: Proton Mail, SendGrid, Resend, Gmail; comparison and config. |
| [0018-gmail-setup.md](0018-gmail-setup.md) | Gmail setup: create account, 2FA, App Password, POS Settings → Email (SMTP). |

---

## Feature guides (user-facing)

| Doc | Description |
|-----|-------------|
| [0011-table-reservation-user-guide.md](0011-table-reservation-user-guide.md) | Table reservations: staff flows, public booking at `/book/:tenantId`, view/cancel at `/reservation?token=...`. |
| [0014-provider-portal.md](0014-provider-portal.md) | Provider portal: register, login, catalog at `/provider` (tile/list, add/edit/delete products). |
| [0015-kitchen-display.md](0015-kitchen-display.md) | Kitchen display: full-screen at `/kitchen`, auto-refresh, WebSocket, optional sound. |
| [0016-reports.md](0016-reports.md) | Reports (Sales & Revenue): date range, summary, by product/category/table/waiter, CSV/Excel export. |
| [0017-billing-customers-factura.md](0017-billing-customers-factura.md) | Billing customers (Factura): register company details, search, print invoice with “Bill to”. |
| [0028-tenant-public-branding.md](0028-tenant-public-branding.md) | Tenant public branding: background colour and header image for book, menu, reservation-view. |

---

## Implementation plans & specs

| Doc | Description |
|-----|-------------|
| [0002-customer-features-plan.md](0002-customer-features-plan.md) | Customer features: registration, login, email verification, MFA, order history, invoices. |
| [0008-order-management-logic.md](0008-order-management-logic.md) | Order management logic: lifecycle, session rules, status reset, edge cases. |
| [0009-table-pin-security.md](0009-table-pin-security.md) | Table PIN security: activation, 4-digit PIN, rate limiting (Redis). |
| [0010-table-reservation-implementation-plan.md](0010-table-reservation-implementation-plan.md) | Table reservation implementation plan: scope, reference systems, schema, API. |
| [0019-no-show-implementation-plan.md](0019-no-show-implementation-plan.md) | No-show feature: status, reminder emails, implementation steps. |
| [0021-working-plan.md](0021-working-plan.md) | Working plan (shift schedule): implementation plan and status. |
| [0025-reservation-overbooking-detection.md](0025-reservation-overbooking-detection.md) | Reservation overbooking detection: slot capacity, overbooking report, 400 on over capacity. |
| [0025-test-scenario-one-empty-table.md](0025-test-scenario-one-empty-table.md) | Test scenario: all tables seated except one empty (maps 0025 requirements to this case). |
| [0031-order-customizations-plan.md](0031-order-customizations-plan.md) | GitHub **#50**: pizza-style order modifiers — existing `ProductQuestion` / `customization_answers`, staff UI gap, phased plan. |
| [0032-github-issues-roadmap.md](0032-github-issues-roadmap.md) | GitHub **#52–#54**: umbrella roadmap (warehouses, kitchen SLAs, marketing/comms). |

---

## Reference & notes

| Doc | Description |
|-----|-------------|
| [0007-implementation-verification.md](0007-implementation-verification.md) | Implementation verification: what’s done vs Phase 4 (batch, audit, etc.). |
| [0012-translation-implementation.md](0012-translation-implementation.md) | Translation (i18n): frontend, backend, DB content. |
| [0013-verification-alternatives.md](0013-verification-alternatives.md) | Customer verification alternatives (SMS, etc.). |
| [0020-rate-limiting-production.md](0020-rate-limiting-production.md) | Rate limiting: limits (login, register, payment, public menu, upload, admin), Redis, X-Forwarded-For, tests. |
| [0022-oauth-social-login-notes.md](0022-oauth-social-login-notes.md) | OAuth / social login (Google, Microsoft, etc.): notes and recommendation. |
| [0023-prioritisation-019-022.md](0023-prioritisation-019-022.md) | Prioritisation: docs 0019–0022 (what to do first). |
| [0024-whatsapp-reminder-notes.md](0024-whatsapp-reminder-notes.md) | WhatsApp reservation reminder: design, optional channel, Twilio. |

---

## Testing

| Doc | Description |
|-----|-------------|
| [testing.md](testing.md) | **Puppeteer UI tests**: prerequisites, env vars, all test scripts (reservations, demo data, working plan, tables, landing, provider, orders, reports, catalog, rate limit, etc.), npm script table, backend/data checks, coverage summary, known issues. |

---

## Screenshots

| Doc | Description |
|-----|-------------|
| [screenshots/README.md](screenshots/README.md) | How to capture screenshots (Puppeteer script, manual), file list and where each is used (README, feature docs). |

---

## Other

- **banner.svg** — Banner image used in the main README.
