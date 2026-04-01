# DELETE /tables/{id} returns 500 — requested language is a Query object

## Source

- **Service:** `pos-back` (`docker logs pos-back`).
- **UTC window:** ~2026-04-01T13:32Z–13:53Z (matches preflight digest; reproduced in live tail).
- **Representative lines:**
  - `DELETE /tables/… HTTP/1.1" 500 Internal Server Error` with `Exception in ASGI application`.
  - Traceback ends in `delete_table` → `lang = _get_requested_language(request)` → `normalize_language_code(lang)` → **`AttributeError: 'Query' object has no attribute 'lower'`** in `language_service.py` (caller `main.py` ~6943).

## High-level instructions for coder

- Inspect `delete_table` and `_get_requested_language` in `back/app/main.py`: ensure the value passed into language normalization is a **string** (or `None`), not a **`Query`** dependency placeholder.
- Align with other endpoints that already resolve `Accept-Language` / `lang` query correctly after recent API error / i18n refactors.
- Re-test `DELETE /api/tables/{id}` (HAProxy or direct back) and confirm **2xx/4xx** for normal cases and structured errors (e.g. table has orders) without **500**.
- Optional: grep for the same `_get_requested_language` usage pattern on other handlers if the bug is copy-pasted.
