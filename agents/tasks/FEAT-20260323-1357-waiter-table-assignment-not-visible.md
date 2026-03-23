# Waiter cannot see table assignment (owner-assigned tables)

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/65

## Problem / goal

When the **owner** assigns tables to staff, the **waiter** (logged in as that role) does **not** see those assignments on the **Tables** view. Owner sees assignments; waiter UI does not reflect them. Screenshots in the issue compare owner vs waiter.

Relevant areas: tables canvas / tables list, permissions and API payloads for assigned staff vs owner, and any filtering that hides assignment for non-owner roles.

## High-level instructions for coder

- Reproduce: owner assigns a table to a waiter; log in as that waiter; open Tables and confirm assignment is missing.
- Trace where table–staff assignment is stored (API + models) and which endpoints the tables UI uses for waiter vs owner.
- Ensure waiter-facing tables UI loads and displays the same assignment data the owner sees (respecting tenant and role rules), or fix API/auth if the data is omitted for waiters.
- Add or extend a smoke test (Puppeteer or manual checklist in PR) if a stable flow exists for staff tables.
