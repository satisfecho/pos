# Two factor authentication button decoration

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/83

## Problem / goal

In **Settings → Security**, the two-factor authentication control sits flush against the text above. Add spacing (e.g. margin-top) so the button is visually separated from the preceding copy, consistent with other settings sections.

## High-level instructions for coder

- Locate the security / 2FA settings template and styles (Angular).
- Add layout spacing between the explanatory text block and the 2FA action button without breaking responsive layouts.
- Verify in the UI that spacing matches nearby settings cards and accessibility (focus order unchanged).
