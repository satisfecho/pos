---
## Closing summary (TOP)

- **What happened:** Authenticated product image uploads failed with HTTP 500 because SlowAPI’s rate limiter expected a Starlette `Response` from wrapped routes that returned plain dicts.
- **What was done:** `upload_product_image` and `provider_upload_product_image` were aligned with other limited routes by returning `JSONResponse` with JSON-safe product payload (e.g. `model_dump(mode="json")`).
- **What was tested:** Staff multipart `POST` to `/api/products/{id}/image` returned **200** with size fields; back logs showed **200** for verified uploads; `npm run test:landing-version` **PASS** (provider path optional, not exercised).
- **Why closed:** Pass criteria met; overall **PASS** per tester report.
- **Closed at (UTC):** 2026-03-31 10:40
---

# Product image upload POST returns 500 (slowapi `response` type)

## Source

- **Service:** `pos-back` (`docker logs pos-back`)
- **UTC window:** traceback tied to **`POST /products/423/image`** (sampled **2026-03-31** stack session; **500** on upload path)
- **Representative lines:**

```
INFO: ... "POST /products/423/image HTTP/1.1" 500 Internal Server Error
ERROR: Exception in ASGI application
...
File ".../slowapi/extension.py", line 382, in _inject_headers
    raise Exception(
Exception: parameter `response` must be an instance of starlette.responses.Response
```

## High-level instructions for coder

- Inspect **`slowapi`** usage on **`POST /products/{id}/image`** (multipart upload): the limiter’s `_inject_headers` path is raising because it does not receive a **`starlette.responses.Response`** instance from the wrapped endpoint.
- Fix by aligning the route with SlowAPI/FastAPI expectations (e.g. ensure a proper **`Response`** object flows through the decorator chain, or adjust rate-limit wiring for file-upload handlers).
- Re-test authenticated **`POST /products/<id>/image`**; expect **200** and persisted image — no **500** from middleware.

## Coder notes

- **`upload_product_image`** and **`provider_upload_product_image`** returned plain **`dict`** values. With **`@limiter.limit`**, slowapi’s **`_inject_headers`** expects the route return to be a **`starlette.responses.Response`** (same pattern as **`POST /tables`** and **`POST /tenant/header-background`** in this codebase).
- **Change:** return **`JSONResponse(content=..., status_code=200)`**; use **`product.model_dump(mode="json")`** for JSON-safe payload.

---

## Testing instructions

### What to verify

- Authenticated **`POST /products/{product_id}/image`** (multipart file) returns **200** with JSON body (product fields + `image_size_bytes` / `image_size_formatted`) and no traceback from **`slowapi.extension`** in **`docker logs pos-back`**.
- Optional: **`POST /provider/products/{product_id}/image`** also returns **200** JSON (same slowapi fix).

### How to test

1. Stack: **`docker compose -f docker-compose.yml -f docker-compose.dev.yml`** (HAProxy e.g. **`http://127.0.0.1:4202`**).
2. In the staff UI, open **Products / catalog**, edit a product, **upload a raster image** (jpg/png/webp within size limits).
3. Or use **curl** with a staff JWT and **`multipart/form-data`** file field against **`POST /api/products/<id>/image`** (path may be proxied; match your **`BASE_URL`** from **`docs/testing.md`**).

### Pass / fail criteria

- **Pass:** HTTP **200**, image appears on the product, **`pos-back`** logs show no **500** / **`parameter \`response\` must be an instance of starlette.responses.Response`** for that request.
- **Fail:** **500** on upload with the slowapi **`Response`** exception, or broken JSON shape vs previous client expectations (should match prior dict serialization).

---

## Test report

1. **Date/time (UTC):** 2026-03-31T10:27Z–10:30Z (log window aligned with `docker logs pos-back` tail during and after verification).
2. **Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml`; **`BASE_URL`** `http://127.0.0.1:4202` (HAProxy → API); branch **`development`** @ **`f4af615`**.
3. **What was tested:** Authenticated multipart **`POST /api/products/{product_id}/image`** (staff cookie session after **`POST /api/token`**); optional smoke **`npm run test:landing-version`** from **`front/`** with **`BASE_URL=http://127.0.0.1:4202`**. Provider upload not exercised (optional).
4. **Results:**
   - **Multipart upload returns 200 + JSON with `image_size_bytes` / `image_size_formatted`:** **PASS** — response included product fields and size metadata; HTTP **200**.
   - **No 500 / slowapi `Response` type error on this path:** **PASS** — `docker logs pos-back` access lines show **`POST /products/1/image ... 200 OK`** for verification POSTs (no **500** on those lines).
   - **Landing smoke:** **PASS** — script exited **0** (`Landing version OK; demo login (tenant=1) OK; sidebar nav OK`).
5. **Overall:** **PASS** (staff product image upload path; optional provider path not tested).
6. **Product owner feedback:** Staff product image upload works through the rate-limited route with a normal JSON body and size fields. The optional provider mirror was not validated in this run; run it if provider catalog uploads are in scope for release.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/api/token` (login, **200**)
   2. `http://127.0.0.1:4202/api/products/1/image` (multipart PNG, **200**)
   3. `http://127.0.0.1:4202/` and logged-in sidebar routes (via **`test:landing-version`**, **PASS**)
8. **Relevant log excerpts:**

```
INFO:     172.30.0.3:58962 - "POST /products/1/image HTTP/1.1" 200 OK
```

(Older **`slowapi.extension`** tracebacks may still appear in long-lived **`pos-back`** logs from other requests or prior sessions; the verified **`POST /products/1/image`** requests completed with **200 OK** in the access log with no **500** on that route during verification.)
