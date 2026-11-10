---
## Closing summary (TOP)

- **What happened:** Issue #431 asked for an accurate VeriFactu status/gap audit (in-POS vs live AEAT remisión), not a full live certification invent.
- **What was done:** Documented ships-today vs remaining gaps in `docs/0065` (and related docs/ROADMAP); small Angular `cancelOrderFiscalInvoice` client plus fiscal 409 delete-toast detail.
- **What was tested:** Fiscal pytest 8/8 PASS; front build clean + HTTP 200; docs gap table and cancel-client note verified — overall PASS (optional browser Settings/print skipped).
- **Why closed:** All tester criteria passed; live remisión correctly left as ops/credentials follow-up, not a code blocker for this task.
- **Closed at (UTC):** 2026-10-14 09:44
---

# VeriFactu status — gap vs full integration (#431)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/431
- **431**

## Status
- **Implemented (audit + small fixes):** 2026-10-14T09:42:00Z
- In-POS VeriFactu path is largely complete for **test/prep**; **live AEAT remisión** still needs ops credentials + unlock (not a code invention gap).
- Docs: status/gap table in `docs/0065-verifactu-production.md`; frontend note in `docs/0018`; ROADMAP cross-link.
- Small code: Angular `cancelOrderFiscalInvoice` client + richer `FiscalInvoicePublic`; delete-order toast surfaces fiscal 409 `detail`.

## Problem / goal
Product ask: **check the current VeriFactu implementation status** and list **what is still missing** for a fully working VeriFactu integration (Spain fiscal / AEAT path).

