---
## Closing summary (TOP)

- **What happened:** Tester verified the Settings → Security “Download QR for printing” feature for staff clock-in (issue #155).
- **What was done:** High-res PNG download (`qrcode`, 1200px, testid `settings-download-clock-qr-png`), i18n keys, and regression/smoke runs were confirmed per task; backend clock-qr regenerate/delete calls succeeded during the run.
- **What was tested:** `ng build` in the front container, Puppeteer flow (download + BarcodeDetector decode vs `/my-shift?clock_qr=`), `test:my-shift-clock-qr`, and `test:landing-version` — all **PASS**.
- **Why closed:** All acceptance criteria and test-report items passed; handoff complete.
- **Closed at (UTC):** 2026-04-03 10:21
---

# Settings → Security: download printable staff clock-in QR

## GitHub Issues
- [github.com/satisfecho/pos/issues](https://github.com/satisfecho/pos/issues)
- `gh issue list --repo satisfecho/pos --state open --limit 40`
- Optional: `--json number,title,labels,updatedAt,url`
- **Issue:** https://github.com/satisfecho/pos/issues/155

## Problem / goal
Owners need a **printable** staff clock-in QR from **Settings → Security**, in the **Staff clock-in QR** card. When clock QR is enabled and a valid printable URL exists (full app URL with `/my-shift?clock_qr=` and the current token, aligned with how **SETTINGS.CLOCK_QR_URL_HINT** documents the URL), add UI to **generate a high-resolution QR** (PNG or SVG) and **trigger a browser download** for venue printing. Do not surface the raw token in new places beyond what **regenerate** already exposes. Keep **tenant and role** checks consistent with existing clock-QR settings APIs and UI.

## High-level instructions for coder
- Locate Settings → Security clock-QR card and existing token/URL derivation; reuse the same rules as regenerate and documented hint text.
- Add a **Download QR for printing** (or equivalent) control, enabled only when clock QR is active and a printable payload is available.
- Implement client-side QR generation at sufficient resolution for print (PNG or SVG); trigger download with a sensible filename.
- Respect i18n for new strings (`front/public/i18n/*.json` per project rules).
- Verify only authorized roles can use the control; match backend expectations if any endpoint is involved.
- Smoke: open Settings → Security as owner, enable clock QR if needed, download file, confirm QR decodes to the expected URL pattern.

## Implementation notes (coder)
- **`settings.component.ts`:** Next to **Copy**, **`SETTINGS.CLOCK_QR_DOWNLOAD_PRINT`** button with `data-testid="settings-download-clock-qr-png"`, only when `clockQrLastToken()` and `settings()?.clock_qr_active`. Payload URL: `origin + '/my-shift?clock_qr=' + encodeURIComponent(token)`. PNG via dynamic `import('qrcode')` → `toDataURL` width **1200**, EC level **M**; filename **`staff-clock-in-qr-{tenantId}.png`** (fallback `tenant` if no id).
- **Deps:** `qrcode@1.5.4`, `@types/qrcode@1.5.6` in **`front/package.json`** / lockfile.
- **i18n:** `SETTINGS.CLOCK_QR_DOWNLOAD_PRINT`, `SETTINGS.CLOCK_QR_DOWNLOAD_FAILED` in all **`front/public/i18n/*.json`**.

## Testing instructions
1. **Build:** From `front/`, `npm ci --ignore-scripts` then `npx ng build --configuration=development`. **Docker dev:** Compose uses an anonymous volume for `/app/node_modules` in the `front` service — after lockfile changes run `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec front sh -c "cd /app && npm ci --ignore-scripts"`, then `docker compose … restart front`; if HAProxy returns **503**, `docker compose … restart haproxy`.
2. **Manual:** Log in as a user with **Settings** update (same as clock QR regenerate). Open **Settings → Security**. Click **Generate new token** if needed. When the token block appears, confirm **Download QR for printing** is visible. Click it — browser should download **`staff-clock-in-qr-<id>.png`**. Decode the image (phone camera or QR tool): payload must be **`https?://<host>/my-shift?clock_qr=<token>`** matching the current origin and the shown token.
3. **Regression:** `BASE_URL=http://127.0.0.1:4202 npm run test:my-shift-clock-qr --prefix front` (with owner credentials in env) still passes.
4. **Smoke:** With stack up, `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front`.

---

## Test report

1. **Date/time (UTC) and log window:** 2026-04-03 approx. **10:17–10:21 UTC** (build + Puppeteer runs). Docker logs reviewed with `--since=15m` for `front` and `back` after runs.

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **`BASE_URL`** `http://127.0.0.1:4202` (HAProxy). Branch **`development`**, commit **`d8a2af1`**. Credentials: repo **`.env`** `DEMO_LOGIN_*` mapped to `LOGIN_*` for regression script.

3. **What was tested (from “What to verify” / Testing instructions):** Angular **development** build in the **`front`** container; **Settings → Security** clock-QR card (automated via headless Chrome): regenerate token, **Download QR for printing**, PNG file and payload; **`test:my-shift-clock-qr`**; **`test:landing-version`**.

4. **Results:**
   - **Build (`ng build --configuration=development` in container):** **PASS** — `Application bundle generation complete` (~10.7s), exit 0.
   - **Manual / browser (Settings → Security, download + decode):** **PASS** — Puppeteer: security tab, UI regenerate, `[data-testid="settings-download-clock-qr-png"]` present and clicked; CDP download **`staff-clock-in-qr-1.png`** (36778 bytes); PNG magic bytes OK; **BarcodeDetector** in Chromium decoded QR to `{origin}/my-shift?clock_qr={encodeURIComponent(token)}` matching DOM token. Cleanup: `DELETE /tenant/settings/clock-qr` 200.
   - **Regression `npm run test:my-shift-clock-qr`:** **PASS** — `PASS: My shift clock-QR UI and API check.` (requires `DEMO_LOGIN_EMAIL` / `DEMO_LOGIN_PASSWORD` or `LOGIN_*`; bare `npm run` without mapping **FAIL**s — documented for future runs).
   - **Smoke `npm run test:landing-version`:** **PASS** — `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.` exit 0.

5. **Overall:** **PASS** (all criteria met).

6. **Product owner feedback:** Printable staff clock-in QR from Settings → Security is verified end-to-end: high-res PNG downloads with the expected filename, and the encoded URL matches the documented `/my-shift?clock_qr=` pattern for the current origin and token. Existing clock-QR flows remain green under the dedicated regression test.

7. **URLs tested (numbered):**
   1. `http://127.0.0.1:4202/login?tenant=1`
   2. `http://127.0.0.1:4202/settings` (Security tab — SPA, no separate path)
   3. `http://127.0.0.1:4202/` (landing smoke)
   4. `http://127.0.0.1:4202/dashboard` … through sidebar including `/my-shift`, `/settings`, etc. (landing-version script)

8. **Relevant log excerpts:**
   - **pos-front:** `Application bundle generation complete. [7.713 seconds] - 2026-04-03T10:14:16.711Z` (dev rebuild); separate **`exec front`** run: `Application bundle generation complete. [10.694 seconds] - 2026-04-03T10:17:29.421Z`.
   - **pos-back:** `POST /tenant/settings/clock-qr/regenerate HTTP/1.1" 200 OK`; `DELETE /tenant/settings/clock-qr HTTP/1.1" 200 OK`; `GET /users/me/otp/status HTTP/1.1" 200 OK` (security section).

**GitHub:** Comment posted on **#155** when testing started. Label **`agent:testing`** is **not defined** on the repo (`gh issue edit` failed); could not toggle `agent:wip` / testing labels automatically.
