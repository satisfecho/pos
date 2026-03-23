# Feedback / consistency in catalog description (badge area)

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/34

## Problem / goal
Catalog cards use varying description heights so prices and badges do not align across the grid. Request: uniform card body height (or max height) and a **“more”** affordance to expand long text so prices line up. Screenshot in the issue.

## High-level instructions for coder
- Review **`catalog`** (or provider catalog) card template and styles; define a consistent description block height (line-clamp or max-height) with accessible expand/collapse (“more” icon or control).
- Ensure i18n strings for any new control; keep mobile/touch targets usable.
- Smoke-test **`/catalog`** (or relevant route) with mixed short/long descriptions; update **`CHANGELOG.md`** **`[Unreleased]`** if behaviour is user-visible.
