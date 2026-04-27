# Relocate Organization Name below Version Info

## GitHub Issues

- **Issue:** https://github.com/satisfecho/pos/issues/197
- **197**

## Problem / goal

The organization name does not fit well beside the main “POS” title. Move it to its own line **below** the version line (version + commit hash), keep visual hierarchy clear, and preserve long-name safety (ellipsis / overflow).

## High-level instructions for coder

- Revert the `.logo` span content to display only **POS** (no org name in that span).
- Add a dedicated element (e.g. `div`/`span`) **below** the `.version` block inside the logo/header area for the organization name (see issue for suggested structure).
- Style that org row: smaller than version text (e.g. ~11px or slightly below version size), muted color, optional max-width with `text-overflow: ellipsis` and `overflow: hidden` for very long names.
- Touch only the landing/header components and styles involved (follow existing patterns from the recent organization-name work if present in history/docs).

## Implementation summary

- **`front/src/app/shared/sidebar.component.ts`:** `.logo` shows **POS** only; `.sidebar-org-name` after `.version` when `tenantOrgName()` is set; mobile header uses `.mobile-brand` with **POS** + optional `.header-org-name`.
- **`front/src/app/shared/sidebar.component.scss`:** Styles for `.sidebar-org-name`, `.mobile-brand`, `.header-org-name`; `.logo-container` carries `title`/`aria-label` via `brandTitle()` for full branding.

## Testing instructions

1. **Manual (staff):** Log in with a tenant that has **Settings → Organization name** set.
2. **Desktop sidebar:** Order from top to bottom: **POS** (primary color, large); **version** + monospace **commit**; **organization name** (smallest, muted). Very long names should truncate with ellipsis; browser tooltip (`title`) should show the full organization name.
3. **Mobile / narrow viewport:** Top bar shows **POS**, then organization name on the next line (smaller, muted), without crowding the single-line `POS (org)` layout.
4. **Automated smoke:** From `front/` with app on HAProxy dev port (e.g. `4202`):  
   `SKIP_LANDING_PACKAGE_VERSION_CHECK=1 BASE_URL=http://127.0.0.1:4202 npm run test:landing-version`  
   With `LOGIN_EMAIL`/`LOGIN_PASSWORD` or `DEMO_LOGIN_*` in `.env`, the script exercises post-login sidebar navigation.
