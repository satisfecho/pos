---
## Closing summary (TOP)

- **What happened:** GitHub issue #134 asked to expose the repo link beside the landing page version line with an open-source tagline and El Masnou / Los Mochis attribution, without cluttering duplicate footer links.
- **What was done:** The landing version strip now includes the GitHub icon/link, translated tagline via ngx-translate, and footer GitHub was removed so the version area is the primary location; layout padding and responsive behavior were adjusted per implementation notes.
- **What was tested:** Tester reported PASS: Docker front rebuilds clean, `test:landing-version` (with `LANDING_VERSION_ONLY=1`) passed, manual checks for test ids, href, no GitHub in footer, and narrow viewport (375×667) passed.
- **Why closed:** All required test criteria passed; overall PASS with product owner sign-off in the test report.
- **Closed at (UTC):** 2026-04-01 08:34
---

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

---

## Test report

1. **Date/time (UTC) and log window:** 2026-04-01 — verification ~08:30–08:36 UTC; Docker `pos-front` logs reviewed for the recent rebuild window (includes `2026-04-01T08:28:14Z` … `08:28:18Z`).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` (synced via `./scripts/git-sync-development.sh` before edits).

3. **What was tested:** Items under **Testing instructions** — front build health, `test:landing-version`, manual checks for GitHub in version bar, tagline, no GitHub in footer, narrow viewport. Optional locale switch not exercised.

4. **Results:**
   - **Docker front logs — no TS/Angular errors:** **PASS** — last 80 lines show successful rebuilds (`Application bundle generation complete`), no `ERROR` / `TS2345` / bundle failed lines in sample.
   - **Smoke `npm run test:landing-version` with `LANDING_VERSION_ONLY=1`:** **PASS** — exit 0; version text includes semver `2.0.66`, commit hash, and tagline snippet.
   - **Manual — GitHub link in `[data-testid="landing-version"]`, href `https://github.com/satisfecho/pos/`, `[data-testid="landing-github"]` present:** **PASS** — Puppeteer `page.evaluate` confirmed href and test id.
   - **Manual — tagline non-empty below version row:** **PASS** — `.landing-version-tagline` has visible translated text (also visible in smoke output).
   - **Manual — no GitHub link in `.landing-footer`:** **PASS** — zero footer anchors with `github.com` in `href`.
   - **Manual — narrow viewport (375×667) — version bar / icon not clipped:** **PASS** — `likelyClipped: false`, `ghInViewport: true`.

5. **Overall:** **PASS** (all required criteria met).

6. **Product owner feedback:** The landing bottom bar now presents version, commit, and repository access in one strip with a clear open-source tagline, without duplicating GitHub in the footer link row. Layout holds on a narrow phone-width viewport.

7. **URLs tested:**
   1. `http://127.0.0.1:4202/` (desktop viewport, logged out)
   2. `http://127.0.0.1:4202/` (375×667 viewport, reload)

8. **Relevant log excerpts (last section):**

```
pos-front | Application bundle generation complete. [0.009 seconds] - 2026-04-01T08:28:14.561Z
pos-front | Application bundle generation complete. [0.009 seconds] - 2026-04-01T08:28:16.583Z
pos-front | Application bundle generation complete. [0.009 seconds] - 2026-04-01T08:28:18.591Z
```

Smoke script (excerpt): `>>> RESULT: Landing page shows version.` (exit code 0).
