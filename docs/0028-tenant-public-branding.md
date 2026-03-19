# Tenant public branding (background color & header image)

Restaurant owners can customise the look of **public-facing pages** (book a table, customer menu, reservation view) with:

- **Background colour** — Hex colour for the page background (e.g. `#1E22AA` for RAL5002 Azul). Set in **Settings → Business profile** via colour picker, hex input, or the **RAL5002 (Azul)** preset.
- **Header background image** — Image shown behind the hero header (logo and restaurant name). Upload in **Settings → Business profile**; JPG, PNG, WebP or AVIF; same size/optimisation as logo. Remove via the ✕ button (calls `DELETE /tenant/header-background`).

## Where it applies

| Page | Background colour | Header image |
|------|-------------------|--------------|
| `/book/:tenantId` | ✓ | ✓ |
| `/menu/:token` | ✓ | ✓ |
| `/reservation?token=...` | ✓ | ✓ |
| Landing `/` | — | — (multi-tenant list) |

When a header image is set, a dark overlay keeps text readable.

## Backend

- **Model:** `Tenant.public_background_color` (VARCHAR, hex), `Tenant.header_background_filename` (stored under `uploads/{tenant_id}/header/`).
- **Migrations:** `20260319100000_add_tenant_public_background_color.sql`, `20260319110000_add_tenant_header_background.sql`.
- **Endpoints:** `GET /uploads/{tenant_id}/header/{filename}` (serve image), `POST /tenant/header-background` (upload), `DELETE /tenant/header-background` (remove). Public tenant and menu responses include `public_background_color` and `header_background_filename` / `tenant_header_background_filename`.

## Frontend

- **Settings:** Business profile tab: “Public site background color” (colour + hex + RAL5002 preset), “Header background image” (upload + remove).
- **Public pages:** Root container gets `[style.--color-bg]` when colour is set; hero header gets `[style.background-image]` and class `has-bg-image` when header image is set (with overlay in SCSS).
