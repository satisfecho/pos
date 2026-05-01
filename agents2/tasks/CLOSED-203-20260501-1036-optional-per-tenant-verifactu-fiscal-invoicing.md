# Optional per-tenant VeriFactu-ready fiscal invoicing (server-side issuance, AEAT hooks, print path)

## GitHub Issues

- **Issue:** https://github.com/satisfecho/pos/issues/203
- **203**

## Problem / goal

Multi-tenant POS (FastAPI + Angular): Spain-oriented fiscal invoicing should move toward VeriFactu readiness with **server-authoritative issuance** (persisted fiscal documents scoped by tenant and order), preparation for **AEAT** submission using **official technical documentation** (do not invent endpoints or payload shapes), and a **print path** that can render QR and mandated verification text from data returned after issuance. Today the printable invoice is generated only in the browser (`printInvoice()` in orders flow); there is no persisted fiscal entity or official series/numbering. Billing customers and related APIs are described in `docs/0017-billing-customers-factura.md`. Staff trigger printing from the Print Factura flow and the edit-order flow—both must stay consistent when fiscal mode is enabled.

## High-level instructions for coder

- Read `docs/0017-billing-customers-factura.md`; add a focused VeriFactu note under `docs/` (modes, env vars, test vs production, explicit disclaimer that field mapping follows AEAT spec and tax advisor input).
- **Backend:** SQL migrations; model(s) for issued fiscal documents linked to `order.id` and `tenant_id` with official series/number, payload/response storage, status, timestamps; new authenticated endpoints mirroring tenant isolation and auth patterns used by existing order routes in `main.py`; define idempotency (re-print vs duplicate issue) and rules for order state (e.g. paid-only), cancelled, and soft-deleted orders; pytest for permissions, tenant isolation, and success/error paths.
- **Tenant configuration:** Extend Tenant, TenantUpdate, and PATCH handler for fiscal mode (off / test / live); store secrets like other integrations (per-tenant fields and/or `config.env.example` placeholders)—never commit real credentials; optional UX gating when `country_code` is not ES is not a legal substitute.
- **Frontend:** `settings.component.ts` and API service for new settings; when fiscal mode is on, both Print Factura and print-from-edit-order call backend to issue or fetch fiscal metadata, then extend `printInvoice()` HTML or extract a small service for QR and legal strings; add `ngx-translate` keys in all `front/public/i18n/*.json` files for new copy.
- **Permissions:** Decide whether issuance matches existing roles that can print today or requires a new capability in `permissions.py`; keep behaviour aligned with who can print now.
- **Non-goals:** Do not ship guessed production AEAT calls without verified spec and tests; thermal printers only render supplied content.
- **Verification:** With stack up, smoke Puppeteer or manual checks: tenant off → current print unchanged; tenant on (stub or test env) → issuance API returns data and print includes QR block without breaking unpaid/cancelled rules.

## Implementation summary (coder)

- **Docs:** `docs/0018-verifactu-fiscal-invoicing.md`; cross-link from `docs/0017-billing-customers-factura.md`.
- **DB:** `back/migrations/20260501120000_fiscal_invoice_verifactu.sql` — tenant fiscal columns + `fiscal_invoice` table.
- **Backend:** `back/app/models.py` (`FiscalInvoice`, tenant fiscal fields), `back/app/fiscal_invoice_service.py`, routes in `main.py`, masking for `fiscal_aeat_api_secret` on tenant settings responses.
- **Frontend:** `TenantSettings` / API methods; Settings → Payments fiscal block; `orders.component.ts` issues fiscal invoice when mode is test/live; `printInvoice` async + `qrcode` for QR data URL; i18n in all `front/public/i18n/*.json`.
- **Tests:** `back/tests/test_fiscal_invoice_api.py`.

## Testing instructions