Much of the in-POS surface already exists from closed work (#203 stub, #326 complete path, #342 certified middleware wiring). Docs already state that **direct AEAT wire is not invented in-repo**; production remisión is **via certified middleware** and **`fiscal_mode: live` is gated**. Goal of this task is an accurate **status + gap list** (and only then any clear, scoped follow-through the coder can land without new vendor/legal decisions).

## High-level instructions for coder
- Read **`docs/0018-verifactu-fiscal-invoicing.md`**, **`docs/0065-verifactu-production.md`**, and **`docs/0074-fiscal-certified-middleware.md`** (and related TSE notes only to avoid conflating regimes).
- Inventory what ships today vs docs tables: tenant `fiscal_mode` (off/test/live), issue/get/cancel APIs, hash chain, ValidarQR shape, Settings UI (ES gating), Fiskaly SIGN ES / generic / mock adapter, `FISCAL_LIVE_UNLOCK` + credentials gate, print Factura fiscal block, immutability/anulación.
- Identify **remaining gaps for “fully working”** in plain language, e.g.: commercial middleware credentials + sandbox/prod verification; live unlock ops; software-vendor `declaración responsable` / legal-ops (out of code); marketing/`/features` honesty; any broken or incomplete code paths found in audit (fix those first).
- Prefer **reporting findings** on issue **#431** (concise status + missing items + recommended next FEAT/issues) over large speculative rewrites. Implement only **small, clear code/doc fixes** discovered during the audit that do not require new vendor contracts or legal claims.
- Do **not** claim AEAT certification or enable live for tenants without credentials + unlock rules already documented.
- Smoke when touching code: fiscal issue in `test` mode on a paid order; Settings fiscal section for ES tenant; front build clean in `docker logs --since 10m pos-front`. Never put secrets from `config.env` into the task or GitHub comments.

## Audit findings (ships today)

| Area | Status |
|------|--------|
| `fiscal_mode` off/test/live + series/number | Yes — gated live via `FISCAL_LIVE_UNLOCK` + `live_credentials_ready` |
| POST/GET issue + POST cancel (anulación) APIs | Yes — `fiscal_invoice_service.py` / `main.py` |
| Internal hash chain `pos.fiscal.hash.v1` | Yes |
| AEAT ValidarQR URL shape | Yes (cotejo needs real remisión) |
| Settings UI ES gating (#392) | Yes |
| Fiskaly SIGN ES / generic / mock (#342) | Yes — adapters in `fiscal_providers.py` |
| Print Factura fiscal block | Yes when mode test/live |
| Immutability after alta | Yes (409 until anulación) |
| `/features` honesty | Yes — preparation / middleware language |
| Pytest `tests/test_fiscal_invoice_api.py` | **8 passed** (this run) |

## Remaining gaps (fully working live)

1. **Ops:** Commercial Fiskaly (or alternate) credentials + TEST→LIVE verification; keep unlock false until then.
2. **Ops:** Per-merchant SIGN ES client / taxpayer onboarding (`fiscal_aeat_api_secret` or `FISCAL_FISKALY_CLIENT_ID`).
3. **Legal:** Satisfecho SIF `declaración responsable` — out of code.
4. **Product FEAT:** Staff UI button for anulación (API + Angular client exist; no dedicated button yet).
5. **Product FEAT:** Fiskaly payload fidelity — simplified single-line 21% VAT today; multi-rate IVA / line items needed.
6. **Data:** Issuer NIF from `tax_id`/`cif`; missing → placeholder `PENDING00`.

Canonical table: **`docs/0065-verifactu-production.md`** (*Remaining gaps for “fully working”*).

## Code / doc changes this task
- `front/src/app/services/api.service.ts` — `cancelOrderFiscalInvoice` + public fields
- `front/src/app/orders/orders.component.ts` — delete toast shows fiscal 409 detail
- `docs/0065-verifactu-production.md`, `docs/0018-verifactu-fiscal-invoicing.md`, `ROADMAP.md`

## Testing instructions

1. **Pytest:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest tests/test_fiscal_invoice_api.py -q` — expect all green (issue, hash, sandbox, immutability, anulación, live gate).
2. **Front build:** `docker logs --since 10m pos-front` — no TS/NG errors after the Angular edits; app HTTP 200 on HAProxy port.
3. **Docs spot-check:** Open `docs/0065-verifactu-production.md` — *Remaining gaps* section present; `docs/0018` frontend paragraph mentions cancel client.
4. **Optional manual:** ES tenant Settings → Payments shows VeriFactu prep; with `fiscal_mode=test`, print Factura on a paid order → fiscal block; delete paid fiscally-issued order → toast with immutability message (409 detail).
5. **Do not** set `FISCAL_LIVE_UNLOCK` or commit secrets for this verification.

## Test report

- **Date/time (UTC):** 2026-10-14 09:43:13 UTC start → 09:43:31 UTC end. Log window: `docker logs --since 10m` (front/back).
- **Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml`; HAProxy `http://127.0.0.1:14202`; branch `development`. Did **not** set `FISCAL_LIVE_UNLOCK` or touch secrets.
- **What was tested:** Pytest fiscal suite; front compile health + HTTP 200; docs gap table + cancel-client note; code presence of `cancelOrderFiscalInvoice` and 409 delete toast. Optional browser Settings/print flow skipped (API/docs evidence sufficient for this audit/fix task).

### Results

| Criterion | Result | Evidence |
|-----------|--------|----------|
| Pytest `tests/test_fiscal_invoice_api.py` | **PASS** | `8 passed, 1 warning in 4.52s` (Starlette TestClient deprecation only) |
| Front build clean (no TS/NG errors) | **PASS** | No `error TS` / `Application bundle generation failed`; only unrelated NG8107 warnings (~16) in menu templates |
| App HTTP 200 | **PASS** | `curl` `/` → 200; `/api/health` → 200 on `127.0.0.1:14202` |
| Docs `0065` Remaining gaps section | **PASS** | Heading `## Remaining gaps for “fully working” (#431)` with ops/legal/product gap table |
| Docs `0018` cancel client note | **PASS** | Mentions `cancelOrderFiscalInvoice` and 409 delete `detail` surfacing |
| Angular cancel client + 409 toast | **PASS** | `api.service.ts` `cancelOrderFiscalInvoice`; `orders.component.ts` delete error uses `err.error.detail` |
| No live unlock / secrets | **PASS** | Verification used existing stack only; no unlock or secret commits |

- **Overall:** **PASS**
- **Product owner feedback:** Status/gap audit for #431 is accurate and documented: in-POS test/prep path is covered by green fiscal pytest and client/docs updates; live AEAT remisión still correctly owned by ops credentials + unlock, not code invention. Small Angular cancel client and 409 toast detail are present; dedicated anulación UI remains a follow-up FEAT as documented.
- **URLs tested:**
  1. `http://127.0.0.1:14202/` (HTTP 200)
  2. `http://127.0.0.1:14202/api/health` (HTTP 200)
  3. N/A — optional ES Settings / print Factura browser flow not run

### Relevant log excerpts

```
# pytest (pos-back exec)
........                                                                 [100%]
8 passed, 1 warning in 4.52s

# pos-front (since 10m): no hard compile errors; sample warnings only
▲ [WARNING] NG8107: ... optional chain ... (menu.component.html)
# counts: error TS / Application bundle generation failed = 0; NG8107 = 16
```
