# Rate Limiting – Production Readiness

Rate limiting is implemented per the [ROADMAP](../../ROADMAP.md) (satisfecho/pos). This doc covers production checklist and behaviour.

## What is implemented

- **Global:** 100 requests/minute per client IP (configurable).
- **Login** `POST /token`: 5 requests per 15 minutes per IP.
- **Register** `POST /register`, `POST /register/provider`: 3 per hour per IP.
- **Payment** `create-payment-intent`, `confirm-payment`: 10/minute per IP; plus **3 per order per hour** per IP (per-order limit).
- **Public menu & discovery** (unauthenticated): `GET/POST /menu/{table_token}`, `GET /menu/{table_token}/order`, `GET /menu/{table_token}/order-history`, and related public menu endpoints (call-waiter, request-payment, order item update/remove, cancel order); **`GET /public/tenants`**, **`GET /public/legal-urls`**, **`GET /public/tenants/{tenant_id}`**, **`GET /public/tenants/{tenant_id}/reservation-book-zones`**, **`GET /public/table-lookup`**, **`GET /internal/validate-table/{table_token}`** (ws-bridge); **`POST /public/tenants/{tenant_id}/satisfecho-delivery`** (public delivery checkout create); **`POST /public/webhooks/delivery/{webhook_token}`** (marketplace webhook ingest): **30 requests/minute per IP** (same bucket as `RATE_LIMIT_PUBLIC_MENU_PER_MINUTE`).
- **Waiting list** (anonymous): `POST /public/tenants/{tenant_id}/waiting-list`: **10 submissions/hour per IP** (`RATE_LIMIT_WAITING_LIST_PER_HOUR`).
- **Guest feedback** (anonymous): `POST /public/tenants/{tenant_id}/guest-feedback`: **15 submissions/hour per IP** (`RATE_LIMIT_GUEST_FEEDBACK_PER_HOUR`).
- **Password reset**: `POST /password-reset/request`, `POST /password-reset/confirm`: **5/hour per IP** (`RATE_LIMIT_PASSWORD_RESET_PER_HOUR`).
- **Uploads** (authenticated, per user): `POST /tenant/logo`, `POST /products/{id}/image`, `POST /provider/products/{id}/image`: **10 uploads per hour per user**.
- **Admin/management** (authenticated, per user): `GET/PUT /tenant/settings`, `GET/POST/PUT/DELETE /tables` (and table activate/close/regenerate-pin/assign-waiter), `GET/POST /providers`, `GET /providers/{id}`, **`/inventory/*`**, **`/reports/*`** (including attendance Excel exports), **`/staff-contracts/*`**, **`/staff-contract-templates/*`**, **`GET /tenant/data-export`**, **`POST /tenant/purge`**, `GET /tenant/guest-feedback`: **30 requests/minute per user** (`RATE_LIMIT_ADMIN_PER_MINUTE`). Same pattern applies to other authenticated management routes declared in `main.py` that use the admin limiter.
- **Storage:** Redis (shared across instances). In-memory fallback if Redis is down (per-instance limits).
- **Client IP:** Taken from `X-Forwarded-For` (first IP) when present, else `request.client.host`. Ensure your reverse proxy (HAProxy, nginx) sets `X-Forwarded-For` so limits are per end-user, not per proxy.
- **Per-user key:** For upload and admin limits, the key is derived from the JWT (tenant_id or provider_id + sub) when present; no database lookup.
- **Logging:** Each 429 is logged (path, method, client key) for security monitoring.
- **Response:** HTTP 429 with `Retry-After` and rate-limit headers (`X-RateLimit-*`).

## Production checklist

- [ ] **Redis:** Backend has `REDIS_URL` (or `RATE_LIMIT_REDIS_URL`) so rate limits are shared across instances. Without Redis, each instance has its own in-memory limit (weaker under load balancer).
- [ ] **Proxy:** Reverse proxy sends `X-Forwarded-For` (e.g. HAProxy `option forwardfor`). Otherwise all traffic is counted under the proxy IP and legitimate users can be blocked together.
- [ ] **Env (optional):** Set in `config.env` or environment:
  - `RATE_LIMIT_ENABLED=true` (default)
  - `RATE_LIMIT_GLOBAL_PER_MINUTE=100`
  - `RATE_LIMIT_LOGIN_PER_15MIN=5`
  - `RATE_LIMIT_REGISTER_PER_HOUR=3`
  - `RATE_LIMIT_PAYMENT_PER_MINUTE=10`
  - `RATE_LIMIT_PAYMENT_PER_ORDER_PER_HOUR=3`
  - `RATE_LIMIT_PUBLIC_MENU_PER_MINUTE=30`
  - `RATE_LIMIT_WAITING_LIST_PER_HOUR=10`
  - `RATE_LIMIT_GUEST_FEEDBACK_PER_HOUR=15`
  - `RATE_LIMIT_PASSWORD_RESET_PER_HOUR=5`
  - `RATE_LIMIT_UPLOAD_PER_HOUR=10`
  - `RATE_LIMIT_ADMIN_PER_MINUTE=30`
- [ ] **Monitoring:** Grep logs for "Rate limit exceeded" to detect abuse or tune limits.
- [ ] **Disable if needed:** Set `RATE_LIMIT_ENABLED=false` to turn off (e.g. debugging); limits are then no-ops.

## Tests

- **API test:** `npm run test:rate-limit --prefix front` (or `node front/scripts/test-rate-limit.mjs`). Requires running app and Redis. Asserts login 6th → 429, register 4th → 429. Run **before** other login/register tests or from a different IP; otherwise the script exhausts the quota and you may see "already rate limited" warnings.
- **Smoke:** Normal Puppeteer flows (landing, register page, demo-data with login) should still pass; rate limits allow normal single-request usage.

## Not implemented (future)

- CAPTCHA after failed logins.
- Per-tenant or stricter per-user limits for other authenticated endpoints (e.g. catalog 60/min); global and endpoint-specific limits above cover the roadmap priorities.
