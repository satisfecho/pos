---
## Closing summary (TOP)

- **What happened:** Screenshot capture and docs still covered only classic staff pages; Jul surfaces (delivery, waitlist, courier, platform) had no PNGs or README entries.
- **What was done:** Extended `capture-screenshots.mjs` for public delivery/waitlist plus optional courier/platform captures; updated `docs/screenshots/README.md` and produced the new PNGs (platform optional when env set).
- **What was tested:** Header/README docs checks and two capture runs (with and without optional creds) on local 4202 — overall **PASS**; skips clean when creds unset.
- **Why closed:** All pass/fail criteria met; tester reported overall PASS.
- **Closed at (UTC):** 2026-07-26 00:29
---

# Extend screenshots capture for Jul product surfaces

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`front/scripts/capture-screenshots.mjs`** and **`docs/screenshots/README.md`** still cover only classic staff pages (dashboard, orders, kitchen, reports, reservations, tables, menu, provider). Shipped Jul surfaces — public Satisfecho Delivery, courier portal, waiting list, platform operator — have no PNGs and no README entries, so root/feature docs cannot link visuals and marketers/operators keep using stale collage.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T18:42Z: docs-vs-code follow-on after SIGNAL docs/changelog owned; not a bulk `docs/*.md` rewrite
- `capture-screenshots.mjs` paths: `/dashboard`, `/staff/orders`, `/kitchen`, `/reports`, `/reservations`, `/tables`, `/menu/{token}`, optional `/provider` — no `/delivery`, `/courier`, `/waitlist`, `/platform`
- `docs/screenshots/` on disk: dashboard/orders/kitchen/reports/reservations/tables/menu/provider (+ `reports-review.png`); README file reference matches that set
- Sibling **`NEW-0-20260723-1833-retire-or-document-one-off-puppeteer-scripts`** owns orphan one-offs only — do **not** merge; this task extends the durable capture script + index

## High-level instructions for coder

- Extend **`capture-screenshots.mjs`** to capture at least: public `/delivery/{tenantId}` (default tenant 1), public `/waitlist/{tenantId}`, and one courier surface if `COURIER_TEST_EMAIL`/`COURIER_TEST_PASSWORD` (or existing courier env) is set; optional platform operator page if platform env already documented
- Add PNG filenames under **`docs/screenshots/`** and short sections + file-reference rows in **`docs/screenshots/README.md`** (link `docs/0053`, `docs/0011` waiting-list, `docs/0015-platform-operator-portal.md` as applicable)
- Keep captures optional/skippable when credentials or routes are unavailable (same style as provider skip)
- Do not invent new product flows; do not replace existing classic screenshots unless regenerating them in the same run
- Pass/fail: script documents new env vars in header; README lists new files; a dry run with staff login produces or clearly skips each new target without crashing

## Implementation notes (coder)

- Extended `front/scripts/capture-screenshots.mjs`: public `delivery.png` + `waitlist.png` via `TENANT_ID` (default 1); optional `courier.png` (`COURIER_EMAIL`/`COURIER_PASSWORD` or `COURIER_TEST_*`); optional `platform.png` (`PLATFORM_OPERATOR_*`); skips with clear logs on missing creds / login failure
- Updated `docs/screenshots/README.md` sections + file-reference rows (links to 0053, 0011 waiting list, 0015 platform)
- Dry-run on local `BASE_URL=http://127.0.0.1:4202` produced `delivery.png`, `waitlist.png`, `courier.png`; platform skipped (no `PLATFORM_OPERATOR_*` in env)

## Testing instructions

### What to verify

1. Script header documents `TENANT_ID`, courier env aliases, and platform operator env.
2. README lists `delivery.png`, `waitlist.png`, `courier.png`, `platform.png` with feature-doc links.
3. A capture run with staff login succeeds: public surfaces save PNGs (or skip with a clear message); courier/platform skip cleanly when credentials are unset; no crash.

### How to test

