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

## Test report

1. **Date/time (UTC):** 2026-04-02 09:21 (approx.). **Log window:** front container logs around `2026-04-02T09:20:25Z`–`09:20:56Z` (rebuilds only; no errors).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **`BASE_URL`** `http://127.0.0.1:4202`; branch **`development`** @ `797d2f0`.
3. **What was tested:** Items 1–4 under **Testing instructions** (homepage footer legal links, navigation to `/terms` and `/privacy`, Puppeteer script, optional landing version).
4. **Results:**
   - Footer shows Terms + Privacy next to provider/register/contact (automated assertions): **PASS** — `test-landing-provider-links.mjs` reported “Terms of service link: OK”, “Privacy policy link: OK”.
   - `/terms` and `/privacy` load: **PASS** — `curl` returned **200** for `/`, `/terms`, `/privacy`.
   - `node scripts/test-landing-provider-links.mjs`: **PASS** — exit 0; full message ended with “Landing shows provider login, register, contact, terms, and privacy links; register link works.”
   - Optional `npm run test:landing-version`: **FAIL (environment drift, per task note)** — landing showed semver `2.0.66` vs `package.json` `2.0.68`; not treated as a regression for this feature per instruction 4.
5. **Overall:** **PASS** (mandatory and scripted criteria met; optional version check failed only due to bundle vs repo version mismatch).
6. **Product owner feedback:** Legal links are present on the public landing footer and the smoke test covers them. Operators should rebuild or refresh the front image when `test:landing-version` semver drift appears so the footer version matches releases.
7. **URLs tested:** (1) `http://127.0.0.1:4202/` (2) `http://127.0.0.1:4202/terms` (3) `http://127.0.0.1:4202/privacy` — plus in-script navigation to provider register from the landing test.
8. **Relevant log excerpts:**

```
pos-front | Application bundle generation complete. [0.619 seconds] - 2026-04-02T09:20:25.733Z
pos-front | Application bundle generation complete. [0.542 seconds] - 2026-04-02T09:20:37.736Z
pos-front | Application bundle generation complete. [0.759 seconds] - 2026-04-02T09:20:56.078Z
```
