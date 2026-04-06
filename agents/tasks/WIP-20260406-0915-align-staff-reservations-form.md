# Align staff /reservations form with public /book (zones & slot grid)

## GitHub Issues
- [github.com/satisfecho/pos/issues](https://github.com/satisfecho/pos/issues)
- `gh issue list --repo satisfecho/pos --state open --limit 40`
- Optional: `--json number,title,labels,updatedAt,url`
- **Issue:** https://github.com/satisfecho/pos/issues/164

## Problem / goal
The staff reservation form should be aligned with the public booking form, specifically regarding how zones and the slot grid are displayed and used to ensure consistency between staff and public booking experiences.

## High-level instructions for coder
- Analyze the existing public `/book` component to understand the zone selection and slot grid implementation.
- Update the staff `/reservations` form to use a similar UI pattern for zones and time slot selection.
- Ensure that the logic for availability/slots is consistent across both forms.
- Verify that any differences in business logic (e.g., staff might bypass certain restrictions) are maintained while the UI remains aligned.
- Check for visual consistency in terms of layout, spacing, and interaction patterns.
