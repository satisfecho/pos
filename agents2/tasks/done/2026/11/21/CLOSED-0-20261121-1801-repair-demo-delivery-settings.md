---
## Closing summary (TOP)

- **What happened:** Demo tenant 1 failed `check_demo_delivery_settings` in the 008 preflight (no fee/zone); live data needed repair, not new product code.
- **What was done:** Coder re-verified tenant 1; check already exit 0 (`fee_cents=250`, postal `28001`/`28013`); seed skipped as idempotent; public delivery-config confirmed; no code change.
- **What was tested:** Tester PASS - check exit 0, public config 200 with fee/postal, seed idempotent.
- **Why closed:** All pass/fail criteria met; preflight fail healed; no further work.
- **Closed at (UTC):** 2026-11-21 18:04
---

# Restore tenant 1 demo Satisfecho Delivery fee/zone settings

## GitHub Issues
- **Issue:** (none - enhancement reviewer)
- **0**

## Status
- **NEW → WIP → UNTESTED → TESTING → CLOSED** (2026-11-21): tester PASS; live data healed; no product code change

## Problem / goal

Demo restaurant (tenant 1) failed `check_demo_delivery_settings` during the 008 preflight sweep: no delivery fee and no postal/radius zone. Public `/delivery/1` and Settings → Payments demos need a non-zero fee and in-zone postal codes. Seed/check modules already exist; this is a **live data** repair, not a missing module.

## Evidence (008 preflight / review)

- Digest `2026-11-21T17:58:43Z`: `SIGNAL demo_delivery_settings_check=fail (run seed_demo_delivery_settings)`; other demo checks ok; `G008_NEW_BACKLOG_PAUSE=0`; no open repair owner
- Seed/check already shipped (archived `CLOSED-0-20260723-2103-seed-demo-delivery-zone-fee-settings`); wired into `reset_demo_data` / `bootstrap_demo`
- 008 re-check shortly after digest: `check_demo_delivery_settings` exited 0 (`fee_cents=250`, postal `28001`/`28013`) - data may have been re-seeded or the fail was transient. Coder must still re-verify; if fail returns, run seed
- Open queue: unrelated `FEAT-388-…-remove-redundant-products-category-buttons.md` only

## High-level instructions for coder

- Tenant **1 only**. Run `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python -m app.seeds.check_demo_delivery_settings`
- If exit 1: `python -m app.seeds.seed_demo_delivery_settings` (or full `reset_demo_data` if other demo gaps appear). Do **not** add a new seed module; do not overwrite other tenants; seed is idempotent and skips when fee/zone already set
- If exit 0 already: confirm public config still exposes fee/postal (`/api/public/tenants/1/satisfecho-delivery-config`); note in task that preflight fail was healed; no code change required unless seed/reset path is broken
- Tester pass/fail: `check_demo_delivery_settings` exit 0; optional curl of public delivery-config shows `delivery_fee_cents` > 0 or postal codes present

## Coder notes

- **Local/dev re-verify (2026-11-21):** `check_demo_delivery_settings` exited **0** with `fee_cents=250`, `postal_codes=['28001', '28013']`, `radius_meters=None`. Preflight fail was already healed (likely prior seed / `reset_demo_data`); no live-data write needed.
- **Seed path OK:** `seed_demo_delivery_settings` idempotently skipped (fee/zone already set). Wired in `reset_demo_data` / `bootstrap_demo`; no new module; no code change.
- **Public API:** `GET /api/public/tenants/1/satisfecho-delivery-config` via HAProxy `127.0.0.1:14202` returned 200 with `delivery_fee_cents=250`, `postal_codes=["28001","28013"]`, `postal_codes_required=true`.

## Testing instructions

### What to verify

- Tenant **1** has a non-zero Satisfecho Delivery fee and/or postal (or radius) zone.
- Public delivery config exposes that fee/postal for `/delivery/1`.
- Seed remains idempotent when settings are already present (optional).

### How to test

From repo root, with `docker compose -f docker-compose.yml -f docker-compose.dev.yml` up. HAProxy host port from `docker compose ps` (this workspace: `127.0.0.1:14202->4202/tcp`).

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python -m app.seeds.check_demo_delivery_settings
```

Optional public config (replace port if needed):

```bash
curl -sS "http://127.0.0.1:14202/api/public/tenants/1/satisfecho-delivery-config"
```

Optional idempotency:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python -m app.seeds.seed_demo_delivery_settings
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python -m app.seeds.check_demo_delivery_settings
```

If check exits 1, run `python -m app.seeds.seed_demo_delivery_settings` then re-check. Do **not** run full `reset_demo_data` on production unless ops wants a tenant-1 wipe.

### Pass/fail criteria

- **Pass:** `check_demo_delivery_settings` exit **0**; optional curl shows `delivery_fee_cents` > 0 and/or non-empty `postal_codes` (or active radius).
- **Fail:** check exit 1, or public config still has fee 0 with empty postal and no radius.

## Test report

1. **Date/time (UTC):** start `2026-11-21T18:03:19Z`, end `2026-11-21T18:03:29Z`. Log window: `2026-11-21T18:03:00Z` onward.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; HAProxy `127.0.0.1:14202`; branch `development`. No GitHub issue (#0).
3. **What was tested:** tenant 1 demo Satisfecho Delivery fee/zone via `check_demo_delivery_settings`; public `/api/public/tenants/1/satisfecho-delivery-config`; optional seed idempotency.
4. **Results:**
   - Tenant 1 non-zero fee and/or postal zone: **PASS** - `check_demo_delivery_settings` exit 0; `fee_cents=250`, `postal_codes=['28001', '28013']`, `radius_meters=None`.
   - Public delivery config exposes fee/postal: **PASS** - HTTP 200; `delivery_fee_cents=250`, `postal_codes=["28001","28013"]`, `postal_codes_required=true`.
   - Seed idempotent when already set: **PASS** - seed skipped (`already has delivery fee/zone`); re-check exit 0 unchanged.
5. **Overall:** **PASS**
6. **Product owner feedback:** Demo tenant 1 again has a usable Satisfecho Delivery fee (EUR 2.50) and Madrid postal zone for public `/delivery/1`. The earlier 008 preflight fail looks healed; no further seed or code work needed for this repair.
7. **URLs tested:**
   1. `http://127.0.0.1:14202/api/public/tenants/1/satisfecho-delivery-config`
8. **Relevant log excerpts:**
   - `pos-back`: `GET /public/tenants/1/satisfecho-delivery-config HTTP/1.1" 200 OK`
   - `pos-haproxy`: `GET /api/public/tenants/1/satisfecho-delivery-config HTTP/1.1` → 200
