# VeriFactu-oriented fiscal invoicing (tenant modes, server issuance)

## Purpose

This document complements **`docs/0017-billing-customers-factura.md`**. It describes **Spain-oriented preparation** for tax invoicing aligned with **VeriFactu** expectations: **server-authoritative** issuance of a fiscal record per order, persisted **series and sequential number**, storage of **stub request/response JSON** for future AEAT integration, and a **print path** that shows **QR content** and **mandatory disclaimer text** returned after issuance.

## Disclaimer

- **No production AEAT submission** is implemented as a direct AEAT HTTP/SOAP client in this codebase. Real endpoints, certificates, and payload field mapping **must** follow the **official AEAT technical documentation**, **certified middleware**, and **professional tax advice**. See **`docs/0065-verifactu-production.md`** (Phase 0 ADR: prefer buy/middleware).
- Enabling **live** mode is **gated** (`FISCAL_LIVE_UNLOCK` + middleware URL) and does **not** by itself satisfy legal filing obligations.
- Internal hash chain uses schema **`pos.fiscal.hash.v1`** - this is **not** a claim of the official AEAT huella algorithm until middleware supplies it.
- **Offline POS:** Staff offline sync (`docs/0063-offline-capable-client.md`, #319/#333) **must not** allocate fiscal series or call **issue** while disconnected. Issue only when online on a **paid** order; deferred offline numbering is not approved.

## Tenant configuration

| Setting | Meaning |
|--------|---------|
| **`fiscal_mode`**: `off` | Default. Printing a Factura behaves as before (browser-only HTML). |
| **`fiscal_mode`**: `test` | Staff printing triggers **POST `/orders/{id}/fiscal-invoice/issue`**: allocates number, chains hash, builds AEAT ValidarQR URL shape, and runs **near-real-time sandbox** submission (local record and/or middleware hook). |
| **`fiscal_mode`**: `live` | Same pipeline only when unlock + middleware are configured; **direct AEAT wire is still not invented here**. |
| **`fiscal_invoice_series`** | Prefix for display and allocation (e.g. `VF`). |
| **`fiscal_invoice_next_number`** | Next sequence value; incremented **atomically** when a **new** fiscal row is created (not on re-print). |
| **`fiscal_aeat_api_secret`** | Optional placeholder for future AEAT/middleware client credentials; masked in API responses like payment secrets. |

Configure via **Settings → Payments** (fiscal section) or **PUT `/tenant/settings`**.

**Settings UI visibility (#392):** The VeriFactu prep block is shown when **Country (ISO)** is **`ES`** (or `fiscal_country` is `ES` if country is empty), or when `fiscal_mode` is already `test`/`live`. See also TSE gating in **`docs/0072-tse-fiscal-compliance.md`**. Currency alone does not gate this block.

## API

| Method | Path | Role |
|--------|------|------|
| **POST** | `/orders/{order_id}/fiscal-invoice/issue` | Issue or return existing fiscal **alta** (**idempotent** per order). Requires **`order:read`**. |
| **GET** | `/orders/{order_id}/fiscal-invoice` | Read persisted fiscal **alta** if present. |
| **POST** | `/orders/{order_id}/fiscal-invoice/cancel` | Issue **anulación** (credit-note cancel) for the alta; then order may be deleted/edited again. |

### Issuance rules

- **Tenant isolation**: Order must belong to the caller’s tenant.
- **Soft-deleted orders**: Not found (`404`).
- **Cancelled orders**: Cannot issue (`400`).
- **Order status**: Must be **`paid`** or **`completed`**.
- **Idempotency**: At most **one** fiscal **alta** per `(tenant_id, order_id)`; repeated calls return the same record.
- **Immutability**: While an active (non-cancelled) alta exists, staff **cannot** soft-delete the order, change line items/amounts, or set status to cancelled (`409`). Use **cancel** (anulación) first.
- **Hash chain**: Each new row stores `previous_hash` / `record_hash` (tenant-scoped chronological chain).
- **QR**: `verification_qr_content` is an AEAT ValidarQR URL (`nif`, `numserie`, `fecha`, `importe`). Cotejo on AEAT’s site requires prior remisión.

## Frontend

When **`fiscal_mode`** is `test` or `live`, **Print Factura** (orders modal) and **print from edit order** call **issue** first, then render the invoice HTML including the **fiscal block** (QR + text).

Angular API client: `issueOrderFiscalInvoice`, `getOrderFiscalInvoice`, `cancelOrderFiscalInvoice` (`api.service.ts`). When **`fiscal_mode`** is `test`/`live` and an active alta exists, **Orders** (Print Factura modal and Edit order) show **Cancel fiscal invoice (anulación)** wired to the cancel API. After anulación, delete/edit are allowed again. Delete-order errors still surface the server `detail` string when present.

See **`docs/0065-verifactu-production.md`** (*Remaining gaps*) for what is still missing for production live remisión.

## Environment

| Variable | Meaning |
|----------|---------|
| `FISCAL_MIDDLEWARE_BASE_URL` | Optional certified adapter base; empty = local sandbox only |
| `FISCAL_MIDDLEWARE_API_KEY` | Middleware auth (do not commit secrets) |
| `FISCAL_LIVE_UNLOCK` | Must be true with middleware URL before `fiscal_mode: live` |

Per-tenant secrets use **`fiscal_aeat_api_secret`** (optional).

## Testing

1. Set tenant **`fiscal_mode`** to **`test`** and save Settings.
2. Mark an order **paid**, then **Print Factura** - expect success and invoice showing fiscal number + QR block (ValidarQR URL).
3. Attempt to delete or edit line items on that order - expect **409** until fiscal cancel.
4. **Cancel fiscal invoice (anulación)** in Orders (Factura / edit order) or **POST** `/orders/{id}/fiscal-invoice/cancel` - expect anulación number; delete should then succeed.
5. Multi-rate: order with lines at different IVA rates - issued `request_payload.line_items` and Fiskaly SIGN ES items should reflect those rates (not a single hardcoded 21%).
6. Set **`fiscal_mode`** to **`off`** - print should match prior behaviour without calling issue (browser-only).
7. Unpaid order with fiscal mode on - issue should fail with a clear error.
8. Setting **`fiscal_mode: live`** without unlock/middleware - expect **400**.

See also **`docs/0065-verifactu-production.md`**.
