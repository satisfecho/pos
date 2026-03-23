# GitHub issues roadmap — [#52](https://github.com/satisfecho/pos/issues/52), [#53](https://github.com/satisfecho/pos/issues/53), [#54](https://github.com/satisfecho/pos/issues/54)

This file **summarizes** large, multi-track items that are tracked on GitHub. It is not a commitment order; use it for planning and to split work into smaller issues.

---

## [#52 — Various topics to enhance](https://github.com/satisfecho/pos/issues/52)

Umbrella list. **This table is the source of truth** for “is it done?” until each theme has its own GitHub issue.

| Theme | Status in product | Docs / notes |
|--------|-------------------|--------------|
| **Multiple warehouses (“almacenes”)** | Not started | Inventory today is purchase-oriented; needs locations, stock moves, picking. |
| **Split invoice** | Not started | Partial payments / multi-payer bills: orders, Stripe, Factura printing. |
| **Join tables** | Not started | Physical merge of tables + one or many bills: see `docs/0008-order-management-logic.md` (sessions per device already). |
| **Offline operation** | Not started | Service worker, local queue, conflict resolution — large architecture change. |
| **Migrate from existing system** | Partial | Seeds, imports exist for catalog/demo; no generic “import any POS” pipeline or runbook. |
| **Opinion surveys / Google** | **Partial** | Guest feedback `/feedback/:id`, **Settings → Google review URL**, thank-you step — see [#54](https://github.com/satisfecho/pos/issues/54), `CHANGELOG.md`. |
| **Birthdays (“cumpleaños”)** | **Partial** | Optional **`birth_date`** on **billing customers** (Customers / Factura CRM); not on reservations yet. Automated campaigns → [#54](https://github.com/satisfecho/pos/issues/54). |
| **Marketing / special offers** | Not started | Promotions / pricing rules — overlaps [#54](https://github.com/satisfecho/pos/issues/54). |
| **Central kitchen → branches** | Not started | Cross-tenant or multi-site supply; out of scope of current schema. |
| **Uber Eats interface** | Not started | Aggregator menu sync / orders — see `docs/0031-order-customizations-plan.md` (delivery integrations). |

**Dedicated issues & phased plan:** Specs (copy-paste titles/bodies), dependency graph, and filing instructions are in **[0050-github-issue-52-split-plan.md](0050-github-issue-52-split-plan.md)**. After creating the GitHub issues, add their numbers in a comment on [#52](https://github.com/satisfecho/pos/issues/52) and optionally add an **Issue** column to the table above.

**Recommendation:** **Close #52** when maintainers agree the umbrella is fully tracked (children filed or linked) and this table stays updated.

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

**Suggested slices:** (1) feedback URL + optional contact on existing flow, (2) tenant-configurable **Google review** deep link + optional **Google Maps place/directions** link on public book / reservation / feedback pages, (3) outbound email for one trigger (e.g. post-order thank-you), (4) SMS provider + compliance, (5) segmentation / campaigns UI.

**Note:** Google does **not** allow third parties to **post** reviews via API; only to **link** guests to the official “Write a review” / Maps listing flow.

---

## Related

- [#50](https://github.com/satisfecho/pos/issues/50) — order customizations: [0031-order-customizations-plan.md](0031-order-customizations-plan.md)
- [ROADMAP.md](../ROADMAP.md) — high-level product status
- [All issues](https://github.com/satisfecho/pos/issues)
