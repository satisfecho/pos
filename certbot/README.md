# Certbot and HAProxy SSL (production)

This directory is used for Let's Encrypt (certbot) and the combined PEM that HAProxy loads. It is **not** fully in git (`certbot/www/` and `certbot/haproxy-certs/*.pem` are ignored), so it **survives deploy** and is not overwritten by `git reset` or rebuilds.

## Layout

- **`certbot/www/`** — Webroot for `certbot certonly --webroot`. Your HTTP server must serve `/.well-known/acme-challenge/` from this path (HAProxy or front must route that path here; see docs).
- **`certbot/haproxy-certs/`** — Combined PEM file(s) for HAProxy. Mounted read-only into the container at `/etc/haproxy/certs`. HAProxy loads all `.pem` files from this directory for `bind *:443 ssl crt /etc/haproxy/certs`.

## Create/renew certificate (amvara9)

```bash
# 1. Obtain or renew certificate (webroot must be served at /.well-known/acme-challenge/)
certbot certonly --webroot -w /development/pos/certbot/www -d satisfecho.de -d www.satisfecho.de

# 2. Combine fullchain + privkey for HAProxy
cat /etc/letsencrypt/live/satisfecho.de/fullchain.pem \
    /etc/letsencrypt/live/satisfecho.de/privkey.pem \
    > /development/pos/certbot/haproxy-certs/satisfecho.de.pem

# 3. Reload HAProxy so it picks up the new cert (no downtime)
docker exec pos-haproxy kill -HUP 1
```

## After deploy

Deploy runs `mkdir -p certbot/www certbot/haproxy-certs` and mounts `certbot/haproxy-certs` into HAProxy. If `satisfecho.de.pem` already exists on the host (e.g. from the steps above), HAProxy will use it. No need to copy certs elsewhere. **Without the prod override**, base compose uses the self-signed cert in `haproxy/certs/` so 443 still works (dev only).

See **docs/0026-haproxy-ssl-amvara9.md** for full context and restore steps.
