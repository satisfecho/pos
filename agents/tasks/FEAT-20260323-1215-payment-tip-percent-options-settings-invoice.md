# Payment tips: owner-configurable presets (e.g. 5/10/15/20%), invoice, tax

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/58

## Problem / goal
Restaurant owner configures tip options in settings (e.g. four percentages). POS applies selected tip to payment total automatically; tip line appears on invoice/receipt. Tax treatment for tips should be configurable in the backend (issue asks which tax applies — design and document default).

## High-level instructions for coder
- Review existing payment and tenant settings models/APIs; follow patterns in `docs/` for payments (e.g. `docs/REVOLUT.md` if card flow touches this).
- Add tenant-level tip presets + tax behavior flag; persist and expose to frontend checkout/payment UI.
- Wire tip into total calculation and printing path; document tax default and migration if schema changes.
- Add backend tests for calculation edge cases; smoke payment UI if a script exists.
