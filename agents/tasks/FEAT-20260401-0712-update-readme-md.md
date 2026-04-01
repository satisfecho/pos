# Update README.md

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/132

## Problem / goal
Improve root **README.md** so it matches the product: move rate-limiting documentation into dedicated files under **`docs/`**, refresh the feature list to reflect everything exposed in the side navigation and settings, and document **Revolut** payment where appropriate (see **`docs/REVOLUT.md`** if present).

## High-level instructions for coder
- Extract or relocate rate-limiting topics from **README** into one or more focused **`docs/*.md`** files; keep **README** pointing to those docs instead of duplicating long sections.
- Audit the app’s side nav and settings areas and update the README feature list so it is accurate and discoverable for new contributors.
- Add or cross-link Revolut payment setup/usage consistent with existing payment docs.
