# Move GitHub link to landing-version area

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/134

## Problem / goal
Expose the repository link beside the landing page version line: add a **GitHub icon/link inside the `landing-version` region** (not only the footer). Add a short **tagline** alongside that area: open-source positioning and attribution to El Masnou (Barcelona) and Los Mochis (Mexico), with a heart symbol as in the issue. See existing landing footer GitHub work in `docs/` / closed tasks only for UX consistency, not to duplicate two competing patterns without product intent.

## High-level instructions for coder
- Locate the **landing version** UI (component/template that shows app version on the public landing page) and add a compact **GitHub** affordance (icon + link to `https://github.com/satisfecho/pos/`) within or adjacent to that **`landing-version`** block so the link reads as part of the version strip.
- Add the **tagline** copy; use **ngx-translate** keys under `front/public/i18n/` per project i18n rules (no hard-coded locale-only strings in templates).
- Reconcile with the **footer** GitHub link from prior issue **#133**: avoid cluttered double links—either move primary link to the version area, or keep one clear primary location per product decision; keep `data-testid` / smoke expectations in mind (`test:landing-version` may need selector updates).
- Verify responsive layout: narrow viewports must not break the version + icon + tagline row.

## Implementation notes (coder)
- **`landing.component.ts`:** GitHub moved from footer into `[data-testid="landing-version"]`: row with semver + commit + icon link (`data-testid="landing-github"`, `aria-label` from `LANDING.GITHUB_REPO`). Tagline in `<p class="landing-version-tagline">` via `LANDING.OPEN_SOURCE_TAGLINE`. Extra bottom padding on `.landing-page` for two-row version bar.
- **i18n:** `OPEN_SOURCE_TAGLINE` added to all `front/public/i18n/*.json` locales.

## Testing instructions
1. Sync/build: `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` — no TS/Angular errors after edit.
2. Smoke: `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` (or `LANDING_VERSION_ONLY=1` for version-only).
3. Manual (logged out, `/`): Bottom bar shows version + commit, GitHub octocat icon linking to `https://github.com/satisfecho/pos/`, tagline below; **no** GitHub link in the footer link row. Narrow viewport: bar wraps without clipping.
4. Optional: switch language — tagline and GitHub `aria-label` follow locale files.
