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

## Testing instructions

1. **Migrate:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.migrate` — schema version **20260331190000**.
2. **Preset mode (default):** Settings → set tip entry to preset; open Orders → mark paid on an unpaid order → percentage buttons still work; mark paid succeeds.
3. **Overpayment mode:** Settings → tip entry **Card/terminal amount (tip = difference)**; open mark paid → enter amount charged (e.g. subtotal 10.00, charge 11.50) → tip field should default to 1.50; adjust tip and confirm; order shows correct `tip_amount_cents`; unmark paid clears tip.
4. **Reporting:** Reports page shows **Tips (total)** card and waiter table **Tips** column; export CSV/Excel summary includes tips columns.
5. **Schedule export:** Working plan → export month Excel for a user; footer shows monthly tips total when applicable.
6. **Smoke:** `npm run test:landing-version`; confirm Angular build clean in `docker compose logs --tail=80 front`.

---

## Test report

1. **Date/time (UTC):** 2026-03-31T11:02:00Z (run window ~10:56–11:03Z). Log window for excerpts: same window.

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch **`development`**, commit **`2ae9305`**.

3. **What was tested:** **Testing instructions** §1 and §6 in full; automated backend **`tests/test_order_tip.py`** (related tip/mark-paid helpers); **§2–§5** require interactive Settings / Orders / Reports / Working plan flows — **not executed** in this run (see below).

4. **Results:**
   - **§1 Migrate (schema 20260331190000):** **PASS** — `app.migrate` reports DB up to date at **20260331190000**.
   - **§2 Preset mode UI:** **NOT VERIFIED** — no headless run with documented steps (Settings → Orders → mark paid). *Evidence:* not executed.
   - **§3 Overpayment mode UI:** **NOT VERIFIED** — same.
   - **§4 Reporting (Tips card, waiter Tips, CSV/Excel):** **NOT VERIFIED** — `npm run test:reports` requires `LOGIN_EMAIL` + `LOGIN_PASSWORD` (owner/admin); not set in this agent environment; script exited before opening `/reports`.
   - **§5 Schedule export (Excel footer tips):** **NOT VERIFIED** — depends on same login/working-plan flow as manual check.
   - **§6 Smoke (`test:landing-version` + front logs):** **PASS** — landing script exit **0** (“Landing version OK; demo login (tenant=1) OK; sidebar nav OK.”); `docker compose logs --tail=80 front` shows **Application bundle generation complete** with no TS/Angular error lines in the tail.
   - **Extra — `pytest tests/test_order_tip.py`:** **PASS** — `9 passed` (validates preset tip resolution helpers; not a substitute for §2–§5).

5. **Overall:** **FAIL** — required manual/browser criteria **§2–§5** were not completed with evidence. Automated checks (migrate, tip unit tests, landing smoke, front log sanity) passed.

6. **Product owner feedback:** Database migration and core tip preset tests look healthy, and the app still builds and passes the broad landing navigation smoke. The new overpayment UI, reports Tips columns, and schedule Excel footer still need a logged-in verification pass (set `LOGIN_EMAIL` / `LOGIN_PASSWORD` for `test:reports` or run the checklist manually once).

7. **URLs tested:**
   1. `http://127.0.0.1:4202/` (landing)
   2. Post-login routes exercised by `test:landing-version` (includes `/settings`, `/reports`, `/staff/orders`, `/working-plan` as nav smoke only — **not** the task-specific tip flows).

8. **Relevant log excerpts (last section)**

`pos-front` (successful bundles, no errors in tail):

```
Application bundle generation complete. [0.583 seconds] - 2026-03-31T10:34:23.775Z
```

`app.migrate` (schema target):

```
INFO: Database schema version: 20260331190000
✅ Database schema version: 20260331190000
```
