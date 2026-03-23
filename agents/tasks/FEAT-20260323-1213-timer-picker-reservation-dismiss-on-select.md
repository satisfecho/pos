# Timer picker: dismiss on select, open on input focus (reservations)

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/60

## Problem / goal
On **Create reservation**, the time picker stays open after selecting a time; it only appears when clicking the clock icon. Expected: time picker opens when focusing the time input; it closes on blur and when the user confirms/selects a time (consistent with typical datetime UX). See issue screenshot.

## High-level instructions for coder
- Locate reservation create/edit time controls (staff reservations flow); align behavior with Angular Material (or current) time/datetime picker patterns.
- Ensure picker opens on input focus/interaction, not only via icon; close on selection and on focus loss without breaking keyboard/accessibility.
- Manually verify create-reservation flow; add or extend a Puppeteer/smoke path only if one already exists for reservations (`docs/testing.md`).
