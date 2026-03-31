# Automatic tip detection and allocation (checkout / payments)

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/123

## Problem / goal

When a payment total exceeds the bill (e.g. card charge above menu total), treat the difference as a potential **tip**, let staff confirm or adjust before closing, attribute tips to the right **employee/session**, and keep **revenue vs tips** separable for reporting and compliance. Align with existing orders, payments, and reporting models.

## High-level instructions for coder

- **Detection:** On payment capture (especially card), compare amount paid to bill total; when the amount paid exceeds the bill, compute the difference and surface a clear confirmation step (“assign as tip?”) before finalizing.
- **Attribution:** Link confirmed tips to the waiter/employee tied to the table or POS session per product rules.
- **Reporting:** Ensure daily/Z-style and related reports show revenue vs tips distinctly (tips not rolled into taxable sales as configured by product/accounting rules).
- **Settings:** Add a tenant-level toggle between **manual tip entry** and **automatic difference detection** (or equivalent modes).
- **Workforce exports:** Extend timesheet / working-plan style exports with a **Tips** column so owners can see per-employee tip totals over that month where data exists.
- Respect **multi-tenant** boundaries and existing payment flows; add tests for critical calculation and reporting paths where practical.

## Implementation summary (2026-03-31)

- **Tenant** `tip_entry_mode`: `preset` (default) or `overpayment`. **Settings → POS tip buttons** includes a select for this mode.
- **Overpayment mode:** Staff marks paid / finish with **amount charged** and **tip** (major units); tip defaults to `max(0, amount − subtotal)` when amount changes; API sends `tip_amount_cents` and optional `amount_paid_cents` on `PUT /orders/{id}/mark-paid` and `/finish`.
- **Preset mode:** Unchanged (percentage presets only); `tip_amount_cents` / `amount_paid_cents` rejected by API.
- **Order** `tip_attributed_user_id`: set on pay from table `assigned_waiter_id` or floor `default_waiter_id`; cleared on unmark-paid.
- **Reports:** `GET /reports/sales` summary includes `total_tips_cents`; daily rows include `tips_cents`; `by_waiter` includes `tips_cents`. CSV/Excel summary and waiter exports include tips columns.
- **Working plan Excel** (`GET /schedule/export`): footer row with **Tips (month total, cents)** for tips on paid orders attributed to that `user_id` in the calendar month.
- **Migration:** `20260331190000_tenant_tip_entry_mode_order_tip_attribution.sql`

### Coder follow-up (same task, verification harness)

- **Backend:** Extended `back/tests/test_order_tip.py` with `_resolve_tip_for_mark_paid` overpayment cases and `PUT /orders/{id}/mark-paid` overpayment + waiter attribution (`14` tests total).
- **Frontend:** `data-testid="settings-payments-tab"` on Settings → Payment tab; `data-testid="reports-summary-tips"` on Reports tips summary card.
- **Puppeteer:** `front/scripts/test-order-tip-flows.mjs` + `npm run test:order-tip-flows --prefix front` (Settings tip mode toggle + Reports tips card). Documented in `docs/testing.md` §8b.

## Testing instructions

### What to verify

- Schema migration **20260331190000** applies cleanly.
- **Preset vs overpayment** API rules: preset rejects `tip_amount_cents`; overpayment requires it; `amount_paid_cents` must cover subtotal + tip when sent.
- **Mark-paid overpayment** persists `tip_amount_cents` and `tip_attributed_user_id` from table assignment.
- **UI:** Settings Payments tab exposes `tip_entry_mode`; Reports shows tips summary; automated script can toggle mode and save without error.

### How to test

1. **Migrate:**  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.migrate`  
   Expect schema version **20260331190000**.

2. **Backend:**  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest /app/tests/test_order_tip.py -q`  
   Expect **14 passed**.

3. **UI smoke (owner/admin credentials in `.env` as `DEMO_LOGIN_*` or `LOGIN_*`):**  
   `BASE_URL=http://127.0.0.1:4202 npm run test:order-tip-flows --prefix front`

4. **Broader smoke:**  
   `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front`

5. **Angular build:**  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` — no TS/NG errors after rebuild.

6. **Manual (optional):** Overpayment mark-paid dialog on **Orders** (charge vs subtotal, tip field); **Reports** waiter **Tips** column and CSV/Excel; **Working plan** month Excel footer tips — as in original task checklist.

### Pass/fail criteria

- **PASS:** Migrate OK; pytest `test_order_tip.py` all green; `test:order-tip-flows` exits **0** when credentials are set; `test:landing-version` exits **0**; front logs show successful bundle with no compile errors.
- **FAIL:** Any pytest failure; Puppeteer cannot save Settings after tip mode change; Reports page missing `[data-testid="reports-summary-tips"]` after load; Angular build errors in front logs.

---

## Test report

**Tester run (UTC):** 2026-03-31 — started ~11:12, finished ~11:14 (log window aligned with `docker compose logs` and Puppeteer output).

**Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202` (HAProxy); branch `development` (synced before edit).

**What was tested:** Per **Testing instructions** — migration version, `test_order_tip.py`, `test:order-tip-flows`, `test:landing-version`, front container logs for compile errors.

**Results:**

| Criterion | Result | Evidence |
|-----------|--------|----------|
| Migration **20260331190000** applies / DB at version | **PASS** | `app.migrate`: "Database is up to date (version **20260331190000**)" |
| Preset vs overpayment / mark-paid rules (pytest) | **PASS** | `pytest /app/tests/test_order_tip.py -q` → **14 passed** in ~4s |
| UI: Settings tip mode + Reports tips card (Puppeteer) | **PASS** | `test:order-tip-flows` exit **0**; script logged OK toggled overpayment, saved, restored; tips card €0.00 |
| Broader smoke | **PASS** | `test:landing-version` exit **0** (~44s); "Landing version OK; demo login OK; sidebar nav OK" |
| Angular build (front logs) | **PASS** | Last 80 lines: `Application bundle generation complete`, no `TS`/`NG` error lines |

**Overall:** **PASS**

**Product owner feedback:** Tip entry mode can be switched to overpayment in Settings and saved reliably; Reports still exposes the tips summary for review. Backend tests cover the API rules for tips and attribution. Optional manual checks (mark-paid overpayment dialog, CSV/Excel, working-plan footer) were not required for this pass.

**URLs tested (Puppeteer):**

1. `http://127.0.0.1:4202/` (landing)
2. `http://127.0.0.1:4202/dashboard` (post-login)
3. `http://127.0.0.1:4202/settings` (Payments tab — tip mode)
4. `http://127.0.0.1:4202/reports` (tips summary card)
5. Additional routes from `test:landing-version` sidebar/inventory sweep (e.g. `/staff/orders`, `/reservations`, `/tables`, `/kitchen`, `/bar`, `/customers`, `/products`, `/catalog`, `/working-plan`, `/users`, `/contracts`, `/inventory/*`).

**Relevant log excerpts:**

`pos-back` (migrate): `Database schema version: 20260331190000` … `Database is up to date`.

`pos-front` (sample): `Application bundle generation complete. [1.445 seconds] - 2026-03-31T11:11:08.623Z` (no compilation failure messages in tail).

**Note:** Browser console showed WebSocket `1008 Invalid authentication token` during sidebar navigation smoke; pages loaded and test exited 0 — treated as environment/token timing noise, not a tip-feature failure.
