# How to capture screenshots

This document covers automatic (Puppeteer) and manual capture of PNGs stored in [docs/screenshots/](./). For the inventory of files and where each is used, see [README.md](README.md).

## Capturing screenshots automatically

With the app running at `http://127.0.0.1:4202` (or set `BASE_URL`), run:

```bash
# From repo root; uses LOGIN_EMAIL and LOGIN_PASSWORD from .env or environment
LOGIN_EMAIL=... LOGIN_PASSWORD=... node front/scripts/capture-screenshots.mjs
# Or: npm run capture-screenshots --prefix front
```

Optional captures (skipped with a clear log line when unset or login fails):

- `PROVIDER_TEST_EMAIL` / `PROVIDER_TEST_PASSWORD` - provider dashboard
- `COURIER_EMAIL` / `COURIER_PASSWORD` (or `COURIER_TEST_*`) - courier portal home
- `PLATFORM_OPERATOR_EMAIL` / `PLATFORM_OPERATOR_PASSWORD` - platform operator dashboard

Public **delivery** and **waitlist** use `TENANT_ID` (default `1`) and need no extra credentials. Runs headless by default; set `HEADLESS=0` to open a visible browser.

## Adding screenshots manually

1. Run the app locally or use a staging instance.
2. Capture the screen (e.g. PNG or WebP, ~1200-1600px wide for readability).
3. Save the file in this folder with the name listed in [README.md](README.md).
4. Optionally strip or blur sensitive data (tenant name, real emails) if needed.
