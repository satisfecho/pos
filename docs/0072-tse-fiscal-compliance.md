# TSE fiscal compliance (Germany / KassenSichV)

## Purpose

Documents **German Technical Security Device (TSE)** support for Satisfecho tenants: Phase 0 build-vs-buy ADR, tenant `tse_mode`, signed transaction records, receipt fields, and DSFinV-K export stub.

Related: GitHub **#316**. Spain VeriFactu remains separate (`docs/0018-verifactu-fiscal-invoicing.md`, `docs/0065-verifactu-production.md`). **Do not conflate** the two regimes; a tenant may use VeriFactu (`fiscal_mode`) and/or TSE (`tse_mode`) independently.

## Disclaimer

- Enabling **`tse_mode: live`** does **not** by itself satisfy KassenSichV / §146a AO. Real cloud TSE credentials, BSI TR-03153 certified integration, DSFinV-K completeness, and **Kassenmeldepflicht** filing must follow **official specs** and **German tax-advisor review**.
- This product’s **test** path uses a **local signed stub** (`pos.tse.stub.v1`) and an optional HTTP hook to a cloud TSE provider. That is **not** a claim of BSI certification or Finanzamt acceptance.
- Do **not** market Satisfecho as “TSE certified live” until provider credentials + certified path are verified.

## Phase 0 - ADR: cloud TSE vs local hardware

### Context

Multi-tenant SaaS POS (cloud backend, restaurants on LAN) cannot reliably attach a USB/hardware TSE dongle to the application server. Print agents (#317) run on-site but are not a certified TSE.

### Options

| Option | Pros | Cons |
|--------|------|------|
| **A. Local hardware TSE** (Swissbit/Epson USB, etc.) | Classic certified path; offline-capable at register | Poor fit for cloud multi-tenant; device inventory per till; agent complexity |
| **B. Cloud certified TSE** (e.g. Fiskaly SIGN DE, Epson / Swissbit cloud) | Fits SaaS; per-tenant API credentials; provider owns certification | Per-transaction cost; dependency; needs network |

### Decision

**Prefer B - cloud certified TSE** for production. POS owns tenant config, transaction persistence, receipt fields, and DSFinV-K export shape. The cloud provider owns the certified signing module and storage.

**Phase 1 vendor pick (#342):** primary **Fiskaly SIGN DE**; runner-up Epson/Swissbit cloud; generic HTTP adapter retained. Details: **`docs/0074-fiscal-certified-middleware.md`**.

### Consequences

- `tse_mode: live` is **gated** by `TSE_LIVE_UNLOCK=true` **and** provider credentials ready (`live_credentials_ready`). Live signing **requires** provider acceptance (502 otherwise). `mock` is non-production only.
- `tse_mode: test` records local stub signatures (+ optional provider POST when configured). Not production compliance.
- Public `/features` and Settings copy must describe **preparation / test**, not certified live.

## Tenant configuration

| Setting | Meaning |
|--------|---------|
| **`fiscal_country`** | Optional ISO hint (`DE`, `ES`, …). Informational for UI; does **not** auto-enable TSE or VeriFactu. |
| **`tse_mode`**: `off` | Default. No TSE signing. |
| **`tse_mode`**: `test` | On paid settlement (and storno on unmark-paid), create a **TSE transaction** row with stub signature + mandatory receipt fields. |
| **`tse_mode`**: `live` | Same pipeline only when unlock + provider URL are set; real provider credentials required. |
| **`tse_client_id` / `tse_api_secret`** | Optional per-tenant provider credentials (secret masked in GET settings). |

Configure via **Settings → Payments** (TSE section) or **PUT `/tenant/settings`**.

**Settings UI visibility (#392):** The VeriFactu prep block is shown when **Country (ISO)** is **`ES`** (or `fiscal_country` is `ES` if country is empty), or when `fiscal_mode` is already `test`/`live`. The TSE / KassenSichV prep block is shown for **`DE`** the same way, or when `tse_mode` is already on. Currency alone does not gate these blocks (EUR is multi-country). Hidden sections do not clear stored settings.

## Transaction lifecycle

| Event | TSE process type |
|-------|------------------|
| Order fully paid (mark-paid / last payment leg / offline-cash sync) | **`sale`** (KassenSichV Beleg) |
| Unmark paid (void settlement) | **`storno`** linked to prior sale |
| Explicit API | **POST** `/orders/{id}/tse-transaction/sign` (idempotent sale if paid) |

Each row stores: process type, TSE serial, signature counter, time, signature/QR content, request/response JSON, mode, submission status.

## API

| Method | Path | Role |
|--------|------|------|
| **GET** | `/orders/{order_id}/tse-transaction` | Latest sale (or any) TSE record for order |
| **POST** | `/orders/{order_id}/tse-transaction/sign` | Issue or return existing **sale** (idempotent) |
| **GET** | `/tenant/tse/dsfinvk-export?from=YYYY-MM-DD&to=YYYY-MM-DD` | DSFinV-K-oriented JSON stub for date range |

## Receipt / print

When a TSE sale exists, receipt payloads (print-bridge + browser Factura/receipt HTML) include serial, signature counter, timestamp, and QR/signature text per KassenSichV expectations. Coordinate with **`docs/0070-hardware-printing.md`** / **`docs/PRINTING.md`**.

## DSFinV-K

**MVP:** date-range export returns a structured JSON stub (`schema: pos.dsfinvk.stub.v1`) listing TSE transactions. Full ZIP/CSV package per official DSFinV-K is **future** work with tax-advisor validation.

## Environment

| Variable | Meaning |
|----------|---------|
| `TSE_PROVIDER` | `fiskaly_sign_de` (chosen) \| `generic` \| `mock` |
| `TSE_PROVIDER_BASE_URL` | Optional cloud TSE base override; empty → Fiskaly defaults when provider is SIGN DE |
| `TSE_PROVIDER_API_KEY` / `TSE_PROVIDER_API_SECRET` | Platform-level Fiskaly (or generic) credentials (never commit) |
| `TSE_FISKALY_TSS_ID` | Fiskaly TSS UUID for SIGN DE |
| `TSE_LIVE_UNLOCK` | Must be true with provider credentials ready before `tse_mode: live` |

Per-tenant `tse_client_id` = Fiskaly client UUID. See **`docs/0074-fiscal-certified-middleware.md`** for renewal cadence.

## Testing

See task **#316** / **#342** Testing instructions and pytest `back/tests/test_tse_api.py`.

## Certification status

| Capability | Status |
|------------|--------|
| Tenant `tse_mode` / `fiscal_country` | **Yes** |
| Local stub signed sale + storno records | **Yes** (test) |
| Receipt TSE fields + print payload | **Yes** |
| DSFinV-K date-range stub export | **Yes** (stub) |
| Cloud provider certified signing | **Fiskaly SIGN DE adapter wired**; needs commercial TSS credentials |
| `tse_mode: live` | **Gated** - unlock + provider credentials; mock OK only non-prod |
| Kassenmeldepflicht UI | **Deferred** (Phase 2) |
