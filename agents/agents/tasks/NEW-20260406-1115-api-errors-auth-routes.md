# WIP: API errors (503, 500) on /api/users/me and /api/token

## Source
...
- **Service:** `pos-haproxy`
- **UTC Window:** ~2026-04-06T10:33:09Z to 10:34:16Z
- **Representative error lines:**
  ```
  192.168.65.1:42224 [06/Apr/2026:10:33:09.602] http_frontend api_backend/api1 0/0/-1/-1/7023 503 217 - - SC-- 8/8/0/0/3 0/0 "GET /api/users/me HTTP/1.1"
  192.168.65.1:42224 [06/Apr/2026:10:33:16.752] http_frontend api_backend/api1 0/0/3013/61/3074 500 173 - - ---- 8/8/0/0/3 0/0 "GET /api/users/me HTTP/1.1"
  192.168.65.1:20146 [06/Apr/2026:10:33:20.621] http_frontend api_backend/<NOSRV> 0/-1/-1/-1/0 503 217 - - SC-- 8/8/0/0/0 0/0 "GET /api/public/legal-urls HTTP/1.1"
  192.168.65.1:20146 [06/Apr/2026:10:33:28.476] http_frontend api_backend/api1 0/0/1/24/25 500 173 - - ---- 8/8/0/0/0 0/0 "POST /api/token HTTP/1.1"
  ```

## High-level instructions for coder
- Investigate why the backend is returning 503 (Service Unavailable) and 500 (Internal Server Error) for critical authentication routes (`/api/users/me`, `/api/token`).
- Check `pos-back` logs to see if the service is crashing, restarting, or failing to connect to the database.
- Note that HAProxy reports `<NOSRV>` for some requests, suggesting the backend might be temporarily down or unreachable.
- Verify PostgreSQL connectivity and health.
