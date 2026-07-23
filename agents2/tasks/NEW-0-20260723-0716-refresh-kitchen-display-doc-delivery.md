# Refresh kitchen display doc for Satisfecho Delivery / statuses

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`docs/0015-kitchen-display.md` is **>90d** stale and still describes kitchen cards only in table/order terms. Satisfecho Delivery orders now appear with `table_name` **“Satisfecho Delivery”**, and order status includes **`out_for_delivery`**. The doc’s “active orders only” list omits delivery channel behaviour, so agents may think KDS ignores delivery or that every status is shown.

## Evidence (008 preflight / review)

- Preflight `SIGNAL docs_stale` sample lists other 0015 collision work (**`NEW-0-20260722-1310-renumber-0015-platform-operator-doc`**) but **no** dedicated kitchen-display refresh
- Kitchen UI filter (`kitchen-display.component.ts`) keeps `pending` / `preparing` / `ready` / `partially_delivered` / `paid` — **not** `out_for_delivery` / `completed` / `cancelled`
- Delivery channel shipped (#297–#302); kitchen cards use `order.table_name` (API returns `"Satisfecho Delivery"` for that channel per **0053**)

## High-level instructions for coder

- Light refresh of **`docs/0015-kitchen-display.md` only**: add a short **status** line (shipped / current) and one short subsection or bullets for:
  - Satisfecho Delivery / marketplace rows show as table label **Satisfecho Delivery** (no physical table)
  - Which order statuses appear on `/kitchen` (and `/bar` if the same filter applies) vs courier **`out_for_delivery`** (kitchen handoff done)
- Optional one-line cross-link to **`docs/0053-satisfecho-delivery-order-channel.md`**
- Do **not** renumber kitchen (platform **0015→0055** stays on sibling NEW); no product code unless the doc reveals a clear doc/code contradiction worth a one-line code comment only
- Pass/fail: doc matches current filter + delivery label; mtime/status shows review; README blurb optional one-liner if it still reads incomplete
