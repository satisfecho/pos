# HAProxy SSL certificates (legacy / alternative path)

**On amvara9 the production path is `certbot/haproxy-certs/`, not `certs/`.** The compose file mounts `./certbot/haproxy-certs` into HAProxy. Use **certbot/README.md** for the actual workflow (certbot webroot, combined PEM, `kill -HUP 1` reload).

If you prefer to use this `certs/` directory instead, you would need to change docker-compose.prod.yml to mount `./certs` and put your combined PEM here. For amvara9 and the documented certbot flow, use **certbot/haproxy-certs**. See **docs/0026-haproxy-ssl-amvara9.md** for full setup.
