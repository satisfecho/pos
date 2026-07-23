# Index VeriFactu fiscal doc in docs/README Feature guides

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`docs/0018-verifactu-fiscal-invoicing.md`** is a living feature guide (tenant `fiscal_mode`, server issuance stubs, Factura QR/disclaimer) complementary to **`docs/0017-billing-customers-factura.md`**, but **`docs/README.md`** never lists it under Feature guides, Email, or Reference. Operators and agents following the docs index stop at 0017 and miss VeriFactu configuration and the explicit “no AEAT wire yet” disclaimer.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T17:52Z: `SIGNAL docs_stale×14` + `changelog_sparse` already owned; `demo_tables_check=ok`; Unreleased empty post-2.1.28; NEW backlog≈80
- `rg` on **`docs/README.md`**: no hits for `verifactu` / `0018-verifactu`
- File on disk: **`docs/0018-verifactu-fiscal-invoicing.md`** (complements 0017)
- Sibling **`NEW-0-20260723-0639-renumber-duplicate-doc-prefixes-0018-0024-0025`** keeps verifactu as **0018** and renumbers gmail — **do not** merge; this task is **index-only** (use the post-renumber path if that NEW lands first)
- Sibling **`NEW-0-20260723-0734-align-0017-customers-operations-nav`** owns 0017 Operations nav only — do not expand 0017 here

## High-level instructions for coder

- In **`docs/README.md` Feature guides** (near the 0017 row), add one row for **`0018-verifactu-fiscal-invoicing.md`** describing: tenant `fiscal_mode` (off/test/live), server-issued fiscal stub, Factura QR/disclaimer; **no production AEAT submission yet**
- Optional one cross-link phrase on the 0017 blurb (“see also VeriFactu 0018”) — keep to a short phrase
- Documentation index only; no product code; no bulk rewrite of 0018
- Pass/fail: `rg -n 'verifactu|0018-verifactu' docs/README.md` hits Feature guides; link resolves
