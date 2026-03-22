# Screenshots

This folder holds screenshots used in the main [README.md](../../README.md) and in feature docs to give a visual overview of POS2.

## Capturing screenshots automatically

With the app running at `http://127.0.0.1:4202` (or set `BASE_URL`), run:

```bash
# From repo root; uses LOGIN_EMAIL and LOGIN_PASSWORD from .env or environment
LOGIN_EMAIL=owner@amvara.de LOGIN_PASSWORD=secret node front/scripts/capture-screenshots.mjs
# Or: npm run capture-screenshots --prefix front
```

Optional: set `PROVIDER_TEST_EMAIL` and `PROVIDER_TEST_PASSWORD` to also capture the provider dashboard. Use `HEADLESS=1` to run without opening a visible browser.

## Adding screenshots manually

1. Run the app locally or use a staging instance.
2. Capture the screen (e.g. PNG or WebP, ~1200–1600px wide for readability).
3. Save the file here with the name listed below.
4. Optionally strip or blur sensitive data (tenant name, real emails) if needed.

## Screenshots

### Staff dashboard

Quick links to Catalog, Reservations, Kitchen, Reports, and more. Used in the [main README](../../README.md).

![Staff dashboard at /dashboard](dashboard.png)

### Orders

Orders list with order cards, status, items, and actions.

![Orders list at /orders](orders.png)

### Kitchen display

Full-screen view for the kitchen. See [docs/0015-kitchen-display.md](../0015-kitchen-display.md).

![Kitchen display at /kitchen](kitchen.png)

### Reports (Informes)

Date range, summary cards, by product/category/table/waiter. See [docs/0016-reports.md](../0016-reports.md).

![Reports at /reports](reports.png)

### Reservations

Reservations list and management. See [docs/0011-table-reservation-user-guide.md](../0011-table-reservation-user-guide.md).

![Reservations at /reservations](reservations.png)

### Tables

Tables canvas and floor plan.

![Tables at /tables](tables.png)

### Customer menu

Customer-facing menu at `/menu/{table_token}`: products, cart, place order.

![Customer menu](menu.png)

### Provider dashboard

Provider catalog management. See [docs/0014-provider-portal.md](../0014-provider-portal.md).

![Provider dashboard at /provider](provider.png)

---

## File reference

| File | Where it's used |
|------|------------------|
| `dashboard.png` | Main README |
| `orders.png` | — |
| `kitchen.png` | docs/0015-kitchen-display.md |
| `reports.png` | docs/0016-reports.md |
| `reservations.png` | docs/0011-table-reservation-user-guide.md |
| `tables.png` | — |
| `menu.png` | — |
| `provider.png` | docs/0014-provider-portal.md |
