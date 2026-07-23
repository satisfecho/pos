# Document TenantProduct menu IDs in Satisfecho Delivery doc

## GitHub Issues
- **Issue:** (none — enhancement reviewer) — related shipped fix #304
- **0**

## Problem / goal

Public Satisfecho Delivery create now accepts **public-menu `TenantProduct.id`** values (maps to linked `Product`) as well as legacy **`Product.id`** (#304). **`docs/0053-satisfecho-delivery-order-channel.md`** describes the public create API and cart UI but does not state line-ID semantics, so the next agent may re-open a “Product not found” bug that is already fixed.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23: `SIGNAL changelog_sparse` after 2.1.28 cut (Unreleased empty; #304 in **[2.1.28]**); docs_stale SIGNAL basenames already queued
- Closed **`CLOSED-304-…-resolve-tenantproduct-ids-satisfecho-delivery-checkout`**: `_resolve_product_lines` + regression pytest
- `rg` on `docs/0053`: no `TenantProduct` / catalog-id note under API or Public UI
- Do not re-implement product code; documentation only

## High-level instructions for coder

- In **`docs/0053-satisfecho-delivery-order-channel.md`**, add a short bullet (API and/or Public UI) that public (and staff) Satisfecho Delivery create item IDs resolve **`TenantProduct` → `Product`** for the tenant, and still accept **`Product.id`**
- Optional one-liner pointer to pytest `test_public_create_accepts_tenant_product_menu_ids` / `test:delivery-checkout` when those are indexed
- No bulk rewrite of 0053; no code changes
- Pass/fail: `rg -n 'TenantProduct' docs/0053-satisfecho-delivery-order-channel.md` finds the note
