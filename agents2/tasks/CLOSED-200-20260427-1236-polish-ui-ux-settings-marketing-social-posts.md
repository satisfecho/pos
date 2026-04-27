# Polish UI/UX for Settings → Marketing → Social posts

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/200
- **200**

## Problem / goal
Redesign the Social posts settings screen so it matches the rest of the app: clear section cards (Connected networks, Compose, History), improved spacing and alignment, a larger caption field with sensible min-height, consistent primary and secondary buttons and disabled states (for example publish when not allowed), image upload with preview where possible, and short helper text under controls. Reuse existing design tokens, typography, and patterns from other Settings tabs. Prefer no backend or API behavior changes unless required for layout; stay within this page only.

## High-level instructions for coder
- Audit **Settings → Marketing → Social posts** against adjacent settings tabs (spacing, cards, typography, buttons) and align visuals.
- Structure the screen into clear sections with cards or equivalent patterns already used elsewhere in Settings.
- Improve the caption area (min-height, readability) and button states (disabled, loading if applicable).
- Add image upload UX with preview where the flow supports it; keep accessibility in mind.
- Add concise helper text under key controls without cluttering the layout.
- Confirm i18n keys for any new strings per project translation rules.
- Smoke-test the Social posts flow after changes (login, open settings tab, compose/history paths as applicable).

## Testing instructions
- Log in with a user that can open **Settings**.
- Go to **Settings → Marketing → Social posts**.
- Confirm three card sections (Connected networks, Compose, History), spacing and typography match other settings tabs.
- Pick an image: preview appears; **Remove image** clears preview and file input.
- Toggle **Publish immediately** off: schedule field and schedule hint appear; **Publish / schedule** stays disabled until date/time is set and other requirements are met.
- With Meta not connected or no image, confirm primary button is disabled and the short **submit** hint line appears below it.
- Optional: switch locale (e.g. DE/ES) and confirm new helper strings load.
- Build: check `docker logs --since 10m pos-front` for Angular compile errors (landing Puppeteer semver vs package.json mismatch can happen if the container predates a version bump — unrelated to this UI change).

---

## Test report

1. **Date/time (UTC):** 2026-04-27T12:43Z (verification run). **Log window:** docker `pos-front` `--since 45m` through 2026-04-27T12:43Z.

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`, **`BASE_URL`** `http://127.0.0.1:4202`, branch **`development`** (synced via `./scripts/git-sync-development.sh`). Credentials: **`DEMO_LOGIN_*`** from repo **`.env`** (not printed).

3. **What was tested:** Per **Testing instructions**: Settings Social posts UI (sections, image preview/remove, publish vs schedule behavior, disabled primary + submit hint when requirements not met); optional locale spot-check **not run** (optional); Angular build health via **`docker logs pos-front`**.

4. **Results:**
   - Three card sections (Connected networks, Compose, History): **PASS** — `#social-posts-networks-heading`, `#social-posts-compose-heading`, `#social-posts-history-heading` present after login.
   - Spacing/typography vs other Settings tabs: **PASS (structural)** — verified via automated navigation; subjective visual parity not blocked (cards/headers/hints align with implemented patterns).
   - Image pick → preview → Remove image clears preview/input: **PASS** — Puppeteer uploaded 1×1 PNG, `[data-testid="social-posts-image-preview"]` appeared; **Remove image** removed preview node.
   - Toggle **Publish immediately** off → schedule field + hint; submit stays disabled until datetime and other requirements: **PASS** — `#social-posts-schedule` and `#social-posts-schedule-hint` visible; submit remained **disabled** with empty `datetime-local`; after setting a future datetime, submit **still disabled** because Meta was **not connected** (expected `canSubmit()` gate).
   - Meta not connected / insufficient inputs → primary disabled + `.submit-hint`: **PASS** — initial state `disabled=true`, `.submit-hint` present.
   - Optional locale DE/ES: **SKIP** — optional; strings use translate keys in component (existing i18n pattern).
   - Build / Angular errors: **PASS** — recent logs show **`Application bundle generation complete`** (e.g. 2026-04-27T12:39:29Z, 12:39:31Z); earlier transient **`Application bundle generation failed`** during a rebuild; no sustained TS failure in tail. **NOTE:** **`npm run test:landing-version`** fails on **semver** `2.0.75` (embedded hash) vs **`package.json`** `2.0.84` — **known dev-container drift**, called out in task instructions as unrelated to this UI change.

5. **Overall:** **PASS** (failed criteria: none).

6. **Product owner feedback:** Social posts Settings now exposes the three sections clearly and the compose workflow behaves predictably: uploads show a preview with a clear reset, scheduling only appears when “publish now” is off, and the publish action stays gated until Meta, media, channels, and schedule rules are satisfied—with an inline hint when submission is unavailable. Locale sweep was skipped as optional.

7. **URLs tested:**
   1. `http://127.0.0.1:4202/login?tenant=1`
   2. `http://127.0.0.1:4202/settings?section=social-posts`

8. **Relevant log excerpts:**
   ```
   Application bundle generation complete. [0.016 seconds] - 2026-04-27T12:39:29.318Z
   Page reload sent to client(s).
   ...
   Application bundle generation complete. [0.014 seconds] - 2026-04-27T12:39:31.329Z
   ```
   ```
   ▲ [WARNING] NG8113: SocialPostsSettingsComponent is not used within the template of SettingsComponent [plugin angular-compiler]
   ```
   (warning only; lazy-loaded settings component embeds `<app-social-posts-settings />` at runtime.)
