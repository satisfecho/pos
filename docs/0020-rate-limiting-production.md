# Rate Limiting – Production Readiness

Rate limiting is implemented per the [ROADMAP](../../ROADMAP.md) (satisfecho/pos). This doc covers production checklist and behaviour.

## What is implemented

- **Global:** 100 requests/minute per client IP (configurable).
- **Login** `POST /token`: 5 requests per 15 minutes per IP.
- **Register** `POST /register`, `POST /register/provider`: 3 per hour per IP.
- **Payment** `create-payment-intent`, `confirm-payment`: 10/minute per IP.
- **Storage:** Redis (shared across instances). In-memory fallback if Redis is down (per-instance limits).
- **Client IP:** Taken from `X-Forwarded-For` (first IP) when present, else `request.client.host`. Ensure your reverse proxy (HAProxy, nginx) sets `X-Forwarded-For` so limits are per end-user, not per proxy.
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
- [ ] **Monitoring:** Grep logs for "Rate limit exceeded" to detect abuse or tune limits.
- [ ] **Disable if needed:** Set `RATE_LIMIT_ENABLED=false` to turn off (e.g. debugging); limits are then no-ops.

## Tests

- **API test:** `npm run test:rate-limit --prefix front` (or `node front/scripts/test-rate-limit.mjs`). Requires running app and Redis. Asserts login 6th → 429, register 4th → 429. Run **before** other login/register tests or from a different IP; otherwise the script exhausts the quota and you may see "already rate limited" warnings.
- **Smoke:** Normal Puppeteer flows (landing, register page, demo-data with login) should still pass; rate limits allow normal single-request usage.

## Not implemented (future)

- Public menu limits, file upload limits, admin limits (see ROADMAP).
- CAPTCHA after failed logins.
- Per-tenant or per-user limits for authenticated endpoints (currently per-IP for auth/payment).
