# Tables canvas: remove move-mode toggle; revert layout on join dialog cancel

## GitHub Issues
- [github.com/satisfecho/pos/issues](https://github.com/satisfecho/pos/issues)
- `gh issue list --repo satisfecho/pos --state open --limit 40`
- Optional: `--json number,title,labels,updatedAt,url`
- **Issue:** https://github.com/satisfecho/pos/issues/156

## Problem / goal
Remove the “Moviendo mesas” / move-mode UI and any logic that forces Alt or a toggle to reposition tables. Default table drag should always persist layout position like normal floor-plan editing. Keep overlap + hold + release → “Join tables?” modal. If the user cancels or dismisses without confirming, snap all affected tables back to positions captured at drag start. On confirm, keep current success path (API + layout restore). Update i18n and hints so they no longer mention Alt, move toggle, or move mode.

## High-level instructions for coder
- Locate tables canvas / floor-plan components and remove move-mode toggle and Alt-gated drag behavior; make drag-to-position the default path.
- Implement or verify “join on overlap” gesture unchanged except for the above; ensure cancel/dismiss on the join dialog restores pre-drag positions for every table involved in the gesture.
- After successful join, preserve existing API and UI behavior.
- Sweep `front/public/i18n/*.json` (and any inline hints) for strings referencing Alt, move mode, or the removed toggle; align copy with the new interaction model.
- Smoke-test: drag tables, open join dialog, cancel → positions revert; confirm join → group forms as today.
