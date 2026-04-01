# Tablet UX: Join tables via drag + proximity (primary flow)

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/141

## Problem / goal

Refine table join (group) UX so that on tablet/touch the primary path is: select or start dragging a table, drag toward another table until a proximity/overlap threshold in **floor canvas** coordinates (stable with zoom/pan), then show a confirmation (“Join table A and table B?”). On confirm, use existing join/group API; on cancel or moving apart, clear pending state without API calls. Keep multi-select + Join button as fallback for desktop/accessibility. Avoid relying on simultaneous two-finger multi-touch on two tables (browser/OS gesture conflicts). Document one threshold approach (e.g. min distance vs overlap ratio). Optional: debounce before opening dialog; subtle visual hint in the “join zone”; surface backend conflict errors (orders/reservations) in dialog or toast. Add i18n for the modal across shipped locales and a short note in docs or CHANGELOG.

## High-level instructions for coder

- Implement touch/drag + proximity on the tables floor canvas using the same coordinate space as the canvas (account for zoom/pan).
- Reuse existing join/group backend flows; add confirmation modal with full i18n keys.
- Keep non-gesture join path working.
- Document gesture and threshold choice briefly for operators/developers.
