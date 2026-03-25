# Success snackbar overlapping the button save

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/80

## Problem / goal

In **Settings**, after **Save**, the success snackbar/toast overlaps the save control. Desired behaviour: show the message more centrally on the page with a little offset from the top/bottom as appropriate, and **auto-dismiss after about one minute** (per reporter).

## High-level instructions for coder

- Identify which snackbar service / MatSnackBar config is used for settings save success.
- Adjust **position** (e.g. vertical/horizontal panel class or global config) so it does not cover the primary save action; prefer consistency with other success toasts in the app.
- Set **duration** to ~60 seconds (or configurable constant) for this flow if product agrees; ensure users can still dismiss manually if the component allows.
- Manually verify save flow on a typical settings screen after the change.
