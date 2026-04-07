# Nicer booking page

## GitHub Issues
- [github.com/satisfecho/pos/issues](https://github.com/satisfecho/pos/issues)
- `gh issue list --repo satisfecho/pos --state open --limit 40`
- Optional: `--json number,title,labels,updatedAt,url`
- **Issue:** https://github.com/satisfecho/pos/issues/173

## Problem / goal
Improve the public booking page (example tenant URL in issue: `/book/1081` on local dev). **Readability:** the `hero-content` area should use styling (background, rounded corners, padding/margins) so text stays readable over the existing background image—keep the image, improve contrast and legibility. **Links:** when the restaurant has a website URL configured, expose it as a normal clickable link in the UI.

## High-level instructions for coder
- Locate the booking page component/template and styles for the hero section; align with existing design tokens and `front/public/i18n` for any new strings.
- Implement a readable overlay or panel for hero text (background, radius, spacing) without removing the background image.
- Wire the restaurant website field so it renders as a proper anchor (`href`, accessibility, open behavior per product norms).
- Smoke-test the public booking flow for at least one tenant; verify responsive layout.

## Implementation summary
- **`front/src/app/book/book.component.scss`:** Stronger frosted panel (blur, inset highlight, darker rgba with `has-bg-image`), horizontal padding on `.hero-content`, text shadow on title/tagline when a header image is present.
- **`front/src/app/book/book.component.ts`:** `websiteHref` (adds `https://` when no scheme), `websiteLinkText` (hostname without `www`, else `BOOK.WEBSITE`).
- **`front/src/app/book/book.component.html`:** Website anchor uses computeds, `title` = full href, small external-link SVG, `rel="noopener noreferrer"` + `target="_blank"` unchanged.

## Testing instructions
1. Sync **`development`**; ensure stack is up (`docker compose -f docker-compose.yml -f docker-compose.dev.yml ps`); app on **`http://127.0.0.1:4202`** (HAProxy).
2. Open a public booking page for a tenant with a **header background image** and **website** set in settings (e.g. **`/book/{tenantId}`**). Confirm hero text is readable (panel + shadows on busy image).
3. Confirm **website** link: visible **hostname** as text, **opens in new tab**, tooltip shows full URL; if settings store URL without `https://`, link still works.
4. Keyboard: tab to website link — **focus ring** visible.
5. Regression: `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` (pass).
6. Optional: `node front/scripts/debug-reservations-public.mjs` with `BASE_URL` if public flow smoke is required.
