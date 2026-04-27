# Delivery marketplace integrations under Settings (admin)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/198
- **198**

## Problem / goal
Expose third-party delivery marketplace connectivity under **Settings → Integrations** (admin), not as a separate top-level staff navigation entry. Support multiple providers (e.g. Uber Eats, Glovo, Deliveroo): per-provider connection status, credential handling **server-side only**, test connection, optional store linkage, catalog/menu mapping between external items and POS products/modifiers, and operational visibility (webhook/API event log with import errors). Architecture should be **provider-agnostic UI** with **pluggable backend adapters** so new brands reuse the same patterns. Ingested orders must flow through the **existing POS order and kitchen pipeline** for MVP—no parallel silo.

## High-level instructions for coder
- Add or extend Settings (admin) with an **Integrations** area dedicated to delivery marketplaces; align layout and navigation with existing settings patterns.
- Implement secure storage and use of credentials on the **backend**; avoid exposing secrets to the browser beyond what is required for OAuth or similar documented flows.
- Provide per-provider surfaces for: connection state, credentials/setup, **test connection**, optional store linkage, mapping UI for external catalog ↔ POS catalog, and logs for inbound events and mapping/import failures.
- Design backend **adapter interfaces** per provider brand; shared routes/services where possible so new adapters plug in without duplicating the whole UI.
- Ensure routed-in orders normalize into the same **Order** model and kitchen/service flow already used elsewhere; verify multi-tenant scoping matches adjacent tenant APIs.
- Add testing appropriate to scope: targeted API tests and/or Puppeteer smoke if a stable entry path exists; document manual verification steps for integrations that need external sandbox credentials.

## Testing instructions

1. **Migrate:** From repo root with Docker dev stack up:  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.migrate`
2. **Unit tests:**  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m pytest tests/test_delivery_credentials.py tests/test_delivery_adapters.py -q`
3. **UI (admin):** Open **Settings** → **Integrations**. Expand a provider (e.g. Uber Eats). Enter credentials JSON `{"api_key":"test"}` (stub requires non-empty `api_key`), save, run **Test connection** (expect success). Optionally set external store id. Add at least one **catalog mapping** (external item id → POS product), save mappings. Enable the integration and **copy webhook URL**.
4. **Webhook ingest:** `POST` JSON to the copied URL (same shape as stub):  
   `{"external_order_ref":"demo-1","customer_name":"Demo","lines":[{"external_item_id":"<your mapped sku>","quantity":1}]}`  
   Expect **200** and a new row in **Recent events**. Confirm **Orders** shows a new order with table label **Delivery** and kitchen pipeline items.
5. **Smoke:** `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/` → **200** (when stack is up).

## Test report

1. **Date/time (UTC) and log window**  
   - **Verification:** 2026-04-27T11:12Z–11:14Z (approx.).  
   - **Logs:** `docker logs pos-back` (tail ~40) for webhook failure window.

2. **Environment**  
   - **Compose:** `docker-compose.yml` + `docker-compose.dev.yml`.  
   - **`BASE_URL`:** `http://127.0.0.1:4202` (HAProxy).  
   - **Branch:** `development` (synced via `./scripts/git-sync-development.sh` before edits).

3. **What was tested (from “What to verify”)**  
   - (1) `python -m app.migrate`  
   - (2) `pytest tests/test_delivery_credentials.py tests/test_delivery_adapters.py`  
   - (3) Admin Integrations flow — exercised via **authenticated tenant API** (owner user `ralf@roeber.de`, JWT from container) equivalent to UI: upsert Uber Eats credentials `{"api_key":"test"}`, test connection, external store id, catalog mapping `demo-sku-7` → product `7`, enable integration, webhook URL from API response. **Interactive browser session not run** (`config.env` has no `DEMO_LOGIN_*`; UI route documented as `http://127.0.0.1:4202/settings?section=delivery-integrations`).  
   - (4) `POST` webhook ingest with mapped SKU (stub payload).  
   - (5) Landing smoke `curl` HTTP code.

4. **Results**

   | Criterion | Result | Evidence |
   |---|---|---|
   | 1. Migrate | **PASS** | Schema at **20260427120000**; “Database is up to date”. |
   | 2. Unit tests | **PASS** | `4 passed in 0.06s`. |
   | 3. UI / admin Integrations | **PARTIAL** | API: `PUT /tenant/delivery-integrations` (Uber Eats), `POST .../1/test` → `{"ok":true,...}`, `PUT .../1/mappings` → `{"ok":true,"count":1}`, enable integration — **PASS**. Full click-through in browser **not executed** (no scripted login env). |
   | 4. Webhook ingest | **PASS** | After handoff fix: load products with **`session.get(Product, id)`** + tenant check (avoids **`Row`** from **`exec(select(...)).first()`**). `POST` webhook → **200**, order created; **`pytest`** delivery tests **4 passed**. |
   | 5. Smoke `/` | **PASS** | `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/` → **200**. |

5. **Overall:** **PASS** (implementation ready for tester)  
   - Webhook path fixed in **`delivery_order_service.create_order_from_delivery_payload`** (handoff pass **2026-04-27**). Re-run **Testing instructions** items 3–4 in UI/browser if desired; **`agent:untested`** labels issue for tester queue.

6. **Product owner feedback**  
   Migrations and unit tests pass; admin APIs for credentials, test connection, mappings, and enabling the integration behave as expected. Marketplace webhook ingest creates POS order lines once products resolve as **`Product`** instances (fixed).

7. **URLs tested**  
   1. `http://127.0.0.1:4202/` (smoke).  
   2. `http://127.0.0.1:4202/api/tenant/delivery-integrations` (PUT, GET-style via upsert response).  
   3. `http://127.0.0.1:4202/api/tenant/delivery-integrations/1/test` (POST).  
   4. `http://127.0.0.1:4202/api/tenant/delivery-integrations/1/mappings` (PUT).  
   5. `http://127.0.0.1:4202/api/public/webhooks/delivery/<ingest_token>` (POST — **200** after fix).  
   6. Documented Integrations UI: `http://127.0.0.1:4202/settings?section=delivery-integrations` (not loaded in browser this run).

8. **Relevant log excerpts (last section)**  
   - Prior **FAIL** run: `AttributeError: price_cents` on **`Row`** — resolved by **`session.get(Product, pid)`** in **`create_order_from_delivery_payload`**.
