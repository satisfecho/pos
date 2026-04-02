# Missing mandatory legal links on homepage

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/146

## Problem / goal
The public homepage must expose **Terms of Service** and **Privacy Policy** in a way that meets mandatory legal accessibility expectations: both documents should be easy to find from the landing/home page (clear links in the footer or another standard, discoverable location consistent with the rest of the app).

## High-level instructions for coder
- Add or wire prominent links to ToS and Privacy Policy from the homepage (and ensure routes or static pages exist and match product/legal requirements).
- Follow existing layout, i18n, and styling patterns for the landing area.
- Verify links are visible without hunting (footer or equivalent).

## Implementation notes (coder)
- **Landing footer** (`front/src/app/landing/landing.component.ts`): Always show **`routerLink` → `/terms`** and **`/privacy`** with `LEGAL.TERMS_OF_SERVICE` and `LEGAL.PRIVACY_POLICY` (same row as register/provider/contact). Removed conditional **`app-legal-links`** + **`getPublicLegalUrls()`** on the landing page so legal links are not hidden when server public URLs are unset.
- **CHANGELOG:** Fixed entry for GitHub #146.
- **Smoke test:** `front/scripts/test-landing-provider-links.mjs` extended with **`data-testid="landing-terms"`** / **`landing-privacy`** assertions.

## Testing instructions
1. With the stack up (e.g. HAProxy on `4202`), open `/` logged out. In the footer, confirm **Terms of service** and **Privacy policy** appear next to the other links (no dependency on API legal URL config).
2. Click each link; confirm **`/terms`** and **`/privacy`** load the legal document views.
3. From `front/`: `BASE_URL=http://127.0.0.1:4202 node scripts/test-landing-provider-links.mjs` — should pass (includes terms/privacy checks).
4. Optional: `npm run test:landing-version` — if it fails on semver vs `package.json`, rebuild/restart the front container so the served bundle matches the repo version (environment drift, not specific to this change).
