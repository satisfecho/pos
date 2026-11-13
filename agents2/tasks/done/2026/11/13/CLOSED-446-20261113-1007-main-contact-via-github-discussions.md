---
## Closing summary (TOP)

- **What happened:** Marketing contact CTAs used mailto for main product contact instead of public GitHub Discussions.
- **What was done:** About, Pricing, landing footer, and provider login/register contact links now open GitHub Discussions (new tab); i18n and Puppeteer expectations updated.
- **What was tested:** About / Pricing / landing CTAs and Puppeteer (`test-landing-provider-links`, `test:about`, `test:pricing`) PASS on satisfecho.de; front serve healthy.
- **Why closed:** All verification criteria passed.
- **Closed at (UTC):** 2026-11-13 10:23
---

# Main contact via GitHub Discussions (#446)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/446
- **446**

## Status
- **CLOSED** - verification PASS 2026-11-13 (UTC).
- **Implemented:** 2026-11-13 (UTC) - main product contact CTAs now open GitHub Discussions.

## Problem / goal
Public marketing contact should go through GitHub (prefer Discussions), not email. Feedback, questions, and issues belong in public GitHub channels.

Replace email contact CTAs on marketing pages with a clear, inviting link to GitHub Discussions (`https://github.com/satisfecho/pos/discussions`). Issues (`https://github.com/satisfecho/pos/issues`) is an acceptable secondary target if Discussions does not fit a given CTA.

Known surfaces from the issue:
- `/about` - email link (`mailto:hello@satisfecho.de`)
- `/pricing` - "Contactenos" / contact CTA currently mailto

## High-level instructions for coder
- Find marketing/public contact CTAs that use `mailto:hello@satisfecho.de` (at least About and Pricing; check landing footer / shared contact links if they are the same "main contact" pattern).
- Replace those main product-contact links with an inviting sentence/CTA that opens GitHub Discussions (new tab, `rel="noopener noreferrer"`). Prefer Discussions over Issues.
- Do **not** change operational mailto links that are not "contact Satisfecho the product" (e.g. tenant email on book/menu, platform owner emails, guest-feedback contact_email).
- Update i18n copy (en/es/de as used by those pages) so the CTA invites people to open a Discussion instead of sending email.
- Smoke: open `/about` and `/pricing`; confirm contact CTAs point to Discussions and front build is clean in `docker logs --since 10m pos-front`.

## Implementation notes
- Replaced `mailto:hello@satisfecho.de` with `https://github.com/satisfecho/pos/discussions` (`target="_blank"`, `rel="noopener noreferrer"`) on:
  - `/about` contact section (`data-testid="about-contact-discussions"`)
  - `/pricing` support CTA (`data-testid="pricing-cta-support"`)
  - shared landing footer Contact us (`data-testid="landing-contact-us"`)
  - provider login / register footers (same main-product contact pattern)
- i18n: updated `LANDING.CONTACT_US`, `ABOUT_PAGE.CONTACT_BODY`, new `ABOUT_PAGE.CONTACT_LINK`, `PRICING_PAGE.CTA_SUPPORT`, `PRICING_PAGE.SUPPORT_NOTE` across locales; filled missing Arabic support keys used by pricing.
- Updated `front/scripts/test-landing-provider-links.mjs` and `docs/testing.md` expectations.

## Testing instructions
1. Open `/about`: contact section body invites public discussion; link text uses `ABOUT_PAGE.CONTACT_LINK`; href is `https://github.com/satisfecho/pos/discussions`; opens in a new tab; no `mailto:hello@satisfecho.de`.
2. Open `/pricing`: support CTA (`data-testid="pricing-cta-support"`) points to the same Discussions URL (new tab); no mailto on that CTA.
3. Open landing `/`: footer Contact us (`data-testid="landing-contact-us"`) points to Discussions.
4. Optional: `BASE_URL=… PUPPETEER_EXECUTABLE_PATH=… node front/scripts/test-landing-provider-links.mjs`, `npm run test:about --prefix front`, `npm run test:pricing --prefix front`.
5. Confirm front production/static build succeeds (no Angular compile errors for these pages).

## Test report

- **Date/time (UTC):** 2026-11-13T10:20:09Z start - 2026-11-13T10:22:03Z end. Log window: `docker logs --since 20m pos-front`.
- **Environment:** Local amvara9-style stack (`docker-compose.yml` + `docker-compose.prod.yml`); HAProxy on 80/443. Branch `development`. `BASE_URL=https://satisfecho.de` (same host as 127.0.0.1; valid cert for CN=satisfecho.de). `HEADLESS=1`, `PUPPETEER_EXECUTABLE_PATH=/root/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome`.
- **What was tested:** About / Pricing / landing Contact CTAs to GitHub Discussions; no `mailto:hello@satisfecho.de` on those CTAs; optional Puppeteer scripts; front serve health.

### Results
1. **/about contact** - **PASS** - `[data-testid="about-contact-discussions"]` href=`https://github.com/satisfecho/pos/discussions`, `target=_blank`, `rel=noopener noreferrer`, link text "Open GitHub Discussions"; contact body invites public discussion; no `mailto:hello@satisfecho`.
2. **/pricing support CTA** - **PASS** - `[data-testid="pricing-cta-support"]` same Discussions URL, new tab; text "Start a discussion"; no mailto on CTA.
3. **Landing Contact us** - **PASS** - `[data-testid="landing-contact-us"]` href Discussions; text "Discuss on GitHub"; `test-landing-provider-links.mjs` EXIT 0.
4. **Puppeteer suite** - **PASS** - `test-landing-provider-links.mjs`, `npm run test:about`, `npm run test:pricing` all EXIT 0 against `https://satisfecho.de`.
5. **Front build / serve** - **PASS** - Pages and chunks HTTP 200; no Angular compile errors in `pos-front` logs for this window (only unrelated kebab-factory `menu-recortes` open() noise from other traffic).

### Overall: **PASS**

### Product owner feedback
Main product contact now clearly routes people to public GitHub Discussions instead of a private mailbox. About, Pricing, and the landing footer all share the same inviting pattern (new tab, noopener). Ready for closer to archive.

### URLs tested
1. https://satisfecho.de/
2. https://satisfecho.de/about
3. https://satisfecho.de/pricing
4. https://127.0.0.1/ (DOM probe with ignoreHTTPSErrors; same stack)
5. https://127.0.0.1/about
6. https://127.0.0.1/pricing
7. https://github.com/satisfecho/pos/discussions (href target only; not navigated as SPA)

### Relevant log excerpts
```
172.18.0.7 - - [13/Nov/2026:10:21:44 +0000] "GET / HTTP/1.1" 200 2750 ... HeadlessChrome
172.18.0.7 - - [13/Nov/2026:10:21:48 +0000] "GET /pricing HTTP/1.1" 200 2750 ... HeadlessChrome
# earlier DOM window:
172.18.0.7 - - [13/Nov/2026:10:21:24 +0000] "GET /about HTTP/1.1" 200 2750 ... HeadlessChrome
# no TS/NG/Application bundle generation failed lines in --since 20m (excluding unrelated menu-recortes 404s)
```
