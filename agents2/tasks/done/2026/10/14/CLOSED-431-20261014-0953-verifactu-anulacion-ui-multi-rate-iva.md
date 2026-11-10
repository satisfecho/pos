---
## Closing summary (TOP)

- **What happened:** VeriFactu staff anulación UI and multi-rate IVA Fiskaly mapping for #431 were implemented and verified.
- **What was done:** Orders Factura/Edit show cancel (anulación) when an active alta exists; Fiskaly SIGN ES request_payload carries per-line IVA via line_items; docs 0018/0065 gap rows updated.
- **What was tested:** Issue → 409 immutability → anulación UI (VF-C2) → delete OK; pytest fiscal_invoice_api 10 passed (multi-rate included); front build clean — **PASS**.
- **Why closed:** All criteria passed; product owner feedback says safe to close for the two next-FEAT items.
- **Closed at (UTC):** 2026-10-14 10:09
---

# VeriFactu: staff anulación UI + multi-rate IVA (#431)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/431
- **431**

## Status
- **Implemented:** 2026-10-14T10:00:00Z (agent 010)
- Staff anulación control on Orders (Print Factura + Edit order) when `fiscal_mode` is test/live and an active alta exists.
- Fiskaly SIGN ES / request_payload now carry multi-rate `line_items` from order tax snapshots.

## Problem / goal
Status/gap audit for VeriFactu is **done** (archived `CLOSED-431-20261014-0937-verifactu-status.md`; docs gap table in `docs/0065-verifactu-production.md`). Human follow-up on the issue asks to **implement** the two product next-FEAT items:

1. **Staff UI for anulación** — API `POST …/fiscal-invoice/cancel` and Angular `cancelOrderFiscalInvoice` exist; no dedicated staff control yet. Delete/edit stay blocked with **409** until cancel runs.
2. **Multi-rate IVA / full line-item Fiskaly mapping** — SIGN ES adapter still uses a simplified single-line **21%** invoice; need real line items and multi-rate IVA.

Do **not** re-run the status audit. Do **not** enable live remisión / `FISCAL_LIVE_UNLOCK` or invent vendor credentials. Ops/legal gaps stay out of scope.

## High-level instructions for coder
- Read **`docs/0018-verifactu-fiscal-invoicing.md`**, **`docs/0065-verifactu-production.md`** (*Remaining gaps*), and **`docs/0074-fiscal-certified-middleware.md`**. Reuse existing cancel API + client; extend Fiskaly adapter mapping carefully.
- **Priority 1 — Staff anulación UI:** On orders (Factura / fiscal-aware surfaces), add a clear control to cancel (anulación) when an active alta exists. Wire to `cancelOrderFiscalInvoice`. Surface success (anulación number) and errors; after cancel, delete/edit should work again. i18n for new strings (en/es/de). Keep ES/`fiscal_mode` gating consistent with Settings.
- **Priority 2 — Multi-rate / line items:** Map order lines (and correct IVA rates) into the Fiskaly SIGN ES payload instead of one hardcoded 21% line. Align with product tax fields already on lines; keep mock/test adapters coherent. Extend or add pytest coverage in `tests/test_fiscal_invoice_api.py` (and provider unit tests if they exist).
- Update **`docs/0065`** / **`docs/0018`** so the gap rows for anulación UI and payload fidelity match what shipped.
- Out of scope: commercial Fiskaly credentials, live unlock, SIF declaración responsable, TSE.
- Smoke: fiscal issue in `test` mode → anulación via new UI → delete/edit allowed; multi-rate fixture if available; front build clean in `docker logs --since 10m pos-front`. Never put secrets into the task or GitHub comments.

## What changed
- **Front:** Orders Factura modal + Edit order show **Cancel fiscal invoice (anulación)** when an active alta is loaded; confirm → `cancelOrderFiscalInvoice`; success toast with anulación number; i18n en/es/de (+ other locales).
- **Back:** `build_fiscal_line_items` → `request_payload.line_items`; Fiskaly SIGN ES uses per-line IVA rates (fallback single 21% if lines missing); anulación reuses alta line items.
- **Tests:** `test_issue_stores_multi_rate_line_items`, `test_fiskaly_items_from_line_items_multi_rate` in `back/tests/test_fiscal_invoice_api.py` (10 passed).
- **Docs:** `docs/0018`, `docs/0065` gap rows updated for UI + payload fidelity.

