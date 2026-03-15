# Development Roadmap

## Feature Development Status

### ✅ Completed Features
- **Order Management System**: Full order lifecycle (pending → preparing → ready → delivered → paid). Session-based orders per browser; status reset when adding items to ready orders. See `docs/0008-order-management-logic.md` and `docs/0007-implementation-verification.md`.
- **Order modification & soft delete**: Customers can remove items, change quantities, cancel orders (before delivery). Staff can cancel items. Removed items shown with "Show Removed Items" toggle. Item-level status (pending → preparing → ready → delivered).
- **Customer Name Support**: Customers can enter their name, displayed in customer-facing menu and admin orders view.
- **Bidirectional Status Controls**: Order and item status can be moved forward and backward with user-friendly dropdown menus.
- **Currency Support**: Restaurant currency settings are respected throughout the application (orders, menu, etc.).
- **Immediate Payment Required**: Database field, admin settings UI, menu API returns `tenant_immediate_payment_required`; when enabled, checkout modal auto-opens after placing an order.
- **Customer-Facing Menu**: Full menu browsing, cart, order placement, order history section; `GET /menu/{table_token}/order-history`.
- **Payment Integration**: Stripe payment processing for customer orders.
- **Real-time Updates**: WebSocket support for order status updates; token-based WS auth (`/ws-token`, frontend `getWsToken()`).
- **Table reservations**: Staff list/create/edit/cancel/seat/finish at `/reservations`; public book at `/book/:tenantId`, view/cancel by token at `/reservation?token=...`. Table status includes `reserved`. See `docs/0010-table-reservation-implementation-plan.md`, `docs/0011-table-reservation-user-guide.md`.
- **Table PIN security**: Table activation, 4-digit PIN validation for placing orders, PIN rate limiting (Redis). See `docs/0009-table-pin-security.md`.
- **Translations**: Frontend i18n (`@ngx-translate`, `front/public/i18n/*.json`), backend localized messages (`back/app/messages.py`), language detection and persistence. See `docs/0012-translation-implementation.md`.
- **Deployment**: Config guide for domain/IP, `API_URL`, `WS_URL`, CORS. See `docs/0004-deployment.md`.
- **Provider portal**: Suppliers register at `/provider/register`, log in at `/provider/login`, manage catalog at `/provider` (tile/list view, search, add/edit/delete products, company details, bank info). API: `GET/PUT /provider/me`, `GET/POST/PUT/DELETE /provider/products`, etc. See `docs/0014-provider-portal.md`.
- **Kitchen display**: Full-screen view at `/kitchen` for kitchen staff — large order cards, auto-refresh (15s) and WebSocket, optional sound on new orders; read-only. Same access as Orders. See `docs/0015-kitchen-display.md`.

### ❌ Missing Features / To Be Implemented
- **Customer accounts (planned)**: Registration, login, email verification, MFA, customer order history, invoice generation. Not implemented; see `docs/0002-customer-features-plan.md` for full scope.
- **Order management Phase 4 (advanced)**: Batch status updates, status/audit history, item replacement, modification after payment/refund, analytics. See `docs/0007-implementation-verification.md` § "NOT IMPLEMENTED (Phase 4)".
- **Stricter “immediate payment” (optional)**: Today the menu auto-opens payment after place order; customers can still close the modal. A strict “cannot place another order or proceed without paying” flow is not enforced.

### Documentation reference
- **`docs/`**: `0008-order-management-logic.md`, `0007-implementation-verification.md`, `0010-table-reservation-implementation-plan.md`, `0011-table-reservation-user-guide.md`, `0009-table-pin-security.md`, `0012-translation-implementation.md`, `0004-deployment.md`, `0002-customer-features-plan.md`, `0005-email-sending-options.md`, `0006-gmail-setup-instructions.md`, `0013-verification-alternatives.md`.
- **`CHANGELOG.md`**: Tracks unreleased and released changes (reservations, order history, WebSocket, fixes).

---

# Rate Limiting & Security Roadmap

## Current State Analysis

### ❌ Missing Security Features
- **No rate limiting** - API endpoints are completely unprotected
- **No brute force protection** - Login/registration endpoints vulnerable
- **No request throttling** - Public endpoints can be abused
- **No upload rate limiting** - File uploads only have size limits (2MB)
- **No payment protection** - Payment endpoints vulnerable to abuse
- **No monitoring** - No tracking of abuse patterns

