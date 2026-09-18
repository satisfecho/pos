# Booking URL still uses tenant number (#415)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/415
- **415**

## Status
- **Implemented** (010 feature coder) — 2026-09-18
- Version **2.1.175**

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

## What changed
- Route `/:publicSlug/book` loads the same book page (registered after fixed segments).
- `/book/{id}` (and `/book/{slug}`) still resolve via `GET /public/tenants/{ref}`; when `public_slug` is set, the page `replaceUrl`-navigates to `/{slug}/book`.
- Guest header, sales CTAs, public-menu / delivery / waitlist links, and platform public URLs prefer `/{slug}/book`.
- Helpers: `front/src/app/shared/public-book-path.ts`.
- Docs: `0011`, `0028`, `0010`, `0059`, `testing.md`, `AGENTS.md`; Settings i18n slug hint mentions booking path.
- Smoke: `npm run test:public-book-slug --prefix front`.

## Testing instructions

1. **App up** on HAProxy (e.g. `http://127.0.0.1:4202`). Confirm tenant 1 has `public_slug` via `GET /api/public/tenants/1`.
2. **Slug URL:** Open `http://127.0.0.1:4202/{public_slug}/book` — guest header and booking form load.
3. **Numeric URL:** Open `http://127.0.0.1:4202/book/1` — should canonicalize to `/{public_slug}/book`.
4. **Submit:** Create a reservation on the slug book page; success screen and manage link still work.
5. **Guest nav:** From book page, Menu link opens `/public-menu/{slug}` (or id); Book link stays on slug book path.
6. **Automated:**
   ```bash
   BASE_URL=http://127.0.0.1:4202 npm run test:public-book-slug --prefix front
   BASE_URL=http://127.0.0.1:4202 npm run test:public-guest-header --prefix front
   ```
7. **Front build:** `docker logs --since 10m pos-front` — no TS/NG compile errors (bundle generation complete).
