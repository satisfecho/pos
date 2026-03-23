# Make restaurant owner add personal providers

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/25

## Problem / goal
A restaurant may use a supplier not present in the global/provider catalog. Owners need to **add their own providers** and **link them to products**, including non-menu items (e.g. toilet paper) that are not “on sale” in the usual sense.

## High-level instructions for coder
- Review existing provider catalog, `ProviderProduct`, and owner vs provider roles in `docs/` and code.
- Specify permissions: tenant-scoped custom providers vs platform providers; avoid breaking provider portal assumptions.
- Allow creating/linking tenant-specific provider records and attaching products (including internal or non-sale inventory use cases if applicable).
- Cover listing, edit, and product linkage in API + owner UI; add tests for authorization and data isolation between tenants.
