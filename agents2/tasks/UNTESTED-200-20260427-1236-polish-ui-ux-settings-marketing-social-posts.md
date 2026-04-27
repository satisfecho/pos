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