## Testing instructions

1. **Prereq:** Tenant Settings → fiscal mode **test** (country ES / fiscal block visible). App up (e.g. HAProxy host port).
2. **Issue:** Create/pay an order → Orders → Print Factura (or Edit → Print invoice). Expect fiscal number + QR block.
3. **Immutability:** Try delete or edit line quantity on that order → expect **409** / blocked toast.
4. **Anulación UI:** Re-open Factura or Edit order → see **Cancel fiscal invoice (anulación)** with the alta number → confirm → toast with cancellation number (e.g. `…-C…`).
5. **After cancel:** Delete or edit the order should succeed.
6. **Multi-rate (API/pytest):** `docker compose exec back python3 -m pytest tests/test_fiscal_invoice_api.py -q` — expect pass including multi-rate line_items (10% + 21%).
7. **Front build:** `docker logs --since 10m pos-front` — no TS/NG compile errors after Orders changes.
8. **Out of scope / do not:** Do not set `FISCAL_LIVE_UNLOCK` or add real Fiskaly credentials for this test.

## Test report

1. **Date/time (UTC):** 2026-10-14 10:01:41Z start → 2026-10-14 10:08:25Z end. Log window: ~10:04–10:08Z for fiscal API; front compile check through 10:08Z.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:14202` (HAProxy); branch `development`. Fiscal mode set to `test` on tenant 1 for verification (no `FISCAL_LIVE_UNLOCK`, no vendor credentials).
3. **What was tested:** Staff anulación UI on Orders Print Factura; immutability (409) before cancel; anulación confirm → toast; delete after cancel; multi-rate pytest; front build.
4. **Results:**
   - Prereq fiscal mode **test:** **PASS** — tenant settings `fiscal_mode=test` (series VF, tax_id present).
   - Issue fiscal alta: **PASS** — `POST /orders/206/fiscal-invoice/issue` → `VF-1` / status issued; payload `line_items` stored with `vat_rate_percent: 21` for Pozole.
   - Immutability before cancel: **PASS** — `DELETE /orders/206` → **409**; `PUT …/items/262` quantity → **409** with anulación-required detail.
   - Anulación UI: **PASS** — Print Factura modal shows hint with `VF-1` and button “Cancel fiscal invoice (anulación)”; confirm dialog; `POST …/fiscal-invoice/cancel` **200**; toast “Fiscal cancellation issued: VF-C2”; DB alta → `cancelled`, new `anulacion` `VF-C2`.
   - After cancel delete/edit: **PASS** — `DELETE /orders/206` → **200** `{"status":"deleted"}`.
   - Multi-rate pytest: **PASS** — `tests/test_fiscal_invoice_api.py` **10 passed**; targeted multi-rate tests **2 passed**.
   - Front build: **PASS** — after Orders methods landed, rebuilds complete with no TS/NG errors (transient mid-edit TS2339/TS2341 around 09:58Z only; later bundles clean).
   - Contrast: **PASS** — new control uses existing `btn btn-secondary` tokens (no new colour/brand wash in this change).
5. **Overall:** **PASS**
6. **Product owner feedback:** Staff can cancel an active VeriFactu alta from the Factura modal with a clear confirm and cancellation number, then edit/delete again. Multi-rate line_items are covered by pytest and appear in the stored request payload. Safe to close from a product perspective for the two next-FEAT items.
7. **URLs tested:**
   1. http://127.0.0.1:14202/login?tenant=1
   2. http://127.0.0.1:14202/dashboard (post-login)
   3. http://127.0.0.1:14202/staff/orders
8. **Relevant log excerpts:**
   - `POST /orders/206/fiscal-invoice/issue HTTP/1.1" 200`
   - `DELETE /orders/206 HTTP/1.1" 409`
   - `PUT /orders/206/items/262 HTTP/1.1" 409`
   - `POST /orders/206/fiscal-invoice/cancel HTTP/1.1" 200`
   - `DELETE /orders/206 HTTP/1.1" 200`
   - pytest: `10 passed` / multi-rate `2 passed`
