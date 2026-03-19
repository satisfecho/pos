# HAProxy SSL certificates

- **`default.pem`** — Self-signed certificate (CN=localhost, 10 years). Used by the base `docker-compose.yml` so HAProxy can bind 443 without a real certificate. Browsers will show a security warning; accept it for local/dev use.
- **Production**: Use `docker-compose.prod.yml`; it mounts `./certbot/haproxy-certs` over this directory so HAProxy uses your Let's Encrypt (or other) PEM instead. See `certbot/README.md` and `docs/0026-haproxy-ssl-amvara9.md`.

To regenerate the self-signed cert (optional):

```bash
cd haproxy/certs
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1" \
  -out cert.pem -keyout key.pem
cat cert.pem key.pem > default.pem
rm cert.pem key.pem
```
