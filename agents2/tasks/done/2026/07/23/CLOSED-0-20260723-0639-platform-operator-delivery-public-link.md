---
## Closing summary (TOP)

- **What happened:** Platform tenant detail Public pages lacked a deep-link to the shipped Satisfecho Delivery checkout at `/delivery/{tenantId}`.
- **What was done:** Added a Delivery link via `publicUrl('delivery')`, i18n (`LINK_DELIVERY` / `PUBLIC_PAGES_HINT`) in all locales, and documented `/delivery/{id}` in `docs/0015-platform-operator-portal.md`; extended the platform-operator Puppeteer smoke.
- **What was tested:** Seed + Puppeteer login/dashboard and tenant-detail delivery link (href + translated label) PASS; docs and front build PASS (overall PASS).
- **Why closed:** All acceptance criteria and tester report passed; no GitHub issue (`0`).
- **Closed at (UTC):** 2026-07-23 06:48
---

# Platform operator: add Satisfecho Delivery public link

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Platform operators review guest surfaces from **`/platform/tenants/{id}`** (Public pages). That row links to **public menu**, **book**, and **waitlist**, but not to the shipped public Satisfecho Delivery checkout at **`/delivery/{tenantId}`**. Ops cannot open the guest delivery path from the operator UI, and **`docs/0015-platform-operator-portal.md`** still omits delivery in the public-pages list.

## Evidence (008 preflight / review)

- Weekly improvement sweep (2026-07-23): delivery channel + public checkout shipped through **2.1.24** / #302; feature guide **`docs/0053-satisfecho-delivery-order-channel.md`**
- `front/src/app/platform/platform-tenant-detail.component.ts` Public pages: `publicUrl('public-menu'|'book'|'waitlist')` only — no `delivery`
- `PLATFORM_DASHBOARD.PUBLIC_PAGES_HINT` / en.json: “menu, booking, waitlist” — no delivery
- `docs/0015-platform-operator-portal.md` §1 public links list menu / book / waitlist only
- No existing `agents2/tasks/*` covers platform → delivery deep-link (README delivery NEW and WIP-304 are product/checkout scope, not operator UI)

## High-level instructions for coder

- On **`platform-tenant-detail`** Public pages, add a fourth link to `publicUrl('delivery')` with a new i18n key (e.g. `PLATFORM_DASHBOARD.LINK_DELIVERY`) in **all** `front/public/i18n/*.json` locales; update `PUBLIC_PAGES_HINT` to mention delivery
- Optional: one-line delivery shortcut on the dashboard tenants table next to the menu link (keep UI light; detail page is enough if dashboard stays menu-only)
- Update **`docs/0015-platform-operator-portal.md`** (or **`0055-…`** if **`NEW-0-20260722-1310-renumber-0015-platform-operator-doc`** already renamed it): list `/delivery/{id}` under public pages / URLs
- Do **not** change delivery checkout product logic (owned by **WIP-304**)
- Pass/fail: operator opens tenant detail → Delivery link opens `/delivery/{id}` on the same origin; doc lists the route; no raw i18n keys in UI
- Append **Testing instructions** when done (reuse `front/scripts/test-platform-operator.mjs` plus a click/assert on the new link if practical)

## Implementation notes (feature coder)

- Added **Delivery** link on `platform-tenant-detail` Public pages → `publicUrl('delivery')` (`/delivery/{id}`).
- New i18n key `PLATFORM_DASHBOARD.LINK_DELIVERY` + updated `PUBLIC_PAGES_HINT` in all 9 `front/public/i18n/*.json` locales.
- Updated `docs/0015-platform-operator-portal.md` §1 and §2 URL table (waitlist + delivery).
- Dashboard tenants table left menu-only (optional shortcut skipped).
- Extended `front/scripts/test-platform-operator.mjs` to open first tenant detail and assert delivery link href + translated label.
- No GitHub issue (enhancement reviewer / issue `0`) — no `gh` label or comment.

## Testing instructions

1. **Seed operator (if needed):**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T \
     -e PLATFORM_OPERATOR_EMAIL=platform-test@amvara.de \
     -e PLATFORM_OPERATOR_PASSWORD=test-platform-ops-123 \
     back python -m app.seeds.ensure_platform_operator
   ```
2. **Puppeteer (required):**
   ```bash
   BASE_URL=http://127.0.0.1:4202 node front/scripts/test-platform-operator.mjs
   ```
   Expect: `OK: platform operator login and dashboard` and `OK: tenant detail delivery link → …/delivery/{id}`.
3. **Manual (optional):** Log in at `/platform/login` → open a tenant → Public pages → **Delivery** opens `/delivery/{id}` in a new tab; label is translated (not `LINK_DELIVERY`).
4. **Docs:** Confirm `docs/0015-platform-operator-portal.md` lists `/delivery/{id}` under public pages and the URL table.
5. **Front build:** `docker logs --since 10m pos-front` should show successful bundle generation with no TS/NG errors from this change.

## Test report

1. **Date/time (UTC):** 2026-07-23 06:46:39 start → 06:47:23 end. Log window: `docker logs --since 10m` (front) / `--since 5m` (back).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `854b6524`; HEADLESS=1.
3. **What was tested:** Platform operator login/dashboard; tenant detail Public pages Delivery link (`href` + translated label); docs list `/delivery/{id}`; front bundle healthy.
4. **Results:**
   - Seed platform operator — **PASS** — `Updated platform operator: platform-test@amvara.de`
   - Puppeteer login + dashboard — **PASS** — `OK: platform operator login and dashboard`
   - Tenant detail delivery link — **PASS** — `OK: tenant detail delivery link → http://127.0.0.1:4202/delivery/3018`
   - Docs `0015` public pages + URL table — **PASS** — `/delivery/{id}` listed in §1 and Guest delivery checkout row in §2
   - Front build — **PASS** — repeated `Application bundle generation complete`; no TS/NG errors (only pre-existing NG8107 optional-chain warnings)
5. **Overall:** **PASS**
6. **Product owner feedback:** Operators can open Satisfecho Delivery from tenant detail the same way as menu/book/waitlist. Smoke covers the deep-link and i18n label; docs match the shipped public route. Ready to close.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/platform/login`
   2. `http://127.0.0.1:4202/platform`
   3. `http://127.0.0.1:4202/platform/tenants/3018` (delivery link asserted → `/delivery/3018`)
8. **Relevant log excerpts:**
   ```
   pos-back: POST /token?scope=platform → 200 OK
   pos-back: GET /platform/me → 200 OK
   pos-back: GET /platform/tenants → 200 OK
   pos-back: GET /platform/tenants/3018 → 200 OK
   pos-front: Application bundle generation complete. [0.018 seconds]
   ```
   No GitHub issue (`0`) — skipped `gh` labels/comments.

