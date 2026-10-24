# VeriFactu production path (ADR + certification status)

## Purpose

Extends **`docs/0018-verifactu-fiscal-invoicing.md`**. Documents the **build-vs-buy** decision for AEAT wire protocol, what Satisfecho implements in-product today, and what is **not** certified for `fiscal_mode: live`.

Related: GitHub **#326** (complete VeriFactu), **#203** (initial stub).

## Phase 0 - ADR: build vs buy

### Context

Spanish anti-fraud rules (RD 1007/2023, Orden HAC/1177/2024, developer FAQs) require invoicing systems (SIF) to provide integrity, unalterability, hash chaining, a verification QR, and (in VERI\*FACTU mode) remisión of registros to AEAT. Software vendors already face adaptation obligations; end-user mandatory dates were deferred into **2027**, but Satisfecho must not market a false “live AEAT” capability.

Inventing SOAP/XML payloads or hash “huella” fields without the official AEAT technical packs is high risk (wrong cotejo, silent non-compliance, vendor fines).

### Options

| Option | Pros | Cons |
|--------|------|------|
| **A. In-house AEAT wire** | Full control; no per-invoice middleware fee | Months of spec work; own `declaración responsable`; perpetual normative maintenance |
| **B. Certified middleware** (e.g. Fiskaly SIGN ES / Verifacti / Efsta) | Faster path; adapter owns QR/huella/remisión; narrower vendor risk | Cost per issuer; dependency; still need POS immutability + numbering |

### Decision

**Prefer B - certified middleware** for AEAT submission and official huella/QR when going production.

**Phase 1 vendor pick (#342):** primary **Fiskaly SIGN ES**; runner-up Verifacti; generic HTTP adapter retained. Details: **`docs/0074-fiscal-certified-middleware.md`**.

POS owns:

- Tenant `fiscal_mode` / series / sequential numbering
- Append-only fiscal records with **internal** hash chain (`pos.fiscal.hash.v1`)
- Immutability of orders after an **alta** is issued (edit/delete blocked; cancel via **anulación** / credit-note path)
- AEAT **ValidarQR** URL **shape** (nif, numserie, fecha, importe) for printed QR content
- Middleware adapter (`app/fiscal_providers.py`: `fiskaly_sign_es` | `generic` | `mock`)

Middleware (chosen provider) owns:

- Official AEAT registro XML/hash per current AEAT packs
- Certificates / XAdES where required
- Real remisión to AEAT pre/prod endpoints
- Supply of final verification CSV/huella if the product surface needs them

### Consequences

- Do **not** set or market **`fiscal_mode: live`** until middleware credentials are verified against official sandbox/prod docs. Live is **gated** by `FISCAL_LIVE_UNLOCK=true` **and** provider credentials ready (`live_credentials_ready`). Live issue/cancel **requires** middleware acceptance (502 otherwise). `mock` is non-production only.
- `fiscal_mode: test` runs local/sandbox submission (near-real-time local record + optional middleware POST). That is **not** a claim of AEAT acceptance.
- Public `/features` and Settings copy must describe preparation + test mode, not “AEAT certified live”.

## What is implemented (certification status)

| Capability | Status |
|------------|--------|
| Server-issued series/number per paid/completed order | **Yes** (since #203) |
| Internal hash chain (`previous_hash` → `record_hash`) | **Yes** (#326) |
| AEAT ValidarQR URL parameters for print QR | **Yes** (shape; cotejo only works after real remisión) |
| Near-real-time **sandbox** submission in `test` mode | **Yes** (local sandbox status + optional middleware HTTP) |
| Order immutability after fiscal alta; anulación (credit-note) path | **Yes** API (#326); front client + staff anulación control on Orders Factura/edit (#431) |
| Settings UI (ES country / fiscal_mode gating) | **Yes** (#392) |
| Fiskaly SIGN ES / generic / mock adapters | **Yes** (#342) |
| Print Factura fiscal block (QR + disclaimer) | **Yes** when `fiscal_mode` is test/live |
| Official AEAT huella algorithm / SOAP remisión | **Via middleware** (Fiskaly SIGN ES adapter wired; needs commercial credentials) |
| `fiscal_mode: live` production remisión | **Gated** - unlock + provider credentials; mock OK only non-prod |
| Software-vendor `declaración responsable` for Satisfecho as SIF | **Not claimed** in this doc; legal/ops follow-up |

## Remaining gaps for “fully working” (#431)

Honest product status as of the #431 audit (not a certification claim):

| Gap | Owner | Notes |
|-----|--------|--------|
| **Commercial Fiskaly (or alternate) credentials** + TEST→LIVE verification | Ops / vendor contract | Without these, live remisión cannot be proven end-to-end |
| **`FISCAL_LIVE_UNLOCK=true` on prod** only after sandbox sign-off | Platform ops | Keep `false` until credentials verified (`docs/0074`) |
| **Per-merchant taxpayer / SIGN ES client onboarding** | Merchant + ops | Client UUID in `fiscal_aeat_api_secret` or `FISCAL_FISKALY_CLIENT_ID` |
| **Fiskaly invoice payload fidelity** | Done in product (#431) | SIGN ES adapter maps order **line_items** with per-line IVA (`tax_rate_percent`); falls back to single 21% only when lines are missing |
| **Issuer NIF quality** | Merchant data | Missing `tax_id`/`cif` falls back to placeholder `PENDING00` - QR/cotejo will be wrong until set |
| **Staff UI for anulación** | Done in product (#431) | Orders Factura + edit-order show cancel (anulación) when an active alta exists; wired to `POST …/fiscal-invoice/cancel` |
| **`declaración responsable` / legal SIF registration** | Legal / ops | Out of code; not claimed by Satisfecho alone |
| **Marketing honesty** | Done for now | `/features` + Settings describe preparation/test; do not claim “AEAT certified live” until LIVE verified |

Recommended next issues: (1) ops sandbox with real Fiskaly TEST keys, (2) per-merchant taxpayer / SIGN ES client onboarding, (3) legal `declaración responsable` follow-up.

## Configuration

| Variable | Meaning |
|----------|---------|
| `FISCAL_MIDDLEWARE_PROVIDER` | `fiskaly_sign_es` (chosen) \| `generic` \| `mock` |
| `FISCAL_MIDDLEWARE_BASE_URL` | Optional HTTPS base override. Empty → Fiskaly TEST/LIVE defaults when provider is SIGN ES. |
| `FISCAL_MIDDLEWARE_API_KEY` / `FISCAL_MIDDLEWARE_API_SECRET` | Fiskaly (or generic) credentials (never commit). |
| `FISCAL_FISKALY_CLIENT_ID` | Default SIGN ES client UUID if tenant credential unset. |
| `FISCAL_LIVE_UNLOCK` | Must be `true` **and** provider credentials ready before tenants may select `fiscal_mode: live`. |

Per-tenant `fiscal_aeat_api_secret` may hold the Fiskaly **client UUID** (or other issuer credential the adapter needs). See **`docs/0074-fiscal-certified-middleware.md`** for renewal cadence.

## QR URL (documented shape)

Test host: `https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR`  
Prod host: `https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR`

Query parameters (Orden HAC / AEAT QR technical note): `nif`, `numserie`, `fecha` (`DD-MM-YYYY`), `importe` (dot decimals). POS builds this URL from issuer NIF, full number, issue date, and order total. **Successful cotejo on AEAT’s site requires prior remisión** - printing the URL alone is not compliance.

## Testing

See Testing instructions on task **#326** / pytest `back/tests/test_fiscal_invoice_api.py` (hash chain, sandbox, immutability, anulación).