1. **Migrate:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.migrate` (already applied if schema version **20260501120000**).
2. **Backend:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m pytest tests/test_fiscal_invoice_api.py -q` — expect **3 passed**.
3. **Settings:** Log in as owner/admin → **Settings → Payments** → set **Fiscal mode** to **Test**, **Series** e.g. `VF`, **Save**. Reload page — mode and series persist; AEAT secret field stays masked when set.
4. **Print off:** Set **Fiscal mode** to **Off**, save. Open **Orders**, **Print Factura** on a paid order — invoice should match prior behaviour (browser HTML, order id in header).
5. **Print on:** Set **Fiscal mode** to **Test**, save. Use a **paid** (or completed) order → **Print Factura** — print preview should show **fiscal document number**, **QR**, and **disclaimer** block; header uses fiscal **full_number**.
6. **Unpaid:** Open an unpaid order with fiscal mode **Test** → **Print Factura** — expect **error toast** (order must be paid first); no blank print.
7. **Idempotency:** Print the same paid order twice — same **full_number** (check server log or UI).
8. **Smoke:** `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/` → **200** (or run `npm run test:landing-version` from `front/` when container **`COMMIT_HASH`/version** matches `package.json`).
9. **Frontend logs:** `docker logs pos-front 2>&1 | grep -iE "error|bundle generation failed"` — should show **no** new errors after edits (ignore unrelated historical rows).

---

## Test report

**Date/time (UTC):** 2026-05-01 10:48–10:51 (primary verification window).  
**Log window:** `docker logs pos-front --since 25m`; backend commands executed immediately before report.

**Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (local); **`BASE_URL`** `http://127.0.0.1:4202`; git branch **`development`**.

**What was tested** (from Testing instructions §1–9):

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | Migrate; schema **20260501120000** | **PASS** | `python -m app.migrate`: max applied **20260501120000**, DB up to date |
| 2 | `pytest tests/test_fiscal_invoice_api.py -q` → 3 passed | **PASS** | `3 passed in 2.06s` |
| 3 | Settings → Payments: Test + VF, save, reload persist; AEAT masked | **PASS** | Puppeteer script: `#fiscal_mode` stays `test`, `#fiscal_invoice_series` `VF` after reload; secret field not populated from API in form (masked behaviour) |
| 4 | Fiscal **Off** → Print Factura paid: classic invoice, no fiscal block | **PASS** | Captured print HTML: no `fiscal-verifactu` class block |
| 5 | Fiscal **Test** → paid order print: fiscal number, QR (`data:image/png;base64`), disclaimer block | **PASS** | HTML contains `fiscal-verifactu` and embedded QR image |
| 6 | Unpaid + fiscal Test → error toast; no fiscal print | **PASS** | `.toast.error` present; captured HTML has no `fiscal-verifactu` |
| 7 | Idempotency: two prints same paid order | **PASS** | Repeated print: meta block match (stable invoice header / fiscal presentation between runs) |
| 8 | Smoke `curl /` → 200 | **PASS** | `200`; `npm run test:landing-version` initially failed semver (footer **2.0.75** vs **package.json 2.0.84**); with **`SKIP_LANDING_PACKAGE_VERSION_CHECK=1`** full nav smoke **PASS** (sidebar includes `/settings`) |
| 9 | Front logs: no blocking build errors in current window | **PASS** (with note) | Last ~25–30m: repeated **`Application bundle generation complete`**; **historical** rows at **2026-05-01T10:40:29Z** show transient fiscal compile errors during earlier edit — superseded by successful rebuilds **10:42–10:44Z** |

**Overall:** **PASS**

**Product owner feedback:** Per-tenant fiscal mode is persisted in Settings → Payments and correctly gates invoice printing: legacy HTML when off, and VeriFactu-style blocks with scannable QR when test mode is on. Backend tests cover issuance, unpaid rejection, and tenant isolation; staff UX shows a clear error when printing an unpaid order under fiscal test.

**URLs tested (numbered):**

1. `http://127.0.0.1:4202/`
2. `http://127.0.0.1:4202/login?tenant=1`
3. `http://127.0.0.1:4202/dashboard` (post-login)
4. `http://127.0.0.1:4202/settings` (Payments tab; fiscal controls)
5. `http://127.0.0.1:4202/staff/orders` (Print Factura modal + captured print document)

**Relevant log excerpts**

```
INFO: Database schema version (max applied): 20260501120000
...
✅ Database schema version: 20260501120000
```

```
...                                                                      [100%]
3 passed in 2.06s
```

```
Application bundle generation complete. [0.724 seconds] - 2026-05-01T10:44:11.528Z
```
