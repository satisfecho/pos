# GitHub issues roadmap - [#52](https://github.com/satisfecho/pos/issues/52), [#53](https://github.com/satisfecho/pos/issues/53), [#54](https://github.com/satisfecho/pos/issues/54)

This file **summarizes** large, multi-track items that are tracked on GitHub. It is not a commitment order; use it for planning and to split work into smaller issues.

**Keep in sync with** root [`ROADMAP.md`](../ROADMAP.md): after a batch of product **`CLOSED-*`** tasks (or on the weekly **008** enhancement pass), update this table so “Status in product” matches what actually shipped. Do not leave shipped MVPs listed as “Not started”.

---

## [#52 - Various topics to enhance](https://github.com/satisfecho/pos/issues/52)

Umbrella list. **This table is the source of truth** for “is it done?” until each theme has its own GitHub issue.

| Theme | Status in product | Docs / notes |
|--------|-------------------|--------------|
| **Multiple warehouses (“almacenes”)** | MVP shipped (#320) | Named warehouses per tenant; receive/adjust + stock filter by location. Transfers / WMS picking still open - [0061](0061-multi-warehouse-inventory.md). |
| **Split invoice** | MVP shipped (#318, by-line #331) | Partial payments by amount and by order line; remaining balance; one Factura/VeriFactu alta when settled - [0071](0071-split-bill.md). |
| **Join tables** | Floor-plan MVP shipped | Join/unjoin on `/tables/canvas` - [0051](0051-table-groups-mvp.md). Deeper multi-bill merge UX may still grow. |
| **Offline operation** | MVP started (#319, deferred-card #333) | ADR + staff cash sale queue/idempotent sync; deferred-card intent (no PAN/CVV); TSE auto-sign on sync (#331). SW/full write queue and true offline card/fiscal later - [0063](0063-offline-capable-client.md). |
| **Migrate from existing system** | MVP shipped (#321) | Products + categories CSV CLI + cutover runbook ([0062](0062-pos-migration-import.md)); tables/customers/orders still open. |
| **Opinion surveys / Google** | **Partial** | Guest feedback `/feedback/:id`, Google review URL, staff trends + CSV (#325 / [0064](0064-guest-feedback-analytics.md)). NPS / post-visit email-SMS still open → [#54](https://github.com/satisfecho/pos/issues/54). |
| **Birthdays (“cumpleaños”)** | **Partial** | Reservation month/day (#324 / [0067](0067-guest-birthday.md)); billing-customer `birth_date`; loyalty birthday bonus once/year (#331 / [0066](0066-club-loyalty.md)). Automated outbound campaigns → [#54](https://github.com/satisfecho/pos/issues/54). |
| **Marketing / special offers** | MVP shipped (#322) | Category %-off promotions - [0068](0068-price-promotions.md). Broader campaign automation → [#54](https://github.com/satisfecho/pos/issues/54). |
| **Central kitchen → branches** | MVP started (#323) | Linked tenants via restaurant groups + hub kitchen; fulfillment record with prepared-at-HQ - [0069](0069-branch-hub-fulfillment.md). |
| **Satisfecho Delivery (first-party)** | **Partial / shipped core** | Own-channel delivery (API + staff UI + courier + public `/delivery/{tenantId}`). See [0053](0053-satisfecho-delivery-order-channel.md). Not the same as aggregator integrations below. |
| **Uber Eats interface** | Not started | Aggregator menu sync / orders - see `docs/0031-order-customizations-plan.md` (delivery integrations). Distinct from first-party Satisfecho Delivery. |

**Dedicated issues & phased plan:** Specs (copy-paste titles/bodies), dependency graph, and filing instructions are in **[0050-github-issue-52-split-plan.md](0050-github-issue-52-split-plan.md)**. After creating the GitHub issues, add their numbers in a comment on [#52](https://github.com/satisfecho/pos/issues/52) and optionally add an **Issue** column to the table above.

**Recommendation:** **Close #52** when maintainers agree the umbrella is fully tracked (children filed or linked) and this table stays updated.

---

## [#53 - Kitchen tickets (time gradients & stations)](https://github.com/satisfecho/pos/issues/53)

**Intent:** Tickets **change appearance by age** (fresh → orange → red), with **category-aware** expected times (starters vs mains), **priority/claim** by staff, **clear order time** on every ticket, and eventually **station-specific** views (kitchen / bar / grill / cold / desserts).

**Dependencies / design:**

- Per-order-item or per-ticket **timestamps** already partially exist; may need **expected prep duration** by category or product.
- Kitchen UI: `docs/0015-kitchen-display.md`, `front` kitchen component + WebSocket.
- **Printing** routes may need separate layouts per station (future).

**Suggested slices:** (1) display placed time + SLA badge, (2) CSS gradients from elapsed time, (3) product/category SLA config, (4) priority flag + API, (5) filter tickets by station/tag.

---

## [#54 - Client satisfaction & post-purchase comms](https://github.com/satisfecho/pos/issues/54)

**Intent:** Automated **SMS/email** campaigns from triggers; **feedback link** after visit; optional **contact capture**; tie-in to **Google Maps** reviews; loyalty / win-back / special occasions.

**Overlap with codebase:**

- Guest feedback and public tenant branding may already cover part of “feedback link”; extend rather than duplicate.
- **Marketing automation** implies new subsystems: consent, templates, provider (SMTP vs SMS gateway), queues, unsubscribe.

**Suggested slices:** (1) feedback URL + optional contact on existing flow, (2) tenant-configurable **Google review** deep link + optional **Google Maps place/directions** link on public book / reservation / feedback pages, (3) outbound email for one trigger (e.g. post-order thank-you), (4) SMS provider + compliance, (5) segmentation / campaigns UI.

**Note:** Google does **not** allow third parties to **post** reviews via API; only to **link** guests to the official “Write a review” / Maps listing flow.

---

## Related

- [#50](https://github.com/satisfecho/pos/issues/50) - order customizations: [0031-order-customizations-plan.md](0031-order-customizations-plan.md)
- [ROADMAP.md](../ROADMAP.md) - high-level product status (refresh cadence documented there)
- [All issues](https://github.com/satisfecho/pos/issues)
