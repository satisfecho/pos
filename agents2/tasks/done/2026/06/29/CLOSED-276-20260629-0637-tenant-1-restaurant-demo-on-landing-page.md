---
## Closing summary (TOP)

- **What happened:** Product owner requested the public landing page show only tenant id 1, labeled "Restaurant Demo", instead of listing all tenants.
- **What was done:** Landing component filters `getPublicTenants()` to tenant 1 only; display name uses i18n key `LANDING.RESTAURANT_DEMO_NAME` across all locale files; Puppeteer smoke test asserts exactly one demo card.
- **What was tested:** All seven verification criteria passed on local Docker (single demo card, guest section, build logs, Puppeteer, `/book/1` and `/public-menu/1`, German locale).
- **Why closed:** Tester report overall **PASS** — all acceptance criteria met.
- **Closed at (UTC):** 2026-06-29 06:43
---

# Tenant=1 on landing page — show only Restaurant Demo

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/276
- **276**

## Problem / goal

The landing page (`/`) currently lists **all** tenants from `GET /public/tenants` in the restaurants section (`front/src/app/landing/landing.component.ts`). Product owner request: on the public landing page, **only tenant id 1** should appear, presented as **"Restaurant Demo"** (not the raw DB tenant name).

Other public flows (`/book/:id`, `/public-menu/:id`, table lookup, login with `?tenant=`) must keep working for tenant 1; do not break multi-tenant behaviour elsewhere.

## High-level instructions for coder

- **Inspect current flow:** Landing loads tenants via `ApiService.getPublicTenants()` → `GET /public/tenants` (`back/app/main.py` `list_public_tenants`). Restaurant cards show `tenant.name`, logo, QR to `/public-menu/:id`, Book and Login links.
- **Landing-only filter:** Restrict the restaurants grid to **tenant id 1** only. Prefer filtering in the landing component (or a landing-specific API wrapper) so staff/admin and other callers of `/public/tenants` are unchanged unless product explicitly wants a global API change.
- **Display name:** Show **"Restaurant Demo"** on the card (use i18n — e.g. `LANDING.RESTAURANT_DEMO_NAME` — in **all** `front/public/i18n/*.json` per project rules; do not hard-code English only in the template).
- **Edge cases:** If tenant 1 is missing from the API response, show the existing empty/error UX (`LANDING.NO_TENANTS` or a clear message). Keep loading/error states unchanged.
- **Regression:** Table-code lookup and takeaway links on the same page should still work for demo tables on tenant 1; do not remove guest sections unrelated to the restaurant grid.
- **Tests:** Extend or add a Puppeteer smoke (e.g. `test-landing-version.mjs` or a small new script) asserting exactly one restaurant card and the demo label when tenant 1 exists. Run `npm run test:landing-version` from `front/` with app on 4202.
- **Verify build:** `docker logs --since 10m pos-front` — no Angular compile errors after changes.
- Append **Testing instructions** to this task when implementation is complete (rename **FEAT → WIP** when work starts per `TASKS-README.md`).

## Implementation summary

- `landing.component.ts`: filter `getPublicTenants()` response to tenant id 1 only; display name via `getTenantDisplayName()` → `LANDING.RESTAURANT_DEMO_NAME`; `data-testid` on card and name for smoke tests.
- `front/public/i18n/*.json`: added `LANDING.RESTAURANT_DEMO_NAME` in all 9 locale files.
- `front/scripts/test-landing-version.mjs`: asserts exactly one `[data-testid="landing-tenant-card"]` with name matching `en.json` `RESTAURANT_DEMO_NAME`.

## Testing instructions

1. Ensure stack is up (`http://127.0.0.1:4202/` returns 200).
2. Open `/` — restaurants section shows **one** card titled **Restaurant Demo** (not the DB tenant name); Book/Login/QR still point to tenant 1.
3. Guest section unchanged: table code lookup (e.g. T01) and takeaway link still work.
4. `docker logs --since 10m pos-front` — no Angular compile errors.
5. From `front/`: `BASE_URL=http://127.0.0.1:4202 LANDING_VERSION_ONLY=1 npm run test:landing-version` — must pass (version + single demo card).
6. Spot-check `/book/1` and `/public-menu/1` still load.
7. Switch language on landing — card title uses localized `RESTAURANT_DEMO_NAME`.

---

## Test report

**Date/time (UTC):** 2026-06-29 06:41:04 – 06:42:49 UTC  
**Log window:** `docker logs --since 10m pos-front` (approx. 06:32–06:42 UTC)

**Environment:** Local Docker dev (`docker-compose.yml` + `docker-compose.dev.yml`), `BASE_URL=http://127.0.0.1:4202`, branch `development` @ `de4ed484`.

**What was tested:** All seven criteria from Testing instructions (stack health, single demo restaurant card, guest section, front build logs, Puppeteer smoke, `/book/1` + `/public-menu/1`, i18n language switch).

### Results

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | Stack up (200 on `/`) | **PASS** | `curl` → HTTP 200 |
| 2 | One card “Restaurant Demo”; Book/Login/QR → tenant 1 | **PASS** | Puppeteer + manual: 1 card, name “Restaurant Demo”, links `/book/1`, `/login?tenant=1`, `/public-menu/1` |
| 3 | Guest section: table lookup + takeaway | **PASS** | T01 lookup returns 2 choices (ambiguous multi-tenant); takeaway link `href="/orders"` present |
| 4 | No Angular compile errors in front logs | **PASS** | Transient TS2339 during hot-reload at 06:39:04–06:39:06 UTC (method added after template refs); final builds `Application bundle generation complete` from 06:39:08 onward; no errors at test time |
| 5 | `npm run test:landing-version` (LANDING_VERSION_ONLY=1) | **PASS** | Exit 0 — version 2.1.7 + one demo card |
| 6 | `/book/1` and `/public-menu/1` load | **PASS** | Both HTTP 200 |
| 7 | Language switch → localized demo name | **PASS** | DE select → card title “Restaurant-Demo” matches `de.json` `LANDING.RESTAURANT_DEMO_NAME` |

**Overall:** **PASS**

**Product owner feedback:** The landing page now shows exactly one restaurant card labeled “Restaurant Demo” instead of listing all tenants, which matches the product request. Book, login, and QR links still target tenant 1, guest table lookup and takeaway remain functional, and the demo name localizes correctly (verified German). Ready to ship from a verification standpoint.

**URLs tested:**
1. http://127.0.0.1:4202/
2. http://127.0.0.1:4202/book/1
3. http://127.0.0.1:4202/public-menu/1
4. http://127.0.0.1:4202/orders (takeaway link target, via `routerLink` href)

**Relevant log excerpts**

```
# Puppeteer smoke (front/scripts/test-landing-version.mjs)
>>> RESULT: Landing page shows version and demo restaurant card.

# pos-front build (last successful in window)
Application bundle generation complete. [0.327 seconds] - 2026-06-29T06:39:08.361Z
Application bundle generation complete. [0.017 seconds] - 2026-06-29T06:39:18.629Z

# Transient hot-reload errors (resolved before verification)
✘ [ERROR] TS2339: Property 'getTenantDisplayName' does not exist on type 'LandingComponent'.
Application bundle generation complete. [0.327 seconds] - 2026-06-29T06:39:08.361Z
```

**GitHub:** Verification started — https://github.com/satisfecho/pos/issues/276#issuecomment-4829697318 (`agent:testing` set 06:41 UTC).
