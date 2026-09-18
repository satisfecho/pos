# Tenant public branding (background color, primary button & header image)

**Status: shipped.** Public background colour, primary button colour, and header image are live for the routes in the coverage table below. This doc is the operator/agent reference for Settings fields, API, and which public pages bind those tokens.

Restaurant owners can customise the look of **public-facing pages** (book a table, customer menu, reservation view, waiting list, guest feedback, delivery) with:

- **Background colour** — Hex colour for the page background (e.g. `#1E22AA` for RAL5002 Azul). Set in **Settings → Business profile** via colour picker, hex input, or the optional **Apply RAL5002 (#1E22AA)** preset (one-click fill only; does not lock the field).
- **Primary button colour** — Hex colour for primary CTAs (e.g. Book table, Submit). Set in the same Business profile section. Empty uses the OOBE default **blue** (`#2563EB`). Presets: blue and green. Secondary actions (e.g. waiting-list text link) stay muted and do not use this colour.
- **Header background image** — Image shown behind the hero header (logo and restaurant name). Upload in **Settings → Business profile**; JPG, PNG, WebP or AVIF; same size/optimisation as logo. Remove via the ✕ button (calls `DELETE /tenant/header-background`).

## Where it applies

| Page | Background colour | Primary button colour | Header image |
|------|-------------------|----------------------|--------------|
| `/book/:tenantId` or `/{public_slug}/book` | ✓ | ✓ | ✓ |
| `/public-menu/:tenantRef` | ✓ | ✓ | ✓ |
| `/menu/:token` | ✓ | ✓ | ✓ |
| `/reservation?token=...` | ✓ | ✓ | ✓ |
| `/waitlist/:tenantId` | ✓ | ✓ | ✓ |
| `/feedback/:tenantId` | ✓ | ✓ | ✓ |
| `/delivery/:tenantId` | ✓ | ✓ | ✓ |
| Landing `/` | — | — | — (multi-tenant list) |

When a header image is set, a dark overlay keeps text readable.

## Backend

- **Model:** `Tenant.public_background_color` (VARCHAR, hex), `Tenant.public_primary_color` (VARCHAR, hex), `Tenant.header_background_filename` (stored under `uploads/{tenant_id}/header/`), `Tenant.city`, `Tenant.public_slug` (unique; name-city public menu path, #413).
- **Migrations:** `20260319100000_add_tenant_public_background_color.sql`, `20260319110000_add_tenant_header_background.sql`, `20260914152000_add_tenant_public_primary_color.sql`, `20260917141754_tenant_public_slug.sql`.
- **Endpoints:** `GET /uploads/{tenant_id}/header/{filename}` (serve image), `POST /tenant/header-background` (upload), `DELETE /tenant/header-background` (remove). Logo (business profile): `POST /tenant/logo`, `DELETE /tenant/logo` (remove file and clear `logo_filename`). Public tenant and menu responses include `public_background_color`, `public_primary_color`, `city`, `public_slug`, and `header_background_filename` / `tenant_header_background_filename` / `tenant_public_primary_color`. `GET /public/tenants/{ref}` and `GET /public/tenants/{ref}/menu` accept numeric id or `public_slug`.

## Frontend

- **Settings:** Business profile tab: “Public site background color” (colour + hex + RAL5002 preset), “Public primary button colour” (colour + hex + blue/green presets), “Header background image” (upload + remove).
- **Public pages:** Root container gets `[style.--color-bg]` when background colour is set; `[style.--color-primary]` from tenant primary or blue default (`resolvePublicPrimaryColor` in `front/src/app/shared/public-brand-colors.ts`); hero header gets `[style.background-image]` and class `has-bg-image` when header image is set (with overlay in SCSS). Shared **`app-public-guest-header`** stays at the top while scrolling (logo, name, links to menu / book / waitlist / delivery / loyalty / feedback, language picker). Loyalty join (`/loyalty/:tenantId`) and card (`/loyalty/card/:token`) use that header; card and join-success also show **`app-public-guest-sales-ctas`** (menu / book / delivery body CTAs, #374). **`/public-menu/:tenantRef`** accepts numeric id or **`public_slug`** (name-city, #413); old numeric URLs still work and canonicalize to the slug when set. Guest booking uses **`/{public_slug}/book`** when a slug exists (#415); numeric **`/book/:id`** still works and redirects to the slug form. Contact footer (phone / WhatsApp / email / address / maps) sits above back and legal links (#412), using the same public tenant fields as `/book`.
- **Public slug (#413 / #415):** `Tenant.city` + unique `Tenant.public_slug`. Format is **name-city** (e.g. `demo-pizzeria-barcelona`). Set city and optional slug in **Settings → Business profile**. Public APIs `GET /public/tenants/{ref}` and `…/menu` resolve `{ref}` as id or slug. Booking links prefer `/{slug}/book`; menu links prefer `/public-menu/{slug}`.
- **Hover/light tokens:** Global `--color-primary-hover` and `--color-primary-light` use `color-mix` from `--color-primary`, so a single page override updates button hover states.
- **Button contrast (#408):** Primary CTAs use `--color-on-primary` (white) on `--color-primary`. Secondary / calendar-nav controls use `--color-subtle` (fixed light chrome), not `--color-bg`, so a dark tenant page wash does not produce black text on a blue control fill. Do not override `--color-subtle` or `--color-on-primary` from tenant branding.
- **Content panels (#414):** Blocks that sit on the page wash (e.g. `/public-menu` contact footer) use `--color-surface` (or `--color-subtle`), not `--color-bg`, so dark text and primary links stay readable when the wash is dark.
- **Guest nav contrast (#411):** Sticky `app-public-guest-header` uses the tenant wash as `--hero-header-bg`. Ink is `--hero-header-fg` from `pickContrastingForeground()` in `front/src/app/shared/public-brand-colors.ts` (dark ink on light washes, white on dark). Pass `[headerBackgroundColor]` from the page tenant payload so ink resolves without a flash. Do not hard-code white text on that bar.
