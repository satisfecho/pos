# Add Organization Name with Text Truncation

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/196
- **196**

## Problem / goal
Show the organization name next to the POS brand in the sidebar logo area (e.g. `POS (Organization Name)`). Long names must not wrap or overlap adjacent UI; truncate with ellipsis within the sidebar layout.

## High-level instructions for coder
- Locate the sidebar / shell branding markup where the logo text is rendered and include the tenant or organization display name as specified in the issue (parenthetical style).
- Apply CSS on the `.logo` (or equivalent) class so long labels stay on one line and truncate with ellipsis: `white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis`, and a constrained width (`max-width` tuned to the sidebar — issue suggests ~150px as a starting point).
- Prefer existing tenant/org fields and i18n patterns used elsewhere for staff UI; avoid hard-coded placeholder strings in production templates.
- Verify at narrow sidebar widths and with a very long organization name that layout remains stable and readable.

## Implementation summary
- **`ApiService`:** `tenantDisplayName` signal set from **`GET/PUT /tenant/settings`** (`name`); cleared on logout.
- **`SidebarComponent`:** Desktop sidebar `.logo` and mobile `.header-title` render `POS ({{ tenant name }})` when name is non-empty; `brandTitle()` for `title` / `aria-label`.
- **`sidebar.component.scss`:** `.logo-container` flex shrink; `.logo` ellipsis + `max-width: min(150px, 100%)`; `.header-title` ellipsis for narrow top bar.

## Testing instructions
1. Start stack; open staff app (e.g. `http://127.0.0.1:4202`), log in as tenant staff.
2. Ensure **Settings** has **Organization / tenant name** set; reload — sidebar header should show `POS (that name)`. Mobile header should match.
3. Set name to a very long string — single line with ellipsis; hover shows full string via native tooltip.
4. Automated (`.env` with demo login):  
   `SKIP_LANDING_PACKAGE_VERSION_CHECK=1 BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front`  
   Expect exit 0 and sidebar nav clicks OK.
