# Order customizations (pizza-style modifiers) — GitHub [#50](https://github.com/satisfecho/pos/issues/50)

**Goal:** Let guests change a dish when ordering (e.g. remove pepperoni, add another cheese), not only fixed “one answer per question” flows.

## What already exists (do not reinvent)

| Layer | Status |
|-------|--------|
| **DB** | `product_question` (`ProductQuestion`): `choice`, `scale`, `text`; JSON `options`; `required`, `sort_order`. |
| **Order lines** | `OrderItem.customization_answers` (JSONB): `{"question_id": value}` — choice/text as string, scale as int. |
| **API** | Staff: `GET`/`POST /products/{id}/questions` (`list_product_questions`, `create_product_question`). **No `PUT`/`PATCH`/`DELETE`/reorder yet** — add when building the staff UI. Public menu payload includes `questions` per product; `POST` order accepts `customization_answers` on each line (`OrderItemCreate`). |
| **Customer menu** | `menu.component.ts`: modal collects answers before add-to-cart; cart merge keys include `customization_answers`. |

**Gap:** There is **no staff UI** on `/products` (or equivalent) to define questions per product. Tenants must use the API (or seeds) today. Issue #50 also implies **richer modifier semantics** than a single `choice` per question.

## Suggested phases

### Phase 1 — Staff configuration (highest leverage)

1. **Products screen**: Section “Customizations” per product: list questions, add/edit/delete/reorder.
2. **Backend**: Implement `PATCH`/`DELETE` (and optional `PUT` batch reorder) for `/products/{id}/questions/{question_id}` — today only `GET` + `POST` exist.
3. Validate `options` shape client-side for `choice` (list of labels) and `scale` (`min`/`max`).
4. **i18n** for labels in UI (field `label` stays tenant-entered text for customer-facing copy).
5. **Tests**: Puppeteer or API test — create question, open menu (test table), submit order with answers, assert line payload / kitchen display text.

### Phase 2 — Pizza-style “swap / add” (extends model)

GitHub #50 needs **multiple independent toggles or groups** (remove X, add Y), optional **price deltas**, and clear kitchen copy.

Pick one direction (document the choice in ADR or this file when implemented):

- **A — Multiple questions**  
  One question per topping group (“Extra cheese”, “No onion”) as `choice` with options Yes/No or option lists. Simple but many questions for complex pizzas.

- **B — Multi-select `choice`**  
  Extend `ProductQuestionType` or `options` schema so `choice` allows **multiple** selected values; store e.g. `{"42": ["pepperoni", "mushroom"]}` or normalized IDs. Requires API + menu UI + migration rules for existing single-string answers.

- **C — Modifier catalog**  
  Reusable modifiers (with optional `price_cents` delta) attached to products via join table; order line stores chosen modifier IDs + snapshot prices. Heavier schema, best for “+€1 per extra”.

### Phase 3 — Staff orders & kitchen

1. Ensure **orders** and **kitchen** UIs print/read `customization_answers` with **human-readable** labels (resolve `question_id` → current `label` + option text; snapshot on order if questions later change).
2. **Print invoice / ticket**: Include customization lines where applicable.

### Phase 4 — Hardening

- Rate limits / payload size: cap number of questions and length of `text` answers.
- **Audit**: optional log when staff edits questions that affect live menu items.

## Out of scope (unless product asks)

- Full POS “recipe / BOM” inventory depletion per topping.
- Third-party delivery menu sync (Uber Eats, etc.) — see roadmap doc for [#52](https://github.com/satisfecho/pos/issues/52).

## References

- `back/app/models.py` — `ProductQuestion`, `ProductQuestionType`, `OrderItem.customization_answers`
- `back/app/main.py` — product question routes; menu order merge logic (~`customization_answers`)
- `front/src/app/menu/menu.component.ts` — customer flow
- `docs/0008-order-management-logic.md` — order lifecycle
- `docs/0015-kitchen-display.md` — kitchen surface
