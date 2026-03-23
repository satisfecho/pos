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
