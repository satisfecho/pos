# Place an order: table PIN dialog UX

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/86

## Problem / goal
When placing an order, a dialog asks for the **table PIN**. Waiters find it hard to leave that flow to check the tables view and return to continue the order. Reporter suggests showing the **table PIN in the dialog** (e.g. upper area) so the waiter does not need to navigate away.

## High-level instructions for coder
- Find the order-placement dialog that collects the table PIN; trace how table context (table id, name, PIN or hint) is available when the dialog opens.
- Design minimal UX: surface the PIN (or safe hint if PIN must not be shown in full per policy) **inside the dialog** so waiters can complete entry without round-tripping to `/tables`.
- Preserve security expectations: if full PIN must not be displayed, show table name/number and link or secondary affordance that matches product rules.
- Test happy path and cancel/back; ensure keyboard focus and mobile layouts still work.

## Implementation summary (coder)
- **Root cause:** Staff **Tables** “Open menu” used the **public** `/menu/{token}` URL (same as QR / copy link), so `table_requires_pin` was true and the PIN modal appeared when placing an order.
- **Fix:** Staff open-menu actions now call `GET /tables/{id}/staff-menu-token` and open `/menu/{token}?staff_access=…` (same pattern as **Staff orders → Open menu**). Waiters skip the PIN flow without leaking the PIN in the public menu API.
- **QR code and Copy link** still use the public URL only (customers must enter PIN).
- **PIN modal:** When a PIN is still required (e.g. public URL, wrong PIN), the sheet shows **Table: {name}** above the title (`MENU.PIN_TABLE_CONTEXT` + i18n).

## Testing instructions (for tester)
1. **Staff tables → menu (main path):** Log in as staff, open **Tables**, activate a table with a PIN. Click **Open menu** (↗ in table view or **Open menu** in tile view). Confirm the new tab URL contains `staff_access=`. Add a product, **Place order** — **no** PIN modal (same expectation as `front/scripts/test-staff-menu-link-puppeteer.mjs` for orders).
2. **Customer URL unchanged:** From the same table, use **Copy** or scan the **QR** URL — it must **not** contain `staff_access`. Open that URL, place order — PIN modal should appear; it should show the **Table: …** line when the table name is loaded.
3. **Smoke:** With stack up, `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` passes.
4. **Front build:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` shows no Angular/TS errors after the change.
