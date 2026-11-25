---
## Closing summary (TOP)

- **What happened:** Careers / Trabaja con nosotros MVP for #447 was implemented (public apply, encrypted PII/CV, owner staff list) and retested after an i18n/upload fix.
- **What was done:** Tenant careers settings, public `/careers/:tenantId` + APIs, Fernet encryption, retention, owner `/staff/careers`, i18n, migration, docs, crypto unit tests, and smoke script; coder fixed `{{days}}` interpolation and uploads ownership/503.
- **What was tested:** Tester PASS (2026-11-24T14:54:02Z): migration/crypto, retention copy shows 180 days, CV encrypt/upload/download, apply without CV, owner API, static upload deny, front build clean.
- **Why closed:** All pass/fail criteria met; product owner feedback ready for closing.
- **Closed at (UTC):** 2026-11-24 14:55
---

# Trabaja con nosotros (careers / CV intake) (#447)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/447
- **447**

## Status
- **CLOSED** - tester PASS (2026-11-24T14:54:02Z)
- Human decisions applied (2026-11-24 issue reply)

## Human decisions (issue comment 2026-11-24)
1. **A** - Build MVP (toggle, public page, CV intake, staff list + email)
2. **A** - Name, email, phone, short message, optional CV file
3. **B** - Encrypt CV file contents at rest (Fernet / dedicated key)
4. **B** - Application-level encryption for careers PII
5. **B** - Auto-delete after N days (default **180**); inform applicant; re-apply OK
6. **C** - Owner only
7. **D** - Email all candidates requesting CV update when a role opens

## Problem / goal
Restaurants need a public **Work with us** / **Trabaja con nosotros** flow so candidates can learn why to join and leave a CV.

## What was implemented
- Tenant settings: `careers_enabled`, `careers_why_text`, `careers_retention_days` (Settings UI + API)
- Public `/careers/:tenantId` + `GET/POST /public/tenants/{ref}/careers…`
- Encrypted PII + CV (`careers_crypto.py`); static upload path denied
- Owner `/staff/careers`: list, status, CV download, delete, notify-all email
- i18n EN/ES/DE/CA (+ other locales filled from EN); docs `docs/0091-careers-trabaja-con-nosotros.md`
- Migration `20261124143000_careers_applications.sql`
- Unit tests `back/tests/test_careers_crypto.py`; smoke script `front/scripts/test-careers-public.mjs`

## Coder fix (2026-11-24 after tester FAIL)
1. **i18n** - `CAREERS.RETENTION_NOTICE` / `CAREERS.THANK_YOU_BODY` now use ngx-translate `{{days}}` in all `front/public/i18n/*.json` (was single `{days}`).
2. **CV upload** - Host `back/uploads` was root-owned while back runs as uid 1000; `chown -R 1000:1000 back/uploads` so `careers/` can be created. `_careers_dir` now returns **503** with a clear message if mkdir fails. Docs note in `docs/0091-careers-trabaja-con-nosotros.md`.
3. **Local verify** - `POST …/careers/applications` with CV → **200** `has_cv=True`; file under `uploads/1/careers/*.bin`; served `/i18n/en.json` shows `{{days}}`.

## Testing instructions

### What to verify
- Retention / thank-you copy shows the number of days (e.g. **180**), not the literal `{days}` or `{{days}}`.
- Optional CV upload succeeds (HTTP 200) and creates an encrypted file under `back/uploads/{tenant}/careers/`.
- Prior PASS items still hold: public apply without CV, Fernet PII, owner list/status, front build clean.

### How to test

