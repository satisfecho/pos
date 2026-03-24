# Enable + Disable Options

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/72

## Problem / goal
Tenants want a cleaner dashboard and sidebar by **hiding modules they do not use** (e.g. tables, shift/working plan, providers). Settings should let an owner toggle which areas are enabled; disabled areas disappear from **dashboard** and **sidebar** navigation (and likely route access / deep links behaviour should be defined—e.g. redirect or 404).

## High-level instructions for coder
- Define a clear product model: which features are toggleable (tables, working plan, providers, …) and defaults for new/existing tenants.
- Persist toggles (likely tenant settings / JSON field or columns); expose via existing `GET/PUT /tenant/settings` or dedicated API as appropriate.
- Frontend: settings UI to enable/disable each option; centralise nav + dashboard tile generation so hidden items are not rendered; decide guard behaviour for direct URLs to disabled features.
- Add or extend i18n for new settings labels; smoke-test main roles after toggles change.
- Coordinate with **`docs/`** if behaviour is user-facing (navigation contract).
