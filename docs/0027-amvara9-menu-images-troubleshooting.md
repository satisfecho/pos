# amvara9: Public menu images not loading (satisfecho.de)

If images on the public menu (e.g. https://satisfecho.de/menu/{table_token}) or on /products or /catalog are missing or broken, the backend is likely returning 404 for `/api/uploads/...` requests. This doc explains the fix and how to verify on the server.

## Cause and fix (in repo)

- **Cause:** Behind HAProxy (and nginx in the front container), FastAPI’s `StaticFiles` mount often returns 404 for nested paths like `/uploads/1/products/...` and `/uploads/providers/{token}/products/...`.
- **Fix:** Explicit FastAPI routes were added in `back/app/main.py`:
  - `GET /uploads/providers/{provider_token}/products/{filename}` (catalog/provider images)
  - `GET /uploads/{tenant_id}/products/{filename}` (tenant product images; used by public menu and /products)
- **Persistence:** The fix is in code. After every deploy that builds and runs the latest `back` image, these routes are active. No one-off server tweaks are required.

## Verify after deploy

From your workstation:

```bash
# Health
curl -sI https://satisfecho.de/api/health

# If you have a known image path (e.g. tenant 1 product image), replace with a real filename from DB or back/uploads
curl -sI "https://satisfecho.de/api/uploads/1/products/some-existing-file.jpg"
# Expect: 200 OK (if file exists) or 404 with body {"detail":"Image not found"} (route is present, file missing)
# Bad: 404 with no JSON or different body → old back image without explicit routes; redeploy.
```

## Investigate on server (SSH amvara9)

Run from the repo root on the server (e.g. `/development/pos`):

```bash
cd /development/pos   # or your deploy path

# 1. Backend logs (recent 404s on uploads)
docker compose --env-file config.env -f docker-compose.yml -f docker-compose.prod.yml logs --tail=200 back 2>&1 | grep -E "uploads|404"

# 2. Confirm uploads dir and back image
ls -la back/uploads/1/products/ 2>/dev/null | head -5
ls -la back/uploads/providers/ 2>/dev/null | head -5
docker compose --env-file config.env -f docker-compose.yml -f docker-compose.prod.yml exec -T back python3 -c "
from pathlib import Path
p = Path('/app/app/main.py').parent.parent / 'uploads'
print('UPLOADS_DIR exists:', p.exists())
print('providers exists:', (p / 'providers').exists())
"

# 3. Test image route from inside the backend (should return 404 with "Image not found" body if route is present)
docker compose --env-file config.env -f docker-compose.yml -f docker-compose.prod.yml exec -T back python3 -c "
import urllib.request
try:
    r = urllib.request.urlopen(urllib.request.Request('http://localhost:8020/uploads/1/products/__nonexistent__.jpg', method='GET'))
except urllib.error.HTTPError as e:
    body = e.read().decode()
    if 'Image not found' in body or 'Invalid filename' in body:
        print('OK: explicit upload route is active (backend has latest code).')
    else:
        print('Unexpected 404 body:', body[:200])
    print('Status:', e.code)
"
```

If the script prints “OK: explicit upload route is active” but the browser still misses images, check:

- **HAProxy:** Same compose stack is used for prod; `acl is_api path_beg /api` and `api_backend` strip `/api` and forward to `pos-back:8020`. No change needed unless you have a separate host-level proxy.
- **DEV vs PROD on same host:** If you run both (e.g. dev on 4202, prod on 80/443), they share the same `haproxy.cfg`; only ports differ. Both route `/api` to the backend. Ensure the **prod** back container is the one built from the repo that contains the explicit upload routes (e.g. after `deploy-amvara9.sh`).

## If images still 404 after a fresh deploy

1. Ensure the deploy script **built** the back image: `docker compose ... build back` (deploy-amvara9.sh does this).
2. Ensure **no host-level proxy** (e.g. nginx on the host) is routing `satisfecho.de` to a different backend or stripping paths.
3. Ensure `back/uploads` on the host has the files (tenant and catalog imports write there); see AGENTS.md “Demo tables” and “Catalog on deploy”.
