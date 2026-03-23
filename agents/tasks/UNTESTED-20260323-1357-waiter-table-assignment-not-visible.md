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

## Implementation notes (coder)

- **Root cause:** Waiter assignment UI used `<select>` options from **`getWaiters()`** → **`GET /users`**, which requires **`user:read`**. Waiters do not have that permission, so the list was empty and the select showed no assigned waiter even though **`GET /tables`** already returns **`assigned_waiter_*`** / **`effective_waiter_*`**.
- **Fix:** Users with **`table:write`** (owner/admin) keep the dropdowns; others see read-only labels from table/floor API fields. **`getWaiters()`** runs only when **`table:write`**. Floor default waiter uses read-only **`default_waiter_name`** for non-writers.

---

## Testing instructions

1. **Owner or admin:** Log in → **Tables** (tiles and table view). Confirm per-table and per-floor waiter **dropdowns** still work; assignments save and display as before.
2. **Waiter:** Log in → **Tables**. After owner assigns a table to that waiter (or sets floor default), confirm the **Assigned waiter** column / tile shows the **same name** (read-only text, not an empty dropdown). Unassigned tables show **Unassigned**; floor-only default shows **section default** + name.
3. **Receptionist (optional):** Same as waiter — read-only visibility, no assignment controls.
4. **Regression:** With stack up, `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` passes (includes `/tables` navigation).
