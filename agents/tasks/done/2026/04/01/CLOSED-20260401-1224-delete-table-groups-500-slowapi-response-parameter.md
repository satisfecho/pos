---
## Closing summary (TOP)

- **What happened:** Table-group `POST`/`DELETE` returned 500 with SlowAPI when rate limiting was enabled because handlers returned plain dicts instead of `Response`, triggering the `parameter 'response' must be an instance of starlette.responses.Response` error.
- **What was done:** Fix on `development` uses `JSONResponse` for those routes (aligned with other SlowAPI-safe patterns); subprocess test `back/tests/test_table_groups_slowapi_subprocess.py` runs with `RATE_LIMIT_ENABLED=true` outside normal pytest conftest.
- **What was tested:** `docker compose exec back python3 -m pytest tests/test_table_groups_slowapi_subprocess.py -v` — **1 passed**; no SlowAPI `response` errors in sampled `pos-back` logs.
- **Why closed:** Automated criteria **PASS**; POST/DELETE with rate limiting verified in isolation.
- **Closed at (UTC):** 2026-04-01 13:15
---

# DELETE /table-groups/{id} returns 500 — SlowAPI `response` parameter

## Source

- **Service:** `pos-back` (via `pos-haproxy` access log).
- **UTC window:** from prior **001** review **2026-04-01T11:30:08Z** through sampled follow-up (**2026-04-01** session).
- **Representative lines:**
  - `DELETE /table-groups/3 HTTP/1.1" 500 Internal Server Error`
  - `ERROR: Exception in ASGI application` … `Exception: parameter 'response' must be an instance of starlette.responses.Response` (raised from `slowapi/extension.py` during request handling).

## High-level instructions for coder

- Reproduce `DELETE /api/table-groups/{id}` (or equivalent path) and confirm the 500.
- Inspect the table-groups delete endpoint: fix SlowAPI/rate-limit decorator interaction so the endpoint signature matches what SlowAPI expects (Starlette `Response` injection), or adjust decorators/order per existing patterns elsewhere in the API.
- Retest delete (and related table-group routes) after the fix; ensure no regression for rate limiting.

## Coder notes

- **Root cause:** With `@limiter.limit`, SlowAPI’s sync wrapper injects rate-limit headers into the route return value only when it is a **`starlette.responses.Response`**. Returning a **plain `dict`** makes SlowAPI fall back to `kwargs.get("response")`, which FastAPI does not set for these handlers → **`parameter \`response\` must be an instance of starlette.responses.Response`**.
- **Fix (already on `development`):** `POST /table-groups` and `DELETE /table-groups/{group_id}` return **`JSONResponse`** with explicit status codes (same pattern as product image upload fix). Landed in commit **`5b1f662`** (“table-groups JSONResponse for slowapi”).
- **This pass:** Added **`back/tests/test_table_groups_slowapi_subprocess.py`**: subprocess test imports the app with **`RATE_LIMIT_ENABLED=true`** (pytest’s `conftest` forces it off for normal tests), joins two eligible tables, then deletes the group — asserts **201** then **200** with no SlowAPI exception.

---

## Testing instructions

### What to verify

- **`POST /api/table-groups`** and **`DELETE /api/table-groups/{id}`** succeed with rate limiting enabled (no **500** / no SlowAPI `Response` traceback in **`pos-back`** logs).
- Automated: **`pytest tests/test_table_groups_slowapi_subprocess.py`** passes in Docker.

### How to test

1. Stack: **`docker compose -f docker-compose.yml -f docker-compose.dev.yml`**, backend reachable (e.g. via HAProxy **`http://127.0.0.1:4202/api/...`**).
2. **Automated (preferred):**  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest tests/test_table_groups_slowapi_subprocess.py -v`
3. **Manual:** Log in as staff with **TABLE_WRITE**, join two tables on the floor plan (that are allowed to join), then **unjoin / dissolve** the group — expect success, **200** on delete, no **500** in **`docker compose … logs back`**.

### Pass / fail criteria

- **Pass:** Subprocess pytest **PASS**; or manual flow completes with **200** on delete and logs show no **`parameter \`response\` must be an instance of starlette.responses.Response`** from **`slowapi.extension`**.
- **Fail:** **500** on **`POST`/`DELETE /table-groups`** with that SlowAPI error, or regression in join/delete behaviour.

---

## Test report

1. **Date/time (UTC) and log window:** **2026-04-01T12:39:30Z** – **2026-04-01T12:40:15Z** (tester run; `pos-back` logs sampled immediately after pytest).
2. **Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml`; backend via **`back`** service exec; branch **`development`**, HEAD **`ab79d2a`**; **`BASE_URL`** for manual path not used (automated only).
3. **What was tested:** Per **Testing instructions**: table-groups **POST**/**DELETE** with SlowAPI/rate limiting enabled via subprocess pytest; criteria from **What to verify**.
4. **Results:**
   - **`POST`/`DELETE` succeed with rate limiting enabled (no 500 / no SlowAPI `Response` traceback):** **PASS** — `tests/test_table_groups_slowapi_subprocess.py::test_table_groups_post_delete_with_slowapi_enabled_subprocess` completed without exception; subprocess enables **`RATE_LIMIT_ENABLED=true`** per test design.
   - **Automated pytest in Docker:** **PASS** — `1 passed in 0.94s` (command below).
5. **Overall:** **PASS**.
6. **Product owner feedback:** The automated subprocess test gives confidence that table-group create/delete no longer trips SlowAPI when rate limiting is on. Operators deleting or dissolving groups should see normal success responses instead of intermittent 500s from the decorator mismatch.
7. **URLs tested:** **N/A — no browser** (automated pytest only; manual floor-plan path not exercised this run).
8. **Relevant log excerpts:**

```
$ docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest tests/test_table_groups_slowapi_subprocess.py -v
tests/test_table_groups_slowapi_subprocess.py::test_table_groups_post_delete_with_slowapi_enabled_subprocess PASSED [100%]
============================== 1 passed in 0.94s ===============================
```

`docker compose … logs --tail=30 back` during the window showed routine **GET /docs** **200** lines only; no **`slowapi.extension`** **`parameter 'response'`** errors (subprocess test traffic is isolated to the test child process).
