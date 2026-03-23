# Order customizations (pizza-style modifiers) — GitHub [#50](https://github.com/satisfecho/pos/issues/50)

**Goal:** Let guests change a dish when ordering (e.g. remove pepperoni, add another cheese), not only fixed “one answer per question” flows.

## What already exists (do not reinvent)

| Layer | Status |
|-------|--------|
| **DB** | `product_question` (`ProductQuestion`): `choice`, `scale`, `text`; JSON `options`; `required`, `sort_order`. |
| **Order lines** | `OrderItem.customization_answers` (JSONB): `{"question_id": value}` — choice/text as string, scale as int. |
| **API** | Staff: `GET`/`POST /products/{id}/questions`; **`PATCH`/`DELETE` `/products/{id}/questions/{qid}`**; **`PUT` `/products/{id}/questions/reorder`**. `POST` create validates `options` (choice list, scale min/max). Public menu includes `questions`; orders accept `customization_answers`. |
| **Customer menu** | `menu.component.ts`: modal collects answers before add-to-cart; cart merge keys include `customization_answers`. |
| **Staff UI** | **`/products`**: when editing an existing product, section **Customer menu customizations** — list, add, edit, delete, reorder (↑↓). New products: hint to save first. |

**Remaining for #50:** Optional **price deltas** per modifier (Phase 2C-style) if product needs “+€1 per extra”; otherwise multi-select + snapshot covers the pizza use case.

## Suggested phases

### Phase 1 — Staff configuration (highest leverage) — **done**

1. **Products screen**: Section “Customizations” per product: list questions, add/edit/delete/reorder.
2. **Backend**: `PATCH`/`DELETE` + `PUT …/reorder`; stricter validation on create/update for `options`.
3. Validate `options` client-side for `choice` (lines) and `scale` (`min`/`max`).
4. **i18n** (`en`, `es`, `de`, `fr`, `ca`, `zh-CN`, `hi`) for staff strings.
5. **Tests** (optional follow-up): Puppeteer — create question, menu flow with answers.

### Phase 2 — Pizza-style “swap / add” (extends model)

**Implemented (2026-03): option B — multi-select `choice`.**

- **Staff / API:** Choice options may be a **plain list** (single `<select>`) or **`{"choices": [...], "multi": true}`** (checkboxes on the customer menu). Validated in `_validate_product_question_options` and in `product_customization.py`.
- **Storage:** `OrderItem.customization_answers` uses **string keys**; multi answers are **`string[]`** (sorted when normalizing for merge and validation).
- **Customer menu:** `multi` flag on each question in the public menu payload; modal renders checkboxes vs single select.
- **Not implemented:** Per-option **price deltas** — use **C — Modifier catalog** (or manual price products) if needed later.
- **A — Multiple questions** remains a valid pattern for yes/no groups without multi-select.

### Phase 3 — Staff orders & kitchen

1. **Done:** `OrderItem.customization_summary` (**VARCHAR 1024**) is set at **order create** from current question **labels** and answer text (`"Cooking: Medium · Toppings: Olives, Mushrooms"`). Staff **Orders**, **Kitchen**, **customer current order**, **order history**, and **printed invoice** prefer this snapshot; they fall back to formatting raw `customization_answers` (including `string[]` for legacy rows without a summary).
2. **Print invoice / ticket:** First column includes the summary under the product name when present.

### Phase 4 — Hardening

- Rate limits / payload size: cap number of questions and length of `text` answers.
- **Audit**: optional log when staff edits questions that affect live menu items.

## Out of scope (unless product asks)

- Full POS “recipe / BOM” inventory depletion per topping.
- Third-party delivery menu sync (Uber Eats, etc.) — see roadmap doc for [#52](https://github.com/satisfecho/pos/issues/52).

## References

- `back/app/models.py` — `ProductQuestion`, `ProductQuestionType`, `OrderItem.customization_answers`, `OrderItem.customization_summary`
- `back/app/product_customization.py` — validate / normalize answers, merge equality, option helpers
- `back/app/main.py` — product question routes; menu order merge logic (~`customization_answers`)
- `front/src/app/menu/menu.component.ts` — customer flow
- `docs/0008-order-management-logic.md` — order lifecycle
- `docs/0015-kitchen-display.md` — kitchen surface