### ✅ Existing Infrastructure
- Redis available (can be used for rate limiting storage)
- JWT authentication in place
- File size limits (2MB) for uploads
- CORS middleware configured

---

## Recommended Rate Limiting Strategy

### 1. Global API Rate Limiting (All Endpoints)

**Implementation:** FastAPI middleware using Redis

- **Rate Limit:** 100 requests/minute per IP address
- **Burst:** Allow 20 requests in 5 seconds
- **Storage:** Redis (sliding window or token bucket algorithm)
- **Response:** HTTP 429 Too Many Requests with `Retry-After` header

**Why:** Prevents basic flooding and abuse of any endpoint.

---

### 2. Authentication Endpoints (Critical Priority)

**Endpoints:** `/token` (login), `/register`

- **Login Attempts:** 5 attempts per 15 minutes per IP
- **Registration:** 3 attempts per hour per IP
- **After Limit:** Temporary block (15-60 minutes) or CAPTCHA requirement
- **Tracking:** Store failed attempts in Redis with IP + email combination

**Why:** Prevents brute force attacks and account enumeration.

---

### 3. Public Menu Endpoints (Moderate Priority)

**Endpoints:** `/menu/{table_token}`, `/menu/{table_token}/order`

- **Rate Limit:** 30 requests/minute per IP
- **Per Table Token:** 60 requests/minute
- **Caching:** Cache menu responses for 5-10 minutes (Redis)

**Why:** Prevents abuse while allowing normal customer usage.

---

### 4. File Upload Endpoints (Strict Priority)

**Endpoints:** `/products/{product_id}/image`, `/tenant/logo`

- **Rate Limit:** 10 uploads per hour per authenticated user
- **File Size:** Keep existing 2MB limit
- **Additional:** Validate file type, scan for malicious content

**Why:** Prevents storage abuse and DoS via large uploads.

---

### 5. Database-Heavy Endpoints (Moderate Priority)

**Endpoints:** `/catalog`, `/products`, `/orders`

- **Rate Limit:** 60 requests/minute per authenticated user
- **Caching:** Cache catalog responses for 5 minutes
- **Query Limits:** Add pagination limits (max 100 items per page)

**Why:** Protects database from query flooding.

---

### 6. Payment Endpoints (Very Strict Priority)

**Endpoints:** `/orders/{order_id}/create-payment-intent`, `/orders/{order_id}/confirm-payment`

- **Rate Limit:** 10 requests/minute per authenticated user
- **Per Order:** 3 payment attempts per order per hour
- **Additional:** Validate order state, prevent duplicate payments

**Why:** Prevents payment fraud and duplicate charges.

---

### 7. Admin/Management Endpoints (Strict Priority)

**Endpoints:** `/tenant/settings`, `/providers`, `/tables`

- **Rate Limit:** 30 requests/minute per authenticated user
- **Write Operations:** 20 requests/minute (POST/PUT/DELETE)

**Why:** Prevents accidental or malicious bulk changes.

---

### 8. External API Calls (Scripts)

**Scripts:** `wine_import.py`, `update_wine_details.py`

- **Rate Limit:** 1 request/second to external APIs
- **Retry Logic:** Exponential backoff (1s, 2s, 4s, 8s)
- **Respect:** External API rate limits (if documented)

**Why:** Prevents being blocked by external providers.

---

## Implementation Approach

### Option A: FastAPI Middleware with slowapi (Recommended)

**Package:** `slowapi` (FastAPI-compatible wrapper for `flask-limiter`)

**Pros:**
- Easy to implement
- Works with Redis
- Per-endpoint or global limits
- Good documentation

**Example Structure:**
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, storage_uri="redis://redis:6379")

@app.post("/token")
@limiter.limit("5/15minutes")  # 5 requests per 15 minutes
async def login(...):
    ...
