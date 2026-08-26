# amvara9: Public menu images not loading (satisfecho.de)

## Status: ops guide — upload routes shipped

Explicit `GET /uploads/...` product/provider routes are **in tree** (`back/app/main.py`) and ship with every normal amvara9 deploy. Do **not** treat a current `/api/uploads/...` **404** as “redeploy for StaticFiles.”

| curl / browser result | Meaning | Next step |
|-----------------------|---------|-----------|
| **200** | File on disk; routes OK | Done |
| **404** JSON `{"detail":"Image not found"}` (or `Invalid filename`) | **Routes are active**; file missing or DB orphan `image_filename` | Check disk under `back/uploads/…`; clear orphans (below); see [testing.md](testing.md) *Clear orphan provider product images* and [0014-provider-portal.md](0014-provider-portal.md) |
| **404** with empty/HTML body (no FastAPI JSON) | Unusual — old back image or wrong proxy | Confirm prod `back` image via [0001-ci-cd-amvara9.md](0001-ci-cd-amvara9.md) / [0004-deployment.md](0004-deployment.md); redeploy only then |

Historical context: nested `StaticFiles` paths used to 404 behind HAProxy; that mount issue was fixed with the explicit routes above. Remaining broken images are almost always **missing-on-disk** or **orphan DB refs** (catalog helpers already omit `image_url` when the file is absent).

## Cause and fix (in repo — historical)

- **Cause (historical):** Behind HAProxy (and nginx in the front container), FastAPI’s `StaticFiles` mount often returned 404 for nested paths like `/uploads/1/products/...` and `/uploads/providers/{token}/products/...`.
- **Fix (shipped):** Explicit FastAPI routes in `back/app/main.py`:
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
# Expect: 200 OK (if file exists)
# Or: 404 + JSON {"detail":"Image not found"} → route OK, file/DB orphan (not a StaticFiles redeploy)
# Rare: 404 with no JSON → old back image or proxy; see Status table above
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

Prefer the Status table first: JSON `Image not found` means **do not** chase StaticFiles — check files and orphans.

1. Ensure the deploy script **built** the back image: `docker compose ... build back` (deploy-amvara9.sh does this).
2. Ensure **no host-level proxy** (e.g. nginx on the host) is routing `satisfecho.de` to a different backend or stripping paths.
3. Ensure `back/uploads` on the host has the files (tenant and catalog imports write there); see AGENTS.md “Demo tables” and “Catalog on deploy”.
4. **Orphan DB refs:** If `ProviderProduct.image_filename` points at a file that is not on disk, catalog/API used to emit `/uploads/providers/...` URLs that 404. Clear those refs with:
   `docker compose --env-file config.env -f docker-compose.yml -f docker-compose.prod.yml exec back python -m app.seeds.clear_orphan_provider_product_images`
   (Local/dev: `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.seeds.clear_orphan_provider_product_images`.) Catalog and provider list endpoints also omit `image_url` when the file is missing (UI shows the placeholder). Public tenant menu (`GET /public/tenants/{id}/menu`, used by `/delivery/{id}` and `/public-menu/{id}`) likewise omits `image_url` when the file is missing. See [testing.md](testing.md) and [0014-provider-portal.md](0014-provider-portal.md).
5. **Stale `Product.image_filename` after catalog re-import:** Public menu resolves images live from `TenantProduct` / provider files; `/products` stores a path on the `Product` row. After pizza/wine/beer import replaces provider files, old `providers/...` paths on `Product` can 404 while public menu still works. **Repair:** `python -m app.seeds.sync_product_images` (idempotent; never overwrites a custom tenant upload whose file exists). **Deploy:** `scripts/deploy-amvara9.sh` runs sync + `check_product_image_health` after catalog link. Custom uploads (`uploads/{tenant_id}/products/{uuid}.jpg`) are left unchanged when the file is on disk.
6. **Frontend `/api` prefix:** API returns paths like `/uploads/...`. Public menu already prefixes `environment.apiUrl` (`/api`). Delivery checkout must do the same — if `<img src>` is bare `/uploads/...`, HAProxy sends the request to the front container and you get 404 spam without ever hitting the back upload routes (FEAT-312 / #312).
