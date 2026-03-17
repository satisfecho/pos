# HAProxy SSL on amvara9 (durable configuration)

SSL for satisfecho.de is terminated by HAProxy in the POS stack. This document explains how the certificate is integrated so it **survives deploy and rebuilds**, and how to restore it if it was lost.

## Why the certificate can disappear

- **Deploy** runs `git fetch` and `git reset --hard origin/master` in `/development/pos`, then `docker compose down` and `docker compose up --build -d`.
- Anything that was only inside the repo or only in a container is wiped or recreated. If the certificate was:
  - stored inside the repo (and not gitignored), it would be overwritten by `git reset` if it was ever committed, or lost if it was untracked and someone ran `git clean`;
  - stored only in a container filesystem, it is lost on `down` / new image.
- So the certificate must live **on the host** in a path that is **not overwritten by deploy** and is **mounted into HAProxy** every time.

## Durable setup (current)

1. **Host directory**  
   The combined PEM used by HAProxy lives in **`/development/pos/certbot/haproxy-certs/`** (e.g. `satisfecho.de.pem`). This matches the path used on amvara9 for certbot.  
   - `certbot/www/` is the webroot for `certbot certonly --webroot -w /development/pos/certbot/www`.  
   - `certbot/haproxy-certs/` is **not** removed by `git reset --hard`; `*.pem` there are in **.gitignore**, so certs survive deploy.

2. **Compose**  
   In **docker-compose.prod.yml**, HAProxy has:
   ```yaml
   volumes:
     - ./certbot/haproxy-certs:/etc/haproxy/certs:ro
   ```
   So whatever is in `./certbot/haproxy-certs` on the host is visible read-only in the container at `/etc/haproxy/certs`.

3. **HAProxy config**  
   In **haproxy/haproxy.cfg**, 443 is bound with:
   ```text
   bind *:443 ssl crt /etc/haproxy/certs
   ```
   HAProxy loads all `.pem` files from that directory. At least one valid PEM (certificate + private key) must be present or HAProxy will not start.

4. **Deploy script**  
   **scripts/deploy-amvara9.sh** runs `mkdir -p certbot/www certbot/haproxy-certs` before `docker compose up`. It does **not** delete or overwrite files in `certbot/haproxy-certs/`.

So: **certificate stays on the host in `./certbot/haproxy-certs`; deploy never touches it; HAProxy always uses it from the mount.** That is the durable integration.

**Note:** HAProxy needs at least one `.pem` file in `certbot/haproxy-certs/` to start (it binds 443 with `ssl crt`). If you deploy before the combined PEM exists, HAProxy will fail to start. Run the certbot + cat steps (see certbot/README.md) and re-run deploy or restart HAProxy.

## Where the certificate lives on amvara9

On amvara9 the certs were created like this:

```bash
certbot certonly --webroot -w /development/pos/certbot/www -d satisfecho.de -d www.satisfecho.de
cat /etc/letsencrypt/live/satisfecho.de/fullchain.pem \
    /etc/letsencrypt/live/satisfecho.de/privkey.pem \
    > /development/pos/certbot/haproxy-certs/satisfecho.de.pem
docker exec pos-haproxy kill -HUP 1
```

The durable setup uses **the same path** `./certbot/haproxy-certs`, so if `satisfecho.de.pem` is already there, HAProxy will use it after deploy. If it was lost, check:

- **Let's Encrypt** — `/etc/letsencrypt/live/satisfecho.de/` (fullchain.pem + privkey.pem); combine and write to `certbot/haproxy-certs/satisfecho.de.pem`.
- **Old path** — `/development/pos/certbot/haproxy-certs/` (might still be there if not wiped).

## Restoring or renewing the certificate

### If Let's Encrypt files still exist on the server

```bash
ssh amvara9
cd /development/pos
mkdir -p certbot/haproxy-certs
sudo cat /etc/letsencrypt/live/satisfecho.de/fullchain.pem \
        /etc/letsencrypt/live/satisfecho.de/privkey.pem \
        > certbot/haproxy-certs/satisfecho.de.pem
sudo chown "$(whoami):$(whoami)" certbot/haproxy-certs/satisfecho.de.pem
chmod 600 certbot/haproxy-certs/satisfecho.de.pem
docker exec pos-haproxy kill -HUP 1
# Or full restart: docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d haproxy
```

### Full create/renew workflow (amvara9)

```bash
certbot certonly --webroot -w /development/pos/certbot/www -d satisfecho.de -d www.satisfecho.de
cat /etc/letsencrypt/live/satisfecho.de/fullchain.pem \
    /etc/letsencrypt/live/satisfecho.de/privkey.pem \
    > /development/pos/certbot/haproxy-certs/satisfecho.de.pem
docker exec pos-haproxy kill -HUP 1
```

### If you have a backup of the combined PEM

Copy it to `certbot/haproxy-certs/` on the server, then reload HAProxy as above.

After placing at least one `.pem` in `certbot/haproxy-certs/`, reload or restart HAProxy; the durable setup uses that directory and SSL will work again.

## Summary

| Item | Purpose |
|------|--------|
| **Webroot** | `/development/pos/certbot/www` – for `certbot certonly --webroot -w ...` |
| **Host path for PEM** | `/development/pos/certbot/haproxy-certs/` (e.g. satisfecho.de.pem) – not wiped by deploy |
| **.gitignore** | `certbot/www/`, `certbot/haproxy-certs/*.pem` – certs never committed |
| **Compose** | `./certbot/haproxy-certs` → `/etc/haproxy/certs:ro` in HAProxy |
| **haproxy.cfg** | `bind *:443 ssl crt /etc/haproxy/certs` |
| **Deploy script** | `mkdir -p certbot/www certbot/haproxy-certs`; does not delete or overwrite certs |
| **Reload** | `docker exec pos-haproxy kill -HUP 1` after updating the PEM (no downtime) |

With this, the certificate is stored on the host in `certbot/haproxy-certs` (same path you used on amvara9), survives `git reset` and rebuilds, and is mounted into HAProxy on every start. Reload with `kill -HUP 1` after renewing.
