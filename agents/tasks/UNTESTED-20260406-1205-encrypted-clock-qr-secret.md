# Encrypted clock QR secret + persistent download in Settings

## GitHub Issues
- [github.com/satisfecho/pos/issues](https://github.com/satisfecho/pos/issues)
- `gh issue list --repo satisfecho/pos --state open --limit 40`
- Optional: `--json number,title,labels,updatedAt,url`
- **Issue:** https://github.com/satisfecho/pos/issues/167

## Problem / goal
Implement an encrypted clock QR secret and allow persistent download of this secret in the Settings section.

## High-level instructions for coder
- Investigate how to securely store and manage a QR secret for clocking in.
- Implement functionality to generate and encrypt this secret.
- Add a feature in the Settings UI to allow users to download this secret persistently.
- Ensure security best practices are followed for handling sensitive secrets.

## Implementation notes (coder)
- **DB:** `tenant.clock_qr_token_encrypted` (TEXT), migration `20260406140000_tenant_clock_qr_token_encrypted.sql`.
- **Crypto:** Fernet with key derived from `SECRET_KEY` + domain string (`clock_qr_util.py`); verification unchanged (HMAC hash).
- **API:** `POST /tenant/settings/clock-qr/regenerate` stores hash + ciphertext; `GET /tenant/settings/clock-qr/token` returns plain token (SETTINGS_UPDATE); legacy hash-only → 409 `clock_qr_regenerate_required`; `GET/PUT /tenant/settings` expose `clock_qr_downloadable`.
- **Front:** Settings → Security loads token via GET when `clock_qr_active && clock_qr_downloadable`; legacy tenants see hint to regenerate.

## Testing instructions

### What to verify
- After **Generate new token**, reload Settings → Security: token text, copy, and **Download QR for printing** still work.
- **Legacy** tenant (hash only, no ciphertext): hint appears; **Generate new token** fixes downloadable state.
- API: `GET /tenant/settings/clock-qr/token` returns same token as last regenerate for authorized admin.

### How to test
- **Migrate:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.migrate`
- **Backend:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest tests/test_work_session.py -q`
- **Smoke:** `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version`
- **Manual:** Settings → Security → Staff clock-in QR: regenerate, confirm URL/download, hard-refresh page, confirm token + download still available.

### Pass/fail criteria
- Pass: migrations apply; pytest `test_work_session` green; landing smoke test OK; manual reload still shows token and PNG download when QR was regenerated after this change.
- Fail: 500 on GET token, token missing after reload for new regenerations, or QR download broken.
