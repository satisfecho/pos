# Screenshots

This folder holds screenshots used in the main [README.md](../../README.md) and in feature docs to give a visual overview of POS2.

## Capturing screenshots automatically

With the app running at `http://127.0.0.1:4202` (or set `BASE_URL`), run:

```bash
# From repo root; uses LOGIN_EMAIL and LOGIN_PASSWORD from .env or environment
LOGIN_EMAIL=owner@example.com LOGIN_PASSWORD=secret node front/scripts/capture-screenshots.mjs
# Or: npm run capture-screenshots --prefix front
```

Optional: set `PROVIDER_TEST_EMAIL` and `PROVIDER_TEST_PASSWORD` to also capture the provider dashboard. Use `HEADLESS=1` to run without opening a visible browser.

## Adding screenshots manually

1. Run the app locally or use a staging instance.
2. Capture the screen (e.g. PNG or WebP, ~1200–1600px wide for readability).
3. Save the file here with the name listed below.
4. Optionally strip or blur sensitive data (tenant name, real emails) if needed.

## Suggested screenshots

| File | Description | Where it’s used |
|------|-------------|------------------|
| `dashboard.png` | Staff dashboard at `/dashboard`: quick links to Catalog, Reservations, Kitchen, Reports, etc. | Main README |
| `orders.png` | Orders list at `/orders`: order cards with status, items, actions. | docs/0008, README |
| `kitchen.png` | Kitchen display at `/kitchen`: full-screen order cards. | docs/0015-kitchen-display.md |
| `reports.png` | Reports at `/reports`: date range, summary cards, by product/category/table. | docs/0016-reports.md |
| `menu.png` | Customer menu at `/menu/{table_token}`: products, cart, place order. | README |
| `reservations.png` | Reservations list at `/reservations`. | docs/0011-table-reservation-user-guide.md |
| `provider.png` | Provider dashboard at `/provider`: catalog tiles/list. | docs/0014-provider-portal.md |
| `tables.png` | Tables canvas at `/tables`: floor plan with table shapes. | README (optional) |

Once files are added, the README and docs will display them automatically.