```bash
# From repo root; app on 4202
BASE_URL=http://127.0.0.1:4202 \
  LOGIN_EMAIL=… LOGIN_PASSWORD=… \
  COURIER_EMAIL and COURIER_PASSWORD from the environment \
  node front/scripts/capture-screenshots.mjs

# Optional platform (when seeded):
# PLATFORM_OPERATOR_EMAIL=… PLATFORM_OPERATOR_PASSWORD=… …

rg -n 'TENANT_ID|COURIER_|PLATFORM_OPERATOR|delivery\.png|waitlist\.png' \
  front/scripts/capture-screenshots.mjs docs/screenshots/README.md

ls -la docs/screenshots/{delivery,waitlist,courier}.png
```

### Pass/fail criteria

- **Pass:** Header + README mention new env vars and files; dry run exits 0; delivery/waitlist PNGs exist after a successful public capture; courier/platform either saved or logged as skipped without aborting.
- **Fail:** Script crashes on missing optional creds, or README/script omit the Jul surfaces.

## Test report

1. **Date/time (UTC):** 2026-07-26 00:27:25 start → 00:29:27 end. Log window: `2026-07-26T00:27:00Z` onward (`pos-front`, `pos-back`, `pos-haproxy`).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` (synced via `./scripts/git-sync-development.sh`). App health: `GET /` → 200.
3. **What was tested:** Script header env docs (`TENANT_ID`, courier aliases, platform operator); README Jul sections + file-reference rows; capture run with staff login (public delivery/waitlist + optional courier/platform); second run with courier/platform env unset to confirm skip-without-crash.
4. **Results:**
   - Script header documents `TENANT_ID`, `COURIER_EMAIL`/`COURIER_TEST_*`, `PLATFORM_OPERATOR_*` — **PASS** (`rg` hits lines 15–21 in `capture-screenshots.mjs`).
   - README lists `delivery.png`, `waitlist.png`, `courier.png`, `platform.png` with links to 0053 / 0011 waiting list / 0015 platform — **PASS** (sections + file-reference table).
   - Capture with staff + courier (+ platform from env) exits 0; saves `delivery.png`, `waitlist.png`, `courier.png`, `platform.png` — **PASS** (exit 0 at 00:28:20Z; files present under `docs/screenshots/`).
   - Optional portals skip cleanly when creds unset — **PASS** (second run logged `Skipping courier…` / `Skipping platform…` then `Done.` without abort).
5. **Overall:** **PASS**
6. **Product owner feedback:** Jul product surfaces are now in the durable screenshot pipeline and indexed for docs. Public delivery/waitlist capture needs no extra credentials; courier and platform remain optional with clear skip messages. Marketers can link real PNGs instead of the stale classic-only collage.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/` (health)
   2. `http://127.0.0.1:4202/login` (staff)
   3. `http://127.0.0.1:4202/dashboard`
   4. `http://127.0.0.1:4202/staff/orders`
   5. `http://127.0.0.1:4202/kitchen`
   6. `http://127.0.0.1:4202/reports`
   7. `http://127.0.0.1:4202/reservations`
   8. `http://127.0.0.1:4202/tables`
   9. `http://127.0.0.1:4202/menu/{token}`
   10. `http://127.0.0.1:4202/delivery/1`
   11. `http://127.0.0.1:4202/waitlist/1`
   12. `http://127.0.0.1:4202/provider` (provider login when env set)
   13. `http://127.0.0.1:4202/courier/login` → `/courier`
   14. `http://127.0.0.1:4202/platform` (platform operator login when env set)
8. **Relevant log excerpts:**
   - Capture (with optional creds): `saved: delivery.png` / `saved: waitlist.png` / `saved: courier.png` / `saved: platform.png` / `Done.` exit 0.
   - Capture (optional unset): `Skipping courier (set COURIER_EMAIL/COURIER_PASSWORD or COURIER_TEST_* to capture)` / `Skipping platform (set PLATFORM_OPERATOR_EMAIL and PLATFORM_OPERATOR_PASSWORD to capture)` / `Done.`
   - `pos-front`: no TS/NG/build errors in window.
   - `pos-haproxy` (platform capture): `GET /api/platform/me` 200, `GET /api/platform/metrics` 200, `GET /api/platform/tenants` 200.
