# SECURITY-REVIEW: document TenantProduct IDs on public delivery create (#304)

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Public Satisfecho Delivery create now resolves **public-menu `TenantProduct.id` → `Product`** (and still accepts legacy `Product.id`) (#304). **`docs/SECURITY-REVIEW.md`** still describes the surface as “products must belong to that tenant” only and lists `test_public_satisfecho_delivery.py` without the catalog-ID regression. Agents re-auditing delivery may miss the dual-ID contract or reopen a fixed bug.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23: `SIGNAL changelog_sparse` / post-2.1.28 code scan; #304 shipped and covered in CHANGELOG 2.1.28
- `docs/SECURITY-REVIEW.md` Public Satisfecho Delivery row (~L73): no `TenantProduct` / catalog-id wording; residual risks do not mention dual ID space
- Pytest: `back/tests/test_public_satisfecho_delivery.py` includes TenantProduct create coverage (#304)
- Sibling **`NEW-0-20260723-1724-document-tenantproduct-ids-in-0053-delivery`** owns **feature** doc **0053** only — do **not** merge; this task is SECURITY-REVIEW only
- Prior CLOSED security delta (**CLOSED-0-20260722-1159-…**) predates the #304 fix

## High-level instructions for coder

- In **`docs/SECURITY-REVIEW.md`**, update the Public Satisfecho Delivery control-plane row to state that item IDs may be tenant-scoped **`TenantProduct.id`** (resolved to linked `Product`) or legacy **`Product.id`**, still tenant-bound
- Point tests at the #304 regression case in `back/tests/test_public_satisfecho_delivery.py` (keep existing file cite)
- Optional one-line residual: dual ID space is intentional for catalog menus; do not accept cross-tenant IDs (existing tenant checks remain the control)
- Append a short History / delta line dated 2026-07-23 for the #304 pass
- No product code; no rewrite of **0053** (owned by sibling NEW)
- Pass/fail: `rg -n 'TenantProduct|#304' docs/SECURITY-REVIEW.md` hits the updated row; SECURITY remains a review note, not a pentest
