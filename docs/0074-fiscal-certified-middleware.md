# Fiscal certified middleware - provider ADR (#342)

## Purpose

Phase 1 decision record for **which certified middleware** Satisfecho integrates for:

- Spain **VeriFactu** (`fiscal_mode: live`)
- Germany **TSE / KassenSichV** (`tse_mode: live`)

Builds on Phase 0 ADRs in **`docs/0065-verifactu-production.md`** (prefer buy middleware) and **`docs/0072-tse-fiscal-compliance.md`** (prefer cloud TSE). This doc **picks vendors**, documents the adapter contract, live-enable guards, and credential renewal.

Related: GitHub **#342**.

## Decision summary

| Regime | Chosen primary | Runner-up | Rationale |
|--------|----------------|-----------|-----------|
| **VeriFactu (ES)** | **Fiskaly SIGN ES** | Verifacti | Same vendor family as SIGN DE; AEAT social collaborator path; REST + TEST/LIVE split; TicketBAI coverage later if needed |
| **TSE (DE)** | **Fiskaly SIGN DE** | Epson / Swissbit cloud TSE | BSI-certified cloud TSS; documented ACTIVE→FINISHED tx; fits multi-tenant SaaS |

**Generic HTTP adapter** (`FISCAL_MIDDLEWARE_PROVIDER=generic` / `TSE_PROVIDER=generic`) remains supported for alternate certified gateways (e.g. Efsta, Verifacti, other TSS clouds) that implement our thin `/fiscal/submit` and `/tse/sign` contracts.

**`mock` provider** is for pytest and non-production live vertical slices only. It is **blocked in production** even if unlock flags are set.

## VeriFactu options compared

| Option | API shape | Certification / coverage | Cost / effort | Notes |
|--------|-----------|--------------------------|---------------|-------|
| **Fiskaly SIGN ES** | REST auth + `PUT /clients/{id}/invoices/{id}` (`content` envelope); TEST `test.es.sign.fiskaly.com` / LIVE `live.es.sign.fiskaly.com` | AEAT social collaborator; Verifactu + TicketBAI territories | Per-org / per-invoice commercial; ~1-2 weeks adapter + taxpayer onboarding | **Chosen** |
| **Verifacti** | JSON submit → QR + AEAT remisión via their representation cert | Verifactu-focused; TicketBAI optional | Often simpler cert story for SMEs; separate vendor from TSE | Strong alternative if SIGN ES commercial terms fail |
| **Efsta / other SIF middleware** | Vendor-specific | Varies | Extra integration | Keep via `generic` adapter |
| **In-house AEAT SOAP** | Official packs | Own `declaración responsable` | Months + perpetual maintenance | Rejected (Phase 0) |

### VeriFactu wiring (POS)

- POS keeps series/numbering, internal hash chain, immutability, anulación, ValidarQR URL shape.
- Live submit goes through `app/fiscal_providers.py` → Fiskaly SIGN ES (or generic/mock).
- Live **requires** middleware acceptance (`middleware_accepted` / `provider_accepted` / `mock_accepted`); failures return **502**.
- Env: `FISCAL_MIDDLEWARE_PROVIDER`, `FISCAL_MIDDLEWARE_API_KEY`, `FISCAL_MIDDLEWARE_API_SECRET`, optional `FISCAL_MIDDLEWARE_BASE_URL`, `FISCAL_FISKALY_CLIENT_ID`, `FISCAL_LIVE_UNLOCK`.
- Per-tenant Fiskaly **client UUID** may be stored in the existing fiscal credential field (`fiscal_aeat_api_secret`) or platform `FISCAL_FISKALY_CLIENT_ID`.

## TSE options compared

| Option | API shape | Certification | Cost / effort | Notes |
|--------|-----------|---------------|---------------|-------|
| **Fiskaly SIGN DE** | Auth + `PUT /tss/{tss}/tx/{tx}` ACTIVE then FINISHED with `standard_v1` receipt | BSI TR-03153 cloud TSS | Per-tx fees; TSS/client provisioning | **Chosen** |
| **Epson / Swissbit cloud** | Vendor cloud APIs | Certified modules | Hardware/cloud mix; different ops model | Alternative via `generic` |
| **Local USB TSE** | Device on till | Classic certified path | Poor fit for cloud multi-tenant | Rejected for SaaS primary (Phase 0) |

### TSE wiring (POS)

- Auto-sign on paid / storno on unmark-paid unchanged; live uses `app/tse_providers.py`.
- Live **requires** provider-accepted signature fields; no stub-only live success.
- Env: `TSE_PROVIDER`, `TSE_PROVIDER_API_KEY`, `TSE_PROVIDER_API_SECRET`, `TSE_FISKALY_TSS_ID`, optional `TSE_PROVIDER_BASE_URL`, `TSE_LIVE_UNLOCK`.
- Per-tenant Fiskaly **client UUID** in `tse_client_id`.

## Live-enable guards

| Gate | VeriFactu | TSE |
|------|-----------|-----|
| Unlock flag | `FISCAL_LIVE_UNLOCK=true` | `TSE_LIVE_UNLOCK=true` |
| Credentials | Provider-specific (see `live_credentials_ready`) | Same |
| Mock in prod | **Forbidden** | **Forbidden** |
| Settings UI | `fiscal_mode: live` → 400 if gated | `tse_mode: live` → 400 if gated |
| Issue/sign | 502 if middleware rejects | 502 if provider rejects |

## Credential / cert renewal cadence

| Item | Cadence | Owner |
|------|---------|--------|
| Fiskaly org API key/secret | Rotate on staff change or ≤ **90 days** | Platform ops |
| Fiskaly SIGN ES taxpayer / social collaboration | On merchant onboard; renew when Fiskaly/AEAT notify | Merchant + ops |
| Fiskaly SIGN DE TSS admin PIN/PUK | Store in deploy secrets; rotate per Fiskaly policy | Platform ops |
| Middleware TLS / base URL | Review when Fiskaly publishes env changes | Platform ops |
| Satisfecho `*_LIVE_UNLOCK` | Keep **false** on prod until sandbox sign-off | Platform ops |

**Never commit** API keys, secrets, PUK/PIN, or AEAT certs. Use `config.env` / deploy secrets only.

## Ops blockers (honest status)

- Real AEAT remisión and BSI-certified signatures require **Fiskaly (or alternate) commercial accounts**, TEST→LIVE enablement, and per-merchant taxpayer/TSS onboarding. Those credentials are **not** in this repo.
- Until production credentials are verified, keep unlock flags **false** and marketing copy as **preparation / test** (no “certified live” claims).
- Vertical slice for CI: `FISCAL_MIDDLEWARE_PROVIDER=mock` + `FISCAL_LIVE_UNLOCK=true` (and TSE equivalents) in **non-production** pytest.

## Marketing / product copy

`/features` and Settings already describe preparation and locked live. Review after this ship: still **do not** claim AEAT/BSI certification by Satisfecho alone. When production Fiskaly LIVE is verified, update copy and ROADMAP row together.

## Testing

- Pytest: `back/tests/test_fiscal_invoice_api.py`, `back/tests/test_tse_api.py` (live + mock vertical slice).
- Manual: configure mock or Fiskaly TEST keys; unlock; set tenant live; issue invoice / pay order; confirm submission_status accepted and receipt fields present.
