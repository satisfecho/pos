# Contact us

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/104

## Problem / goal
Add a **Contact us** link in the **app landing** footer. Copy must respect **i18n** (all supported locales). Use contact address **`sales@saitsfecho.de`** as given in the issue; confirm spelling with product/marketing if the domain should be **`satisfecho.de`**.

## High-level instructions for coder
- Locate the landing footer component/layout and add a visible **Contact us** link (or mailto) consistent with existing footer styling.
- Add translation keys for the link label in **`front/public/i18n/*.json`** (parity with reference locale); avoid hard-coded English-only strings.
- Wire the target email to match the issue once confirmed; use existing patterns for external links or `mailto:` if the app already does so elsewhere.
- Smoke-check landing in at least two locales and run the usual front build log check after changes.

## Implementation (feature coder)
- **`front/src/app/landing/landing.component.ts`:** Footer adds a **Contact us** link after provider register, same `footer-sep` styling, `href="mailto:sales@satisfecho.de"`, `data-testid="landing-contact-us"`, label `LANDING.CONTACT_US`.
- **Email domain:** Issue text used `saitsfecho.de` (typo). Implemented **`sales@satisfecho.de`** to match the product domain used elsewhere (e.g. production host). Product/marketing can confirm if a different address is required.
- **`front/public/i18n/*.json`:** New key **`LANDING.CONTACT_US`** in en, de, es, ca, fr, zh-CN, hi, bg.
- **`front/scripts/test-landing-provider-links.mjs`:** Asserts contact link present and `href === mailto:sales@satisfecho.de`.

## Testing instructions (tester)
1. Start stack (e.g. `docker compose -f docker-compose.yml -f docker-compose.dev.yml`); app on HAProxy port (often **4202**).
2. Run: `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-landing-provider-links.mjs` — expect **Contact us (mailto) link: OK** and overall exit 0.
3. Optional: `npm run test:landing-version --prefix front` with same `BASE_URL` if credentials available.
4. Manual: Open `/`, use language picker (e.g. English → German), confirm footer shows localized contact label and link target is **sales@satisfecho.de**.
5. `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` — no Angular build errors after changes.
