# Workin plan button extract excel

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/89

## Problem / goal

Add a control to **export the working-plan calendar for a month** (e.g. March when current month is March) as **Excel**. The export must be scoped by **worker**: a **dropdown of workers**; choosing e.g. **waiter Sara** exports **Sara’s** schedule for that month only.

## High-level instructions for coder

- Locate working-plan UI and existing export/report patterns (if any) in `front/` and `back/`.
- Add **worker selector** + **export** action; define file format (columns, timezone, locale) consistent with the rest of the app.
- Implement server-side or client-side generation as appropriate (prefer existing Excel/CSV utilities in the repo).
- Cover auth/tenant scoping so staff only export workers they may see; add a minimal API or component test if the project has equivalents.