1. **Migration / crypto**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.migrate --check
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest tests/test_careers_crypto.py -q
   ```

2. **i18n interpolation** (public page; HAProxy port from `docker compose ps`, often `14202`):
   ```bash
   curl -s "http://127.0.0.1:14202/i18n/en.json" | python3 -c "import sys,json; c=json.load(sys.stdin)['CAREERS']; print(c['RETENTION_NOTICE']); print(c['THANK_YOU_BODY'])"
   # Expect {{days}} in JSON strings.
   # Browser: open /careers/1 — retention notice must show "180" (or configured days), not "{days}".
   ```

3. **CV upload**
   ```bash
   printf '%%PDF-1.4 test\n' > /tmp/careers-smoke.pdf
   curl -s -w "\nHTTP %{http_code}\n" -X POST "http://127.0.0.1:14202/api/public/tenants/1/careers/applications" \
     -F "name=CV Retest" -F "email=careers.retest@amvara.de" \
     -F "phone=+34600111444" -F "message=retest" \
     -F "cv=@/tmp/careers-smoke.pdf;type=application/pdf"
   # Expect {"ok":true,"id":…} HTTP 200. ls back/uploads/1/careers/ should show a new .bin.
   # If 503: fix ownership — sudo chown -R 1000:1000 back/uploads (see docs/0091).
   ```

4. **Owner UI:** login as owner → `/staff/careers` — new row with CV; download works.

5. **Front build:** `docker logs --since 10m pos-front` — no ERROR / bundle failed.

6. **Optional Puppeteer:**
   ```bash
   BASE_URL=http://127.0.0.1:14202 REQUIRE_ENABLED=1 node front/scripts/test-careers-public.mjs
   ```

### Pass/fail criteria
- **PASS** if retention/thank-you show interpolated day count; CV POST returns 200 and stores encrypted blob; crypto tests pass; no front build errors.
- **FAIL** if `{days}` still visible in UI, or CV upload 500/503 without a documented ownership fix path working after chown.

## Previous test report (2026-11-24) — FAIL (fixed above)

Failed: (4) `{days}` literal; (7) CV PermissionError on `/app/uploads/1/careers`. See prior log excerpts in git history of this task if needed.


## Test report

1. **Date/time (UTC):** 2026-11-24T14:49:58Z start - 2026-11-24T14:54:02Z end. Log window: ~14:47-14:54 UTC.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; HAProxy `http://127.0.0.1:14202`; branch `development`.
3. **What was tested:** Migration/crypto; i18n `{{days}}` + rendered retention copy; CV upload + encrypted blob; apply without CV; Fernet PII; owner list/status/CV download; static upload deny; front build logs. Optional Puppeteer script skipped (host Chrome/snap broken; `node_modules` only in front container volume) - UI check via `cometa/chrome` headless dump-dom instead.
4. **Results:**
   - (1) Migration `20261124143000_careers_applications.sql` applied / `--check` up to date - **PASS**
   - (2) `pytest tests/test_careers_crypto.py` - 3 passed - **PASS**
   - (3) `/i18n/en.json` CAREERS.RETENTION_NOTICE / THANK_YOU_BODY contain `{{days}}` - **PASS**
   - (4) Browser `/careers/1` shows "kept for **180** days" (no `{days}` / `{{days}}` literal); form `data-testid=careers-form` present - **PASS**
   - (5) POST application with CV → HTTP 200 `id=5`; new `.bin` under `back/uploads/1/careers/` - **PASS**
   - (6) POST without CV → HTTP 200 `id=6` - **PASS**
   - (7) DB PII ciphertext not plaintext; `decrypt_careers_pii` yields emails - **PASS**
   - (8) Owner `GET/PATCH /api/tenant/careers/applications` + CV download decrypts to `%PDF-1.4 test` - **PASS** (API; no DEMO_LOGIN_* in env for browser `/staff/careers`)
   - (9) `GET /uploads/1/careers/*.bin` → 404 - **PASS**
   - (10) Front logs: bundle generation complete; no ERROR / bundle failed (only unrelated NG8107 warnings on menu) - **PASS**
5. **Overall:** **PASS**
6. **Product owner feedback:** Careers retest looks good: retention copy interpolates 180 days, CV files encrypt at rest, and owner download returns the original PDF bytes. Public apply works with or without a CV. Ready for closing review.
7. **URLs tested:**
   1. http://127.0.0.1:14202/careers/1
   2. http://127.0.0.1:14202/i18n/en.json
   3. http://127.0.0.1:14202/api/public/tenants/1/careers
   4. http://127.0.0.1:14202/api/public/tenants/1/careers/applications (POST)
   5. http://127.0.0.1:14202/api/tenant/careers/applications
   6. http://127.0.0.1:14202/api/tenant/careers/applications/5/cv
   7. http://127.0.0.1:14202/uploads/1/careers/b350ac3b0ec3438faaf3cd4fa4c9cb1a.bin
8. **Relevant log excerpts:**
```
careers: application created tenant_id=1 id=5 has_cv=True
POST /public/tenants/1/careers/applications HTTP/1.1" 200 OK
careers: application created tenant_id=1 id=6 has_cv=False
GET /tenant/careers/applications HTTP/1.1" 200 OK
GET /tenant/careers/applications/5/cv HTTP/1.1" 200 OK
PATCH /tenant/careers/applications/5 HTTP/1.1" 200 OK
Application bundle generation complete. [0.014 seconds] - 2026-11-24T14:52:20.874Z
DOM notice: Your data is kept for 180 days, then deleted automatically. You can apply again later.
```
