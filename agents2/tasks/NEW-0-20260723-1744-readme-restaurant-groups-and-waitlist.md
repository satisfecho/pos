# Add restaurant groups + waitlist to root README Features / Access Points

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Root **`README.md`** Features and Access Points still omit shipped **restaurant groups** (#283) and a dedicated **waiting list** Access Point. Waiting list appears only in later prose under Reservations; groups are absent entirely. Sibling **`NEW-0-20260722-1159-readme-delivery-courier-saas-features`** owns Delivery / courier / SaaS paywall / platform only — not these two.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T17:44Z: `SIGNAL docs_stale×14` + `changelog_sparse` owned; `demo_tables_check=ok`; NEW≈77 — docs-vs-code follow-on, not a bulk stale-doc rewrite
- Features table (~L45–58): no restaurant-groups row; Multi-tenant / Staff navigation omit groups join/Settings tab
- Access Points (~L117–130): has `/book/{tenantId}` but no `/waitlist/{tenantId}`
- Docs exist: **`docs/0054-restaurant-groups.md`**, waiting list in **`docs/0011`**
- Out of scope / do not merge: ROADMAP (**`NEW-0-20260723-1628-refresh-root-roadmap-shipped-jul-features`**), docs/README Feature guides 0011 blurb (**`NEW-0-20260723-1714-…`**), delivery/courier/paywall README (**`NEW-0-20260722-1159-…`**)

## High-level instructions for coder

- In root **`README.md` Features**, add a short **Restaurant groups** row (create/join/leave, optional shared customers/products, Settings tab) linking **`docs/0054-restaurant-groups.md`**
- Optionally extend the **Reservations** Features cell with a brief Waiting list cue (public `/waitlist/:tenantId` + staff tab) — keep one sentence; full guide stays in 0011
- In **Access Points**, add a row for public waiting list, e.g. `http://localhost:4202/waitlist/{tenantId}`
- Do **not** rework Delivery/courier/paywall rows (owned by sibling NEW); no product code
- Pass/fail: `rg -i 'restaurant group|0054|waitlist' README.md` hits Features and Access Points; links resolve
