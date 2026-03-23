---
## Closing summary (TOP)

- **What happened:** Order-line pizza-style modifiers (remove / add / substitute) were implemented and the tester signed off with an overall **PASS** on issue **#50**.
- **What was done:** `OrderItem` gained validated `line_modifiers` (JSONB) and summary text; API create/update/merge behaviour; staff Orders UI, kitchen, and invoice surfaces; migration and pytest coverage as recorded in the task body.
- **What was tested:** DB migrate, `tests/test_line_modifiers.py` (6 passed), landing smoke on **4202**, and manual staff orders / kitchen / print invoice / clear modifiers / merge-split behaviour — all **PASS** per the embedded test report.
- **Why closed:** All stated pass/fail criteria met; tester overall **PASS**.
- **Closed at (UTC):** 2026-03-23 16:51
---

# Change plate ordered with products like pizza

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/50

## Problem / goal
During ordering, staff (or customers where applicable) need to **customize** composite products—e.g. remove pepperoni and add another cheese—similar to pizza-style modifiers, without breaking pricing, kitchen tickets, or catalog sync.

## High-level instructions for coder
- Review current **order line** model: options, notes, variants, and any existing modifier or “special request” fields in `back/` and `front/`.
- Define whether modifiers are **free-text**, **predefined options**, or **catalog-driven** (e.g. linked to `Product` or `ProviderProduct`); align with multi-tenant and reporting needs.
- Extend API and UI so lines can record add/remove (or substitute) in a structured way that prints clearly on kitchen/output and appears correctly on invoices.
- Add or extend tests (pytest + relevant UI smoke if front changes); update **`CHANGELOG.md`** **`[Unreleased]`** for operator-facing behaviour.

## Coder notes (done)
- **Model:** `OrderItem.line_modifiers` (JSONB) + `line_modifiers_summary` (VARCHAR). Schema: `remove: string[]`, `add: string[]`, `substitute: { from, to }[]`. Validated in **`back/app/line_modifiers.py`**; English snapshot for tickets/invoices. **Pricing unchanged** (modifiers are informational; no catalog link in this iteration).
- **API:** `OrderItemCreate.line_modifiers`; merge with existing line only if **same** `customization_answers` **and** **same** `line_modifiers`. `OrderItemStaffUpdate.line_modifiers` clears when sent as `{}`. Responses include both fields (staff orders, public active order, order history).
- **UI:** Staff **Orders → Edit order** — optional fields under add-item; **Modifiers** per line to edit. Orders list + kitchen display + print invoice show **product questions** and **line modifiers** together.
- **Migration:** `20260323170000_order_item_line_modifiers.sql`

---

## Testing instructions

### What to verify
- Staff can add a line with remove/add/substitute text; it appears on the order card, kitchen/bar display, and printed invoice (with product questions if any).
- Two lines with the same product but different modifiers stay **separate**; identical modifiers merge quantity on repeat **POST** (take-away / PIN flow).
- Staff can open **Modifiers** on an existing line, clear all fields, save — modifiers disappear from the UI.

### How to test
1. **Migrate:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.migrate`
2. **Backend:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest tests/test_line_modifiers.py -q`
3. **Frontend smoke:** stack on **4202**, then from `front/`: `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version`
4. **Manual:** Log in → **Orders** → **Edit** on an unpaid order → add item with “Remove: pepperoni”, “Add: extra cheese”, substitute line `ham → chicken` → save/list shows summary → **Print invoice** includes the text → **Kitchen** (or **Bar**) view shows the same line detail.

### Pass/fail criteria
- **Pass:** Pytest green; landing smoke OK; manual flow shows modifiers everywhere above; empty save clears modifiers.
- **Fail:** 422 on valid modifier payload; modifiers missing from GET orders or kitchen; invoice omits them; merge splits lines incorrectly for same modifiers.

---

## Test report

1. **Date/time (UTC):** 2026-03-23 16:38 – 16:48 (approx.). **Log window:** same window for `docker compose … logs --since 30m` on `back` / `front`.

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **`BASE_URL`** `http://127.0.0.1:4202`; branch **`development`** @ **`6304641`**.

3. **What was tested:** Per **What to verify** / **How to test**: migrate, `tests/test_line_modifiers.py`, landing smoke, staff orders UI (card + edit modal + captured invoice HTML), kitchen KDS, clear modifiers via **Modifiers** + save; merge/split covered by pytest (public menu POST).

4. **Results:**
   - **DB migrate current / line_modifiers migration applied:** **PASS** — `python -m app.migrate` reports schema version **20260323171000** (includes **20260323170000_order_item_line_modifiers**).
   - **`pytest tests/test_line_modifiers.py`:** **PASS** — **6 passed** in ~0.83s.
   - **Landing smoke (`BASE_URL=http://127.0.0.1:4202 npm run test:landing-version`):** **PASS** — exit **0** (~42s); demo login + sidebar nav OK (WebSocket token warnings in browser console only).
   - **Staff order card shows modifier summary (remove/add/substitute):** **PASS** — order **#16** card text includes pepperoni / cheese / ham / chicken.
   - **Edit order modal lists modifiers:** **PASS** — modal DOM contains same modifier text.
   - **Print invoice includes modifier text:** **PASS** — **Print invoice** invoked from edit modal; invoice HTML captured via mocked `window.open` (headless popup unreliable) contains **pepperoni** in line detail.
   - **Kitchen display shows modifier text:** **PASS** — `/kitchen` page HTML contains **pepperoni** after ensuring a **Main Course** line with the same modifiers exists on the order (KDS category filter: `VIEW_CATEGORY.kitchen === 'Main Course'`; lines with empty category do not appear). **Note:** Public POST must use **`"source":"product"`** when **`product_id`** would otherwise match a **TenantProduct** id (e.g. id `2` is a wine row, not legacy Product 2).
   - **Clear modifiers (empty fields + Save):** **PASS** — `PUT /orders/16/items/455` **200**; `line_modifiers_summary` cleared for that line; order card shows fewer **pepperoni** mentions (Angular **ngModel** required **InputEvent** on inputs in automation).
   - **Merge / split behaviour (same product + same modifiers vs different modifiers):** **PASS** — covered by **`test_merge_same_modifiers_increments_quantity`** and **`test_different_modifiers_separate_lines`** (no 422 on valid payloads in suite).

5. **Overall:** **PASS**

6. **Product owner feedback:** Order lines can carry structured remove/add/substitute text that staff see on the order board, on the kitchen screen (for menu lines that match the kitchen category filter), and on printed invoices, without changing line prices. Repeat orders from the public menu still merge quantities when the product and modifiers match, and staff can strip modifiers from a line with an explicit save.

7. **URLs tested**
   1. `http://127.0.0.1:4202/login?tenant=1`
   2. `http://127.0.0.1:4202/dashboard`
   3. `http://127.0.0.1:4202/staff/orders`
   4. `http://127.0.0.1:4202/staff/orders` (edit modal open)
   5. `http://127.0.0.1:4202/kitchen`
   6. `http://127.0.0.1:4202/staff/orders` (after kitchen check)

8. **Relevant log excerpts**
   - **back:** `INFO: … "PUT /orders/16/items/455 HTTP/1.1" 200 OK` followed by `GET /orders` **200** (modifier clear persisted).
   - **front:** no errors in `--since 30m` tail (empty).

**GitHub:** Comment on issue **#50** failed from this environment (`Resource not accessible by personal access token`). Labels not updated; closer should comment / label per **`docs/agent-loop.md`** if needed.
