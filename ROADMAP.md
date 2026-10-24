# Development Roadmap

High-level product status for Satisfecho POS. Prefer this file for “what’s done / what’s next”; use `docs/` for how it works and [`CHANGELOG.md`](CHANGELOG.md) for release history.

**Umbrella tracks:** [#52](https://github.com/satisfecho/pos/issues/52)-[#54](https://github.com/satisfecho/pos/issues/54) detail lives in [`docs/0032-github-issues-roadmap.md`](docs/0032-github-issues-roadmap.md).

---

## How to keep this current (weekly review)

Refresh **`ROADMAP.md`** and the **#52** table in **`docs/0032-github-issues-roadmap.md`** about **once a week**, and whenever a batch of product issues lands as **`CLOSED-*`** under `agents2/tasks/done/`.

**Weekly checklist (keep it light):**

1. Skim **`CHANGELOG.md`** `[Unreleased]` + latest dated sections vs the tables below - move shipped items out of Deferred / In progress when evidence is clear.
2. Cross-check recent **`CLOSED-*`** under `agents2/tasks/done/` and open GitHub issues; fix obvious contradictions only (do not invent status).
3. Align **`docs/0032-github-issues-roadmap.md`** #52 statuses with what actually shipped.
4. Agent **008** (enhancement reviewer) also watches for roadmap drift on its ~7-day pass - queue a small **`FEAT-…-update-roadmap.md`** (or reopen a roadmap issue) when this file lags.

Do **not** paste implementation howtos, rate-limit strategy drafts, or secrets here - link to `docs/` instead.

---

## Shipped (stable)

Core POS plus Jul-Sep 2026 product slices (through **2026-09-14**). Evidence: `CHANGELOG.md` **2.1.149-2.1.162** and closed tasks under `agents2/tasks/done/2026/08/`. Links are the source of detail.

| Area | Notes |
|------|--------|
| Orders & kitchen | Lifecycle, soft-delete, comments, customizations ([#50](https://github.com/satisfecho/pos/issues/50)), kitchen display - `docs/0008`, `docs/0015`, `docs/0031` |
| Dine-in QR cart & history | Shared live draft cart for the same table QR ([#349](https://github.com/satisfecho/pos/issues/349)); session- or customer-scoped order history ([#350](https://github.com/satisfecho/pos/issues/350)) - `docs/0008`, `docs/0009` |
| Payments | Stripe; immediate-payment setting; split bill by amount + by line ([#318](https://github.com/satisfecho/pos/issues/318), [#331](https://github.com/satisfecho/pos/issues/331)) - `docs/0071` |
| Reservations & waitlist | Staff + public book/cancel; waiting list - `docs/0011` |
| Delivery | Satisfecho Delivery staff/courier/public; floating order total + CTA on menu/cart/address and QR checkout ([#360](https://github.com/satisfecho/pos/issues/360)) - `docs/0053` |
| Billing / fiscal | Factura customers; VeriFactu prep ([#326](https://github.com/satisfecho/pos/issues/326)); German TSE Phase 1 ([#316](https://github.com/satisfecho/pos/issues/316)) - `docs/0017`, `docs/0018`, `docs/0065`, `docs/0072` |
| Inventory | Multi-warehouse MVP ([#320](https://github.com/satisfecho/pos/issues/320)); product stock alerts on staff Products + “Only X left” on QR/Delivery ([#356](https://github.com/satisfecho/pos/issues/356)) - `docs/0061` |
| Offline | Staff offline cash sale + sync ([#319](https://github.com/satisfecho/pos/issues/319)); deferred-card intent queue (no PAN/CVV) ([#333](https://github.com/satisfecho/pos/issues/333)) - `docs/0063` |
| Migration | Products/categories CSV import ([#321](https://github.com/satisfecho/pos/issues/321)); staff Products bulk CSV/TSV ([#336](https://github.com/satisfecho/pos/issues/336)) - `docs/0062` |
| Promos & loyalty | Category %-off ([#322](https://github.com/satisfecho/pos/issues/322)); club loyalty + birthday bonus ([#327](https://github.com/satisfecho/pos/issues/327), [#331](https://github.com/satisfecho/pos/issues/331)); VIP tiers + referrals ([#334](https://github.com/satisfecho/pos/issues/334)) - `docs/0068`, `docs/0066` |
| End-user customer accounts | First slice shipped ([#340](https://github.com/satisfecho/pos/issues/340)): register/login, email verify, `/customer` portal + orders; separate from staff Factura CRM - `docs/0002`. MFA, self-serve invoices, auto-link of public orders still deferred (see Deferred). |
| Guests | Feedback + Google review URL ([#325](https://github.com/satisfecho/pos/issues/325)); reservation birthdays ([#324](https://github.com/satisfecho/pos/issues/324)); sticky guest header on public tenant pages ([#376](https://github.com/satisfecho/pos/issues/376), [#364](https://github.com/satisfecho/pos/issues/364)) - `docs/0064`, `docs/0067` |
| Multi-site | Restaurant groups; branch hub fulfillment ([#323](https://github.com/satisfecho/pos/issues/323)); floor-plan table join MVP - `docs/0054`, `docs/0069`, `docs/0051` |
| Hardware | LAN print agent / kitchen+receipt jobs ([#317](https://github.com/satisfecho/pos/issues/317)) - `docs/0070` |
| Marketing landings | Public `/features` + `/features/{slug}` with locale copy ([#347](https://github.com/satisfecho/pos/issues/347), [#348](https://github.com/satisfecho/pos/issues/348)); user manual at `/manual-usuario` with multi-locale bodies ([#352](https://github.com/satisfecho/pos/issues/352)-[#354](https://github.com/satisfecho/pos/issues/354)) |
| SaaS / platform | Signup paywall; `/pricing` with **QR Menu - free forever** + optional support tier ([#358](https://github.com/satisfecho/pos/issues/358)); `/about`; platform portal owner/staff login counts ([#315](https://github.com/satisfecho/pos/issues/315)) - `docs/0052`, `docs/0059` |
| Staff UX | Tenant ID in sidebar header ([#357](https://github.com/satisfecho/pos/issues/357)) |
| Docs onboarding | README “Start with one feature” (QR menu or reservations only) ([#355](https://github.com/satisfecho/pos/issues/355)) |
| Security | Rate limiting (Redis/slowapi) - `docs/0020`; CAPTCHA still deferred |
| Talk to POS | Staff voice/text **navigation** demo at `/talk` ([#344](https://github.com/satisfecho/pos/issues/344)) - no LLM / no mutations - `docs/0076` |
| Other | Provider portal, reports, i18n, table PIN, deploy - `docs/0014`, `docs/0016`, `docs/0012`, `docs/0009`, `docs/0004` |

---

## In progress / next

| Item | Status | Tracking |
|------|--------|----------|
| **#52 remaining slices** | Partial - see table in `docs/0032` | Transfers/WMS, deeper offline (SW write queue), more migration entities, Uber Eats |
| **#53 Kitchen SLAs / stations** | Not started | Age gradients, category SLAs, station views - `docs/0015`, issue [#53](https://github.com/satisfecho/pos/issues/53) |
| **#54 Post-visit campaigns** | Partial feedback shipped; SMS/email automation open | [#54](https://github.com/satisfecho/pos/issues/54) |
| **TSE live / VeriFactu live** | Adapters wired (Fiskaly SIGN ES / SIGN DE + mock/generic); live gated on unlock + credentials - prod certs still ops. Gap list: `docs/0065` (#431) | `docs/0074`, `docs/0072`, `docs/0065`; [#342](https://github.com/satisfecho/pos/issues/342), [#431](https://github.com/satisfecho/pos/issues/431) |
| **Wallet pass issuance (Loyalty Club)** | Issuance + push wired (#343); needs live Apple/Google certs in env for production | `docs/0066`; [#343](https://github.com/satisfecho/pos/issues/343) |
| **Order customizations price deltas** | Core customizations shipped; priced modifiers optional | [#50](https://github.com/satisfecho/pos/issues/50), `docs/0031` |

Open issues: [github.com/satisfecho/pos/issues](https://github.com/satisfecho/pos/issues).

---

## Deferred

| Item | Why deferred | Notes |
|------|--------------|--------|
| **Customer MFA / self-serve invoices** | After #340 account slice | MFA, tax invoices, auto-link public menu/delivery orders to logged-in customer - `docs/0002` |
| **Order management Phase 4** | Advanced ops | Batch status, audit history, post-payment mods - `docs/0007` |
| **Strict immediate payment** | Product choice | Modal can still be dismissed today |
| **CAPTCHA after failed login** | Nice-to-have on top of rate limits | Listed in `docs/0020` |
| **Aggregator delivery (Uber Eats, etc.)** | Distinct from Satisfecho Delivery | Under #52 |
| **Warehouse transfers / full WMS** | Beyond multi-warehouse MVP | Under #52 |
| **True offline card capture / offline fiscal** | Hardware & compliance | Intent-only deferred card (#333) shipped; PAN/CVV and offline fiscal numbering remain blocked - `docs/0063` |

---

## Related

- [`CHANGELOG.md`](CHANGELOG.md) - what shipped in each version
- [`docs/README.md`](docs/README.md) - doc index
- [`docs/0032-github-issues-roadmap.md`](docs/0032-github-issues-roadmap.md) - #52-#54 theme table
- [`docs/agent-loop.md`](docs/agent-loop.md) - agent pipeline (includes roadmap refresh note)
- [`docs/0020-rate-limiting-production.md`](docs/0020-rate-limiting-production.md) - rate limits (implementation guide; not duplicated here)
