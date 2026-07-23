# Document optional order / item comments (#284)

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Optional guest/staff free-text comments on order lines and the whole order shipped (#284: `Order.notes` / `OrderItem.notes`, public menu + kitchen/bar highlight). Operators and agents have **no short feature note** in `docs/` — only the closed task and code. Kitchen display docs mention generic “notes” without the public-menu “Add comment” / order-level note UX.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23: docs-vs-code scan after `SIGNAL docs_stale` (stale basenames already queued)
- Shipped: `back/app/order_notes.py`; public menu cart comments; kitchen/bar highlight; `back/tests/test_order_notes.py`
- `rg` on `docs/*.md`: no dedicated “order comment” / #284 how-to; **`docs/0015-kitchen-display.md`** only says items include notes; **`NEW-0-20260722-1420-mark-0008-order-mgmt-spec-shipped`** is banner-only (do not expand into a bulk 0008 rewrite here)
- Sibling **`NEW-0-20260723-0716-refresh-kitchen-display-doc-delivery`** is delivery-channel only — do not merge

## High-level instructions for coder

- Add a short subsection (or status callout) to **`docs/0015-kitchen-display.md`** (and optionally one paragraph under Feature guides / **`docs/0008`** banner area only) describing:
  - Public menu: per-item **Add comment** + optional order-level note (optional, never blocks checkout; ~500 char cap)
  - Staff edit of the same `notes` fields
  - Kitchen/bar: comments shown highlighted / full text
- One-line index tweak in **`docs/README.md`** if kitchen/order docs are listed without this cue
- Do **not** re-implement product code; no bulk rewrite of 0008
- Pass/fail: a reader can find how comments work and where they appear without opening CLOSED-284