```

---

### Option B: Custom Redis-Based Middleware

**Pros:**
- Full control
- No extra dependencies
- Can implement sliding window or token bucket

**Cons:**
- More code to maintain
- Need to handle edge cases

---

### Option C: Nginx Rate Limiting (Infrastructure Level)

**Pros:**
- Offloads rate limiting from application
- Works for all services
- Can use `limit_req` module

**Cons:**
- Requires Nginx configuration
- Less flexible for per-user limits

---

## Recommended Configuration Values

| Endpoint Type | Limit | Window | Key |
|--------------|-------|--------|-----|
| Global (all) | 100 req | 1 minute | IP address |
| Login | 5 req | 15 minutes | IP address |
| Register | 3 req | 1 hour | IP address |
| Public Menu | 30 req | 1 minute | IP address |
| File Upload | 10 req | 1 hour | User ID |
| Catalog/Products | 60 req | 1 minute | User ID |
| Payment | 10 req | 1 minute | User ID |
| Admin | 30 req | 1 minute | User ID |

---

## Additional Security Recommendations

### 1. Request Size Limits
- **Max Request Body:** 10MB (except file uploads)
- **Max Query Params:** 50 parameters

### 2. Timeout Limits
- **Request Timeout:** 30 seconds
- **Database Query Timeout:** 10 seconds

### 3. IP Allowlisting/Blocklisting
- Block known malicious IPs
- Optional allowlist for admin endpoints

### 4. Rate Limit Headers
- Return `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- Helps clients respect limits

### 5. Monitoring and Alerting
- Log rate limit violations
- Alert on sustained abuse patterns
- Track metrics (requests/sec, blocked IPs)

### 6. Graceful Degradation
- Return 429 with `Retry-After` header
- Don't crash on rate limit errors
- Log for analysis

---

## Implementation Priority

### 🔴 High Priority (Implement First)
1. **Authentication endpoints** (`/token`, `/register`)
2. **Global API rate limiting**
3. **Payment endpoints**

### 🟡 Medium Priority
1. **Public menu endpoints**
2. **File upload endpoints**
3. **Database-heavy endpoints**

### 🟢 Low Priority (Nice to Have)
1. **Admin endpoints**
2. **External API rate limiting (scripts)**
3. **Advanced features** (IP blocklisting, CAPTCHA)

---

## Questions to Consider

1. **Should rate limits be per-tenant or global?**
   - Recommendation: Global with per-user limits for authenticated endpoints

2. **Should we use Redis or in-memory storage?**
   - Recommendation: Redis (already available, works across instances)

3. **Should we implement CAPTCHA after failed login attempts?**
   - Recommendation: Yes, after 3 failed attempts

4. **Should we log all rate limit violations?**
   - Recommendation: Yes, for security monitoring

---

## Environment Variables to Add

```bash
# Rate Limiting Configuration
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REDIS_URL=redis://redis:6379

# Global Limits
RATE_LIMIT_GLOBAL_PER_MINUTE=100
RATE_LIMIT_GLOBAL_BURST=20

# Authentication Limits
RATE_LIMIT_LOGIN_PER_15MIN=5
RATE_LIMIT_REGISTER_PER_HOUR=3

# Public Endpoints
RATE_LIMIT_PUBLIC_MENU_PER_MINUTE=30

# File Uploads
RATE_LIMIT_UPLOAD_PER_HOUR=10

# Payment Endpoints
RATE_LIMIT_PAYMENT_PER_MINUTE=10

# Admin Endpoints
RATE_LIMIT_ADMIN_PER_MINUTE=30
```

---

## Implementation Checklist

- [ ] Install `slowapi` package
- [ ] Configure Redis connection for rate limiting
- [ ] Add global rate limiting middleware
- [ ] Add authentication endpoint rate limits
- [ ] Add payment endpoint rate limits
- [ ] Add public menu endpoint rate limits
- [ ] Add file upload rate limits
- [ ] Add rate limit headers to responses
- [ ] Add logging for rate limit violations
- [ ] Add environment variables for configuration
- [ ] Test rate limiting with various scenarios
- [ ] Document rate limits in API documentation
- [ ] Set up monitoring/alerts for abuse patterns

---

## References

- [slowapi Documentation](https://github.com/laurents/slowapi)
- [FastAPI Security Best Practices](https://fastapi.tiangolo.com/tutorial/security/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Redis Rate Limiting Patterns](https://redis.io/docs/manual/patterns/rate-limiting/)
