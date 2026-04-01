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
