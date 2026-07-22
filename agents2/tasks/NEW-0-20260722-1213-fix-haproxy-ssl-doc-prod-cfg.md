# Fix docs/0026 to reference haproxy.prod.cfg

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`docs/0026-haproxy-ssl-amvara9.md`** tells operators that production SSL bind lives in **`haproxy/haproxy.cfg`**, but local/dev uses `haproxy.cfg` (no HTTPS) and production mounts **`haproxy.prod.cfg`**. Wrong filename sends ops/agents to the wrong file when restoring certs or debugging 443.

## Evidence (008 preflight / review)

- `stale_doc path=docs/0026-haproxy-ssl-amvara9.md age_days=126`
- `SIGNAL docs_stale count=14` — **edit 0026 only**; no bulk docs rewrite
- Doc §3 and summary table say **`haproxy.cfg`** for `bind *:443 ssl crt /etc/haproxy/certs`
- Repo truth: SSL bind is in **`haproxy/haproxy.prod.cfg`**; `haproxy/README.md` already documents the split; `haproxy.cfg` is HTTP-only for docker-compose.dev

## High-level instructions for coder

- In **`docs/0026-haproxy-ssl-amvara9.md`**, replace incorrect **`haproxy.cfg`** references for the SSL bind with **`haproxy.prod.cfg`**
- Add one sentence clarifying: **dev** = `haproxy.cfg` (no certs); **prod/amvara9** = `haproxy.prod.cfg` + cert mount
- Cross-check against `haproxy/README.md` and `docker-compose.prod.yml` volume/config — do not invent new deploy steps
- Pass criteria: searching 0026 for SSL bind points only at `haproxy.prod.cfg`; no other stale docs edited
