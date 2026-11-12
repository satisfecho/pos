---
## Closing summary (TOP)

- **What happened:** Public landing hero still used a CSS/SVG phone mock instead of a restaurant POS photograph.
- **What was done:** After human approval on #445, the mock was replaced with `/landing/hero-pos-restaurant.jpg` in a responsive `.landing-hero__photo` figure, with alt text in all i18n locales.
- **What was tested:** Prod landing smoke and DOM checks on satisfecho.de - photo loads (4:3), no `.landing-phone`, desktop/mobile layout OK; `test:landing-version` PASS (Overall PASS).
- **Why closed:** All testing criteria passed; product owner approved the asset.
- **Closed at (UTC):** 2026-11-12 08:51
---

# Replace public landing phone mock with restaurant POS photo (#445)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/445
- **445**

## Status
- Implemented on `development` (human approved revised POS terminal photo on #445).
- Ready for tester.

## Problem / goal
On the public main landing page, the hero/phone area currently uses a CSS/SVG mock (`.landing-phone` / `.landing-phone__screen` in `front/src/app/landing/landing.component.ts`). Replace that visual with a photograph-style image of the Satisfecho POS UI on a computer inside a restaurant, with a blurry restaurant background.

## High-level instructions for coder
- Locate the public landing phone mock in `front/src/app/landing/landing.component.ts` (and related styles).
- Create or generate a suitable image asset (photograph look: POS on a screen in a restaurant, background blurred) and wire it into the landing so it replaces the current mock screen content.
- Keep layout responsive; do not invent a new landing redesign beyond this visual swap.
- Per issue: create the image first and **wait for human confirmation on the GitHub issue before treating the change as ready to ship/deploy**. After the asset is ready for review, post one waiting comment on #445 and set `**Waiting notice posted:** <UTC ISO>` under a **## Status** section; leave the task as **FEAT** until a human replies.
- Smoke after human approval: landing loads (`BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` from `front/`); front build clean in `docker logs --since 10m pos-front`.

## Agent notes (010)
- Human on #445 (2026-11-12T08:38:21Z): "ok. The picture is nice now - carry on." Cleared blocked waiting gate.
- Replaced `.landing-phone` CSS/SVG mock with `<figure class="landing-hero__photo">` + `/landing/hero-pos-restaurant.jpg` (already approved asset).
- Added `LANDING.HERO_POS_PHOTO_ALT` to all `front/public/i18n/*.json` locales.
- Responsive: tilt animation on desktop; no tilt under 960px; max width ~520px / ~420px.
- Rebuilt and redeployed `pos-front` (prod) so the asset and markup are live for smoke; restored `pos-back` with `--env-file config.env` after a recreate briefly used placeholder `SECRET_KEY`.

## Testing instructions
1. Open the public landing (`/` on local HAProxy or `https://satisfecho.de/`).
2. Confirm the hero visual is the restaurant POS terminal photograph (`/landing/hero-pos-restaurant.jpg`), not the old phone CSS mock (no `.landing-phone` chrome/dots/QR placeholders).
3. Confirm the image loads (network 200; visible 4:3 photo with tables UI on a waiter-station terminal).
4. Check desktop and a narrow viewport: layout remains two-column on wide screens; photo stacks under copy on mobile without overflow.
5. Smoke: `PUPPETEER_EXECUTABLE_PATH=<chrome> BASE_URL=https://satisfecho.de npm run test:landing-version --prefix front` (or `BASE_URL=http://127.0.0.1:4202` when local dev HAProxy is published). Expect landing version + Restaurant Demo card OK.
6. Optional DOM check: page has `.landing-hero__photo` / `img[src*="hero-pos-restaurant"]` with non-zero `naturalWidth`; no `.landing-phone`.

## Test report

1. **Date/time (UTC):** 2026-11-12T08:49:24Z start; finished ~2026-11-12T08:51:10Z. Log window: `docker logs --since 2026-11-12T08:49:00Z` on `pos-front` / `pos-haproxy`.
2. **Environment:** Host compose publishes HAProxy on 80/443 (no host `4202`); verification against production `BASE_URL=https://satisfecho.de`. Branch `development`. Chrome: `/root/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome`. `HEADLESS=1`.
3. **What was tested:** Public landing hero photo swap (#445): photograph instead of `.landing-phone` mock; image load/aspect; desktop vs narrow layout; landing-version smoke; DOM presence; contrast of hero copy/CTA on existing dark landing chrome.
4. **Results:**
   - Landing `/` loads: **PASS** - HTTP 200; hero figure present.
   - Hero is restaurant POS photo, not phone mock: **PASS** - `.landing-hero__photo` + `img[src="/landing/hero-pos-restaurant.jpg"]`; zero `.landing-phone` nodes.
   - Image loads (200, 4:3): **PASS** - JPEG HTTP 200, 257421 bytes; `naturalWidth` 1152 / height 864 (ratio 1.333); alt describes waiter-station terminal.
   - Desktop two-column / mobile stack, no overflow: **PASS** - 1440px grid `563px 509px`, photo right of copy; 390px single column, photo below copy; `scrollWidth == innerWidth`.
   - Smoke `test:landing-version`: **PASS** - version `2.1.191 d33b593ef`; Restaurant Demo card OK.
   - DOM optional: **PASS** - `.landing-hero__photo` / `img[src*="hero-pos-restaurant"]` with non-zero naturalWidth; no `.landing-phone`.
   - Contrast (UI): **PASS** - hero h1 `rgb(250,250,250)` on dark landing; primary CTA `rgb(10,10,11)` on `rgb(255,255,255)`; change is asset swap only (no new chrome palette).
5. **Overall:** **PASS**
6. **Product owner feedback:** The approved POS terminal photo reads clearly in the hero and replaces the old phone mock cleanly. Desktop keeps copy + visual side by side; mobile stacks without horizontal scroll. Safe to close from a UX/smoke perspective.
7. **URLs tested:**
   1. https://satisfecho.de/
   2. https://satisfecho.de/landing/hero-pos-restaurant.jpg
8. **Relevant log excerpts (last section):**
   - `pos-front`: `GET /landing/hero-pos-restaurant.jpg HTTP/1.1" 200 257421` (repeated during Puppeteer runs).
   - `pos-haproxy`: `GET https://satisfecho.de/landing/hero-pos-restaurant.jpg HTTP/2.0` → 200.
   - Smoke stdout: `>>> RESULT: Landing page shows version and demo restaurant card.`
