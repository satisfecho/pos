# Careers / Trabaja con nosotros (#447, #448)

Owner-togglable public careers page so candidates can leave contact details and an optional CV. Applications are **encrypted at rest** (Fernet) and visible to the **tenant owner only**.

Spam protection (#448): candidates must confirm a **six-digit email code** before any application row or CV file is stored.

## Owner settings

In **Settings** (tenant):

- Enable **Careers / Work with us** (default off)
- Optional **Why work here** text
- **Retention days** (30–730, default **180**): applications auto-delete after this window; the public form tells applicants they can re-apply later

## Public URL

| Use | Path |
|-----|------|
| By tenant id | `/careers/{tenantId}` |
| API config | `GET /public/tenants/{id\|slug}/careers` |
| Request code | `POST /public/tenants/{id\|slug}/careers/applications/request-code` JSON `{email}` |
| Confirm code | `POST /public/tenants/{id\|slug}/careers/applications/confirm-code` JSON `{email, code}` → `{submit_token}` |
| Submit (multipart) | `POST /public/tenants/{id\|slug}/careers/applications` (requires `submit_token` form field) |

Nav link **Careers** appears on public guest chrome when the feature is enabled.

Form flow: name, email, phone, short message, optional CV → **send code** → enter 6-digit code → submit. CV stays in the browser until submit; challenges expire (~30 min for the code, ~15 min for `submit_token`). Rate limits: code requests and submissions per IP (`RATE_LIMIT_CAREERS_CODE_PER_HOUR`, `RATE_LIMIT_CAREERS_PER_HOUR`).

Local/dev: when SMTP is not configured and `PRODUCTION` is false, `request-code` may include `dev_code` for smoke tests. Optional `CAREERS_FIXED_CODE` (or `OWNER_SIGNUP_FIXED_CODE`) forces a known code in non-production.

## Owner staff UI

Route: `/staff/careers` (owner only).

- List applications (decrypted for display)
- Status: new / contacted / closed
- Download CV (decrypt on the fly; static `/uploads/.../careers/` is blocked)
- Delete application
- **Email all candidates** when a role opens (asks them to update CV if interested; uses tenant SMTP)

## Encryption

- PII JSON and CV file bytes use Fernet (`back/app/careers_crypto.py`)
- Optional env **`CAREERS_ENCRYPTION_KEY`**; otherwise derived from **`SECRET_KEY`** + `:careers_fernet_v1`
- Do not log CV payloads or decrypted PII

## Uploads permissions

CV files land under **`back/uploads/{tenant_id}/careers/`** (bind-mounted into the back container). The back service runs as **`DOCKER_UID`/`DOCKER_GID`** (default **1000:1000**). That tree must be writable by that user, or CV upload returns **503** (`Permission denied` when creating `careers/`).

```bash
# Local fix when uploads were created as root:
sudo chown -R "${DOCKER_UID:-1000}:${DOCKER_GID:-1000}" back/uploads
```

## Retention

Expired rows are purged when the owner lists applications or a new application is submitted for that tenant.

## Smoke

```bash
# Enable for tenant 1 (owner settings UI) then:
curl -s http://127.0.0.1:4202/api/public/tenants/1/careers
BASE_URL=http://127.0.0.1:4202 node front/scripts/test-careers-public.mjs
```
