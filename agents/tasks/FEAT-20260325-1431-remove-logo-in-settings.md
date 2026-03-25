# Remove logo in settings

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/95

## Problem / goal

- On `/settings`, deleting the restaurant logo via the delete control does not remove the uploaded logo (background image delete works).
- Fix logo removal end-to-end (UI, API payload, tenant `logo_filename` / storage) so it behaves like header background deletion.

## High-level instructions for coder

- Trace the settings branding UI: logo vs header background delete handlers and API calls.
- Fix the logo delete path (frontend request shape and/or backend handler) so the tenant no longer references a logo file after delete.
- Verify in browser: upload logo → delete → logo cleared and does not reappear on reload.
