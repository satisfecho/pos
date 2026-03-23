# GitHub issues roadmap — [#52](https://github.com/satisfecho/pos/issues/52), [#53](https://github.com/satisfecho/pos/issues/53), [#54](https://github.com/satisfecho/pos/issues/54)

This file **summarizes** large, multi-track items that are tracked on GitHub. It is not a commitment order; use it for planning and to split work into smaller issues.

---

## [#52 — Various topics to enhance](https://github.com/satisfecho/pos/issues/52)

Umbrella list — **split into separate issues** before implementation.

| Theme | Notes |
|--------|--------|
| **Multiple warehouses (“almacenes”)** | e.g. meat → cold room; needs inventory model, locations, stock moves. |
| **Split invoice** | Partial payments or multi-party bills; touches orders, payments, printing. |
| **Join tables** | Floor plan + session: combined covers, single bill or split — align with `docs/0008-order-management-logic.md`. |
| **Offline operation** | Service worker / local queue / sync — major architecture. |
| **Migrate from existing system** | Import pipelines (CSV/API), mapping, cutover runbook. |
| **Opinion surveys / Google** | Public feedback + Google review URL (partially related to guest feedback features). |
| **Birthdays (“cumpleaños”)** | CRM-style dates, optional marketing triggers — overlaps [#54](https://github.com/satisfecho/pos/issues/54). |
| **Marketing / special offers** | Promotions engine, eligibility, menu pricing — overlaps [#54](https://github.com/satisfecho/pos/issues/54). |
| **Central kitchen → branches** | Multi-tenant or multi-site fulfillment; supply chain. |
| **Uber Eats interface** | External aggregator integration. |

**Recommendation:** Close #52 once each bullet has its own issue (or link to existing docs), and prioritise one vertical (e.g. split invoice OR warehouses).

---

## [#53 — Kitchen tickets (time gradients & stations)](https://github.com/satisfecho/pos/issues/53)

**Intent:** Tickets **change appearance by age** (fresh → orange → red), with **category-aware** expected times (starters vs mains), **priority/claim** by staff, **clear order time** on every ticket, and eventually **station-specific** views (kitchen / bar / grill / cold / desserts).

**Dependencies / design:**

- Per–order-item or per-ticket **timestamps** already partially exist; may need **expected prep duration** by category or product.
- Kitchen UI: `docs/0015-kitchen-display.md`, `front` kitchen component + WebSocket.
- **Printing** routes may need separate layouts per station (future).

**Suggested slices:** (1) display placed time + SLA badge, (2) CSS gradients from elapsed time, (3) product/category SLA config, (4) priority flag + API, (5) filter tickets by station/tag.

---

## [#54 — Client satisfaction & post-purchase comms](https://github.com/satisfecho/pos/issues/54)

**Intent:** Automated **SMS/email** campaigns from triggers; **feedback link** after visit; optional **contact capture**; tie-in to **Google Maps** reviews; loyalty / win-back / special occasions.

**Overlap with codebase:**

- Guest feedback and public tenant branding may already cover part of “feedback link”; extend rather than duplicate.
- **Marketing automation** implies new subsystems: consent, templates, provider (SMTP vs SMS gateway), queues, unsubscribe.

**Suggested slices:** (1) feedback URL + optional contact on existing flow, (2) tenant-configurable review link (Google), (3) outbound email for one trigger (e.g. post-order thank-you), (4) SMS provider + compliance, (5) segmentation / campaigns UI.

---

## Related

- [#50](https://github.com/satisfecho/pos/issues/50) — order customizations: [0031-order-customizations-plan.md](0031-order-customizations-plan.md)
- [ROADMAP.md](../ROADMAP.md) — high-level product status
- [All issues](https://github.com/satisfecho/pos/issues)
