# FloCafe: ready-made items skip kitchen / hybrid service

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/454
- **454**

## Status
- **Implemented (010):** Product `skip_kitchen` flag; KDS route `none`; lines start as `ready`; kitchen print omits them. Hybrid dine-in/takeaway left to existing table / take-away / `order_channel` (no new service mode).
- **Restored:** Previous FEAT/WIP for #454 was missing from `agents2/tasks/` (orphaned `agent:wip` label). Recreated so feature coders can pick it up.

## Problem / goal
Upstream inspiration (FloCafe): let prepared / ready-made catalog items bypass kitchen routing, and support a simple hybrid dine-in / takeaway service mode so staff do not send every line through KDS.

Adaptation goal only - do not copy upstream code. Fit Satisfecho kitchen / order / channel patterns.

## High-level instructions for coder
- Read issue #454 and existing kitchen / KDS / order-item routing docs and code before designing.
- Propose a minimal slice: mark some products (or categories) as ready-made / no-kitchen so those lines skip kitchen tickets while cooked items still route normally.
- Optionally add a clear dine-in vs takeaway (hybrid) service mode on the order if it stays small and consistent with existing `order_channel` / table flows.
- Prefer tenant-scoped settings or product flags; no cross-tenant leakage; no hard-coded secrets.
- Work on **`development`**. Add or extend smoke coverage for the chosen slice (kitchen / orders Puppeteer or API tests as appropriate).
- If product decisions (flag placement, which channels) are unclear, post **one** waiting-for-human comment on #454 and park the FEAT per `agents2/TASKS-README.md`.
- Do not paste upstream diffs, secrets, or PII into the task file or commits.

## What was implemented
- Migration `back/migrations/20261125195042_product_skip_kitchen.sql`: `product.skip_kitchen BOOLEAN NOT NULL DEFAULT false`.
- Model + create/update product API; Products UI checkbox (i18n all locales).
- `resolve_order_item_kds` returns route `none` when `skip_kitchen`; order JSON includes `skip_kitchen`.
- New order lines for skip-kitchen products start as status `ready` (public menu + delivery/offline item helper).
- Kitchen/bar display hides `skip_kitchen` / route `none` lines; kitchen print jobs omit them; receipts unchanged.
- Docs: `docs/0015-kitchen-display.md`.
- Tests: `back/tests/test_kitchen_stations.py` (skip path); `front/.../kitchen-display.component.spec.ts` (hide ready-made lines).

## Testing instructions
1. Apply migrations if needed: `docker compose exec back python -m app.migrate` (version includes `20261125195042`).
2. Backend unit: `docker compose exec back python3 -m pytest tests/test_kitchen_stations.py -q` (expect pass, including `test_skip_kitchen_ready_made`).
3. Front unit (optional): run kitchen-display specs; expect `should hide ready-made skip_kitchen lines from kitchen display (#454)` to pass.
4. Manual / UI:
   - Log in as owner/admin → **Products** → edit a product → enable **Ready-made (skip kitchen / bar)** → save.
   - Place an order that includes that product plus a normal cooked item.
   - Open `/kitchen` (and `/bar` if beverage): ready-made line must **not** appear; cooked line must still appear.
   - On **Orders**, ready-made line should show status **ready** immediately.
5. Rebuild/redeploy front if the environment serves a production nginx image (not `ng serve`) so the Products checkbox and KDS filter are live.
6. App health: landing responds (e.g. `curl -sk -o /dev/null -w "%{http_code}" https://127.0.0.1/` → 200).
