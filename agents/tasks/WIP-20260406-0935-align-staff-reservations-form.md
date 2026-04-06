# Align staff /reservations form with public /book (zones & slot grid)

## GitHub Issues
- [github.com/satisfecho/pos/issues](https://github.com/satisfecho/pos/issues)
- `gh issue list --repo satisfecho/pos --state open --limit 40`
- Optional: `--json number,title,labels,updatedAt,url`
- **Issue:** https://github.com/satisfecho/pos/issues/164

## Problem / goal
The staff reservation form is inconsistent with the public booking page. The staff form should be aligned with the public `/book` flow, specifically regarding how zones and the slot grid are presented and used.

## High-level instructions for coder
- Analyze the existing public `/book` component/flow.
- Update the staff `/reservations` form to use a similar zone selection and slot grid interface.
- Ensure that the data models and API calls used for slot/zone selection are consistent between both flows.
- Verify that any changes to the staff form don't break existing reservation management capabilities.
