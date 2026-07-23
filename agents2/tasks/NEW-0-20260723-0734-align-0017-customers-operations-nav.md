# Align docs/0017 Customers nav with Operations sidebar

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**Customers (Invoice)** (`/customers`) was moved under the staff sidebar **Operations** group (#290). **`docs/0017-billing-customers-factura.md`** still describes the Customers page without saying where it lives in the grouped nav, so operators looking under Catalog & inventory miss it.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23: docs-vs-code / UX polish after `SIGNAL docs_stale` (0017 not in the >90d SIGNAL list but nav drift is real)
- CLOSED-290 / CHANGELOG: Customers under Operations alongside tables and kitchen/bar
- `docs/0017-billing-customers-factura.md` § Customers page — Access/list only; no Operations vs Catalog cue
- Scope: **0017 only** (+ optional one-line `docs/README.md` index if it implies Catalog placement) — no product code

## High-level instructions for coder

- In **`docs/0017-billing-customers-factura.md`** § Customers page, add one sentence: open **Operations → Customers (Invoice)** (`/customers`); not under Catalog & inventory
- Keep the rest of the Factura guide unchanged
- Pass/fail: doc matches current sidebar grouping; no Angular/backend edits
