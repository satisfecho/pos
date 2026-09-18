# Booking URL still uses tenant number (#415)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/415
- **415**

## Problem / goal
Public booking still uses a numeric tenant id in the path (`/book/1`). Product wants a slug-based URL, e.g. `https://satisfecho.de/demo-restaurant-barcelona/book/` (slug + `/book/`), matching the nicer public-menu style from **#413** / `Tenant.public_slug`.

See **`docs/0028-tenant-public-branding.md`** (public slug) and **`docs/0010-table-reservation-implementation-plan.md`** (optional slug booking noted as later). Keep guest booking working; prefer dual resolve (id or slug) and clear canonical links.

## High-level instructions for coder
- Confirm current routes and APIs for `/book/:tenantId` (front routes, public reservation create, shared guest header / QR / settings share links).
- Reuse **`Tenant.public_slug`** (name-city, #413). Do not invent a second slug field.
- Support a guest-facing booking URL that uses the slug (issue example shape: `/{public_slug}/book/` or equivalent dual path). Keep numeric `/book/{id}` working or redirect/canonicalize to the slug form when a slug exists.
- Resolve tenant the same way as public menu (`GET /public/tenants/{ref}` id|slug). Update any client that assumes only numeric `tenantId` for booking.
- Update share/QR/settings copy and docs that still say `/book/1` only (`docs/0011-table-reservation-user-guide.md`, related public branding notes) when behaviour lands.
- Smoke: open slug booking URL and numeric URL for demo tenant; form submit still creates a reservation; front build clean in `docker logs --since 10m pos-front`. Prefer existing book Puppeteer scripts where they fit.
