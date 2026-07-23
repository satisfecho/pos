---
## Closing summary (TOP)

- **What happened:** Abandoned unpaid public Satisfecho Delivery checkout orders could accumulate without a TTL cleanup path.
- **What was done:** Added idempotent TTL cleanup (default 2h) via `cleanup_unpaid_public_delivery` seed/CLI, scoped to public unpaid rows only; docs and SECURITY-REVIEW residual updated.
- **What was tested:** Pytest 6 passed (past-TTL cancel, within-TTL/paid/staff keep, dry-run); live dry-run OK; docs TTL section verified.
- **Why closed:** All test criteria passed; residual risk closed with runnable cleanup.
- **Closed at (UTC):** 2026-07-23 07:06
---

# Cleanup abandoned unpaid public Satisfecho Delivery orders

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Public Satisfecho Delivery create (`POST /public/tenants/{id}/satisfecho-delivery`) persists an order **before** payment and defers kitchen notify until pay. Guests who abandon checkout leave **pending unpaid** rows. `docs/SECURITY-REVIEW.md` already lists this as a residual risk (“consider TTL/cleanup if volume grows”). Without cleanup, Informes/demo tenants and abuse monitoring degrade as abandoned carts accumulate.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23: `SIGNAL changelog_sparse` / docs_stale already owned; investigating delivery residual risks after public checkout shipped (2.1.24 / #302)
- `docs/SECURITY-REVIEW.md` § Residual risks: **Unpaid public delivery orders** — create before pay; kitchen deferred; unpaid rows can accumulate
- Local demo DB: ≥1 `order_channel=satisfecho_delivery` with `OrderStatus.pending` and no `payment_method` (abandoned create path)
- Related WIP **#304** / `WIP-304-…` fixes TenantProduct ID mapping on create — **do not merge**; this task is post-create lifecycle only
- Rate limits alone (`docs/0020`) cap create rate but do not remove abandoned rows

## High-level instructions for coder

- Add an idempotent cleanup for **public** Satisfecho Delivery orders that stay unpaid past a TTL (suggest **1–24h**, align with `public_order_token` ~1h lifetime where sensible; document the chosen window in `docs/0053-satisfecho-delivery-order-channel.md` and a one-liner in SECURITY-REVIEW residual risk)
- Scope carefully: only `order_channel=satisfecho_delivery`, never paid/completed/cancelled kitchen-notified staff creates; prefer cancel/soft-delete consistent with existing order cancel rules and FK cleanup (invoices/inventory — see `reset_demo_data` patterns)
- Prefer a callable seed/ops path (e.g. `python -m app.seeds.cleanup_unpaid_public_delivery` or a small function invoked from deploy/cron docs) over a heavy new service; optional hook from existing daily demo reset **only if** tenant-1-safe and clearly documented
- Add pytest covering: unpaid past TTL → cleaned; paid / in-window unpaid → kept; staff-created Satisfecho Delivery → never auto-cleaned
- Pass/fail: SECURITY residual updated from “consider TTL” to “TTL implemented + how to run”; pytest green; no kitchen spam on abandoned creates

## Implementation notes (coder)

- Public creates (`notify_kitchen=False`) set `session_id=public_satisfecho_delivery`; staff creates leave `session_id` null.
- Core: `back/app/cleanup_unpaid_public_delivery.py` (default TTL **2h**). CLI: `python -m app.seeds.cleanup_unpaid_public_delivery` (`--dry-run`, `--ttl-hours`, `--tenant-id`).
- Effect: cancel + soft-delete (`cancelled_by=ttl_cleanup`, `deleted_at`); no kitchen WS (never published). Demo reset not hooked (already wipes tenant 1).
- Docs: `docs/0053-satisfecho-delivery-order-channel.md`, `docs/SECURITY-REVIEW.md` residual risk updated.

## Testing instructions

1. **Pytest (required):**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back \
     python3 -m pytest tests/test_cleanup_unpaid_public_delivery.py tests/test_public_satisfecho_delivery.py::TestPublicSatisfechoDelivery::test_public_create_happy_path -q
   ```
   Expect: all green. Covers past-TTL cancel, within-TTL keep, paid keep, staff never cleaned, dry-run; public create asserts `session_id=public_satisfecho_delivery`.

2. **Ops dry-run (optional, stack up):**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back \
     python -m app.seeds.cleanup_unpaid_public_delivery --dry-run
   ```
   Expect: prints `matched=` / `cancelled=0` without errors.

3. **Docs check:** `docs/0053` has “Unpaid public checkout cleanup (TTL)” with 2h default; `docs/SECURITY-REVIEW.md` residual says TTL implemented + how to run.

4. **Pass/fail:** pytest green; staff Satisfecho Delivery unpaid rows are not cancelled by the seed; no kitchen notify on cleanup.

## Test report

1. **Date/time (UTC):** 2026-07-23 07:06:04 – 07:06:16 UTC. Log window: `docker logs --since 10m pos-back`.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; branch `development` @ `a4b56e2a`; no browser (`BASE_URL` N/A).
3. **What was tested:** Pytest for TTL cleanup + public create `session_id`; ops `--dry-run`; docs (0053 TTL section + SECURITY-REVIEW residual).
4. **Results:**
   - Pytest (`test_cleanup_unpaid_public_delivery.py` + `test_public_create_happy_path`): **PASS** — `6 passed` in 1.16s.
   - Past-TTL unpaid public → cancelled/soft-deleted (`cancelled_by=ttl_cleanup`): **PASS** — covered by `test_unpaid_past_ttl_is_cancelled`.
   - Within-TTL / paid kept: **PASS** — `test_unpaid_within_ttl_kept`, `test_paid_public_order_kept`.
   - Staff Satisfecho Delivery unpaid never cleaned: **PASS** — `test_staff_created_never_auto_cleaned`.
   - Dry-run no mutate: **PASS** — pytest `test_dry_run_does_not_mutate`; live CLI `[dry-run] matched=0 cancelled=0 ttl_hours=2`.
   - Docs 0053 “Unpaid public checkout cleanup (TTL)” default 2h: **PASS** — section present with CLI examples.
   - SECURITY-REVIEW residual “TTL implemented + how to run”: **PASS** — residual updated with seed module path.
   - No kitchen notify on cleanup: **PASS** — cancel/soft-delete only; no WS in cleanup path; public create still asserts `session_id=public_satisfecho_delivery`.
5. **Overall:** **PASS**
6. **Product owner feedback:** Abandoned unpaid public Satisfecho Delivery carts can now be TTL-cleaned without touching staff orders or re-notifying the kitchen. Ops can dry-run or schedule `python -m app.seeds.cleanup_unpaid_public_delivery` safely. Residual risk in SECURITY-REVIEW is closed with a concrete runbook.
7. **URLs tested:** N/A — no browser
8. **Relevant log excerpts:**
   ```
   ......                                                                   [100%]
   6 passed, 1 warning in 1.16s
   [dry-run] matched=0 cancelled=0 ttl_hours=2 cutoff=2026-07-23T05:06:13.416128+00:00
   ```
   `pos-back` in window: WatchFiles reloads for cleanup modules; no traceback/exception on cleanup or pytest. Recent access lines are unrelated `GET /docs` 200.
