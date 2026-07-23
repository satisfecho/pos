# Refresh docs/README Feature guides blurb for 0053 (public delivery + TTL)

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`docs/README.md`** Feature guides still describe **0053** as “First-party Satisfecho Delivery on Order: channel, address, phone, courier API (issue #297).” Public checkout at `/delivery/{tenantId}`, guest pay, and unpaid TTL cleanup are shipped, so the index understates the feature and steers readers to staff/courier only.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23: `SIGNAL docs_stale`; stale basenames already queued — this is an **index blurb** gap on a recently touched `docs/README.md`
- Feature guides row for 0053 (~L56) omits public `/delivery`, `public_order_token` pay, and TTL cleanup
- Body of **`docs/0053-satisfecho-delivery-order-channel.md`** already covers public UI + unpaid cleanup
- Sibling **`NEW-0-20260723-0752-index-unpaid-delivery-cleanup-ops-docs`** optionally tweaks this one-liner — **this task owns the 0053 Feature guides blurb**; treat that optional as superseded when this lands
- Sibling **`NEW-0-20260723-1628-docs-readme-quick-links-delivery-paywall`** owns Quick links only — do not merge
- Sibling **`NEW-0-20260723-1724-document-tenantproduct-ids-in-0053-delivery`** owns **0053 body** TenantProduct note — do not expand 0053 here

## High-level instructions for coder

- Update **only** the Feature guides table description for **`0053-satisfecho-delivery-order-channel.md`** in **`docs/README.md`** to mention:
  - Staff Delivery tab / courier API
  - Public guest checkout **`/delivery/{tenantId}`**
  - Unpaid public checkout TTL cleanup (pointer enough; no cron rewrite)
- Keep the row to one short sentence (or two short clauses); no other Feature guides rows
- Pass/fail: `rg -n '0053|/delivery' docs/README.md` under Feature guides shows public delivery; no product code
