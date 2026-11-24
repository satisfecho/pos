# Careers / Trabaja con nosotros (#447)

Owner-togglable public careers page so candidates can leave contact details and an optional CV. Applications are **encrypted at rest** (Fernet) and visible to the **tenant owner only**.

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
| Submit (multipart) | `POST /public/tenants/{id\|slug}/careers/applications` |

Nav link **Careers** appears on public guest chrome when the feature is enabled.

Form fields: name, email, phone, short message, optional CV (PDF/Word, max 5 MB).

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
