---
## Closing summary (TOP)

- **What happened:** Rate-limiting ops doc (`docs/0020`) was stale and omitted waiting-list / Satisfecho Delivery public limits; marketplace delivery webhook ingest had no SlowAPI throttle.
- **What was done:** Documented waiting-list, public Satisfecho Delivery create, and delivery webhook under the public-menu IP bucket plus related env vars in **0020**; applied `@public_menu_ip_limit()` to webhook ingest with SlowAPI header params.
- **What was tested:** Doc grep, webhook POST 200 with `x-ratelimit-*` headers, `test:rate-limit` (DEV skips), homepage 200 — all **PASS**.
- **Why closed:** All tester criteria passed; enhancement fully delivered (no GitHub issue).
- **Closed at (UTC):** 2026-07-22 11:50
---

# Align rate-limiting doc with waiting list and delivery public routes

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`docs/0020-rate-limiting-production.md` is flagged stale (>90d) and no longer lists limits that shipped with waiting list and Satisfecho Delivery. Operators and agents following that doc miss `RATE_LIMIT_WAITING_LIST_PER_HOUR` and the public delivery create path. Marketplace webhook ingest also appears unthrottled.

## Evidence (008 preflight / review)

- `SIGNAL docs_stale` includes `docs/0020-rate-limiting-production.md` (age_days≈91)
- Code: `POST /public/tenants/{tenant_id}/waiting-list` uses `RATE_LIMIT_WAITING_LIST_PER_HOUR` (default 10/hour) — not mentioned in **0020**
- Code: `POST /public/tenants/{tenant_id}/satisfecho-delivery` uses `@public_menu_ip_limit()` — documented in **0053**, not in **0020**
- Code: `POST /public/webhooks/delivery/{webhook_token}` in `delivery_integration_routes.py` has **no** `@limiter` / `public_menu_ip_limit`

## High-level instructions for coder

- Update **`docs/0020-rate-limiting-production.md`** only (no bulk doc rewrite): add bullets for waiting-list and public Satisfecho Delivery create; add `RATE_LIMIT_WAITING_LIST_PER_HOUR` to the env checklist.
- Prefer documenting the **existing** public-menu IP bucket for delivery create unless product wants a dedicated stricter limit.
- Add a SlowAPI / shared public limit on **`POST /public/webhooks/delivery/{webhook_token}`** consistent with other unauthenticated ingest routes; update **0020** to match.
- Do not change login/register quotas unless broken.
- Pass criteria: **0020** lists waiting-list + public delivery create + webhook; webhook responses include rate-limit headers when limits enabled; existing `npm run test:rate-limit` still completes as a smoke (dev may relax thresholds).
- Append **Testing instructions** when done.

## Implementation notes (feature coder)

- Updated `docs/0020-rate-limiting-production.md`: public-menu bullet now includes `POST /public/tenants/{tenant_id}/satisfecho-delivery` and `POST /public/webhooks/delivery/{webhook_token}`; added waiting-list bullet; env checklist includes `RATE_LIMIT_WAITING_LIST_PER_HOUR`, `RATE_LIMIT_GUEST_FEEDBACK_PER_HOUR`, `RATE_LIMIT_PASSWORD_RESET_PER_HOUR`.
- Applied `@public_menu_ip_limit()` to `ingest_delivery_webhook` in `back/app/delivery_integration_routes.py` (shared `RATE_LIMIT_PUBLIC_MENU_PER_MINUTE` bucket); added `Request`/`Response` params for SlowAPI headers.

## Testing instructions

1. Confirm docs: `grep -E 'waiting-list|satisfecho-delivery|webhooks/delivery|RATE_LIMIT_WAITING_LIST' docs/0020-rate-limiting-production.md` shows waiting-list, public delivery create, webhook, and env var.
2. Webhook rate-limit headers (app up on HAProxy `:4202`): with a valid tenant delivery integration webhook token and catalog mapping, `POST /api/public/webhooks/delivery/{token}` with a valid stub payload (`external_order_ref`, `lines`) returns **200** and includes `x-ratelimit-limit` / `x-ratelimit-remaining` when `RATE_LIMIT_ENABLED=true`.
3. Smoke: `BASE_URL=http://127.0.0.1:4202 npm run test:rate-limit --prefix front` — on production-like limits expect 429 on 6th login / 4th register; on local DEV (relaxed thresholds) use `SKIP_LOGIN_LIMIT=1 SKIP_REGISTER_LIMIT=1` so the script still exits PASS without exhausting quotas.
4. Regression: `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4202/` → `200`.

## Test report

1. **Date/time (UTC):** 2026-07-22 11:49:02 – 11:49:25 UTC. Log window: `docker logs --since 15m` on `pos-back` / `pos-front`.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` (synced via `./scripts/git-sync-development.sh`). `RATE_LIMIT_ENABLED` default True; public-menu bucket 500/min (DEV).
3. **What was tested:** Doc alignment for waiting-list + public delivery create + webhook; webhook SlowAPI headers; `test:rate-limit` smoke (DEV skips); homepage regression.
4. **Results:**
   - Docs list waiting-list, `satisfecho-delivery`, `webhooks/delivery`, `RATE_LIMIT_WAITING_LIST_PER_HOUR`: **PASS** — `grep -E 'waiting-list|satisfecho-delivery|webhooks/delivery|RATE_LIMIT_WAITING_LIST' docs/0020-rate-limiting-production.md` matched lines 11–12 and 35.
   - Webhook returns 200 with `x-ratelimit-limit` / `x-ratelimit-remaining`: **PASS** — `POST /api/public/webhooks/delivery/{token}` with mapped `rl-test-sku` → HTTP 200 body `{"received":true,"status":"created","order_id":1128}`; headers `x-ratelimit-limit: 500`, `x-ratelimit-remaining: 499`.
   - `npm run test:rate-limit` (SKIP_LOGIN_LIMIT=1 SKIP_REGISTER_LIMIT=1): **PASS** — script printed `PASS: rate limiting behaves as expected.` (exit 0).
   - Homepage `GET /` → 200: **PASS** — `curl` wrote `200`.
5. **Overall:** **PASS**
6. **Product owner feedback:** Rate-limit ops doc now covers waiting list and Satisfecho Delivery create/webhook ingest, and marketplace webhook traffic shares the public-menu IP bucket with visible SlowAPI headers. Local DEV smoke still passes when login/register quota checks are skipped. Safe to close.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/` (homepage regression)
   2. `http://127.0.0.1:4202/api/public/webhooks/delivery/{webhook_token}` (POST stub order)
   3. N/A browser UI — API/`npm run test:rate-limit` only (script hits `/api` under same BASE_URL)
8. **Relevant log excerpts (last section):**
```
INFO:     ... "POST /public/webhooks/delivery/GSdf74tY1p8g… HTTP/1.1" 200 OK
# Response headers (curl -D):
# x-ratelimit-limit: 500
# x-ratelimit-remaining: 499
# front test:rate-limit: PASS: rate limiting behaves as expected.
# front logs (15m): no TS/build errors for this window
```
