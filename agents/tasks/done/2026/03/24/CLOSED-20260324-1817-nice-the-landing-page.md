---
## Closing summary (TOP)

- **What happened:** GitHub #69 requested a more polished public landing (hero, value props, clear owner vs guest paths, aligned with modern patterns and existing design tokens).
- **What was done:** Landing component was refreshed (radial hero, clamp typography, three value props with accessible SVGs, mobile-first guest/staff split, restaurant section structure); `LANDING.*` strings were added/refreshed across `front/public/i18n/*.json` with parity fixes (e.g. `ORDER_TAKEAWAY` for `zh-CN` / `hi`).
- **What was tested:** Tester report **PASS** — HTTP 200 on `/`, clean front build tail, `test-landing-version.mjs` and `test-landing-provider-links.mjs` exit 0, DE language switch without raw `LANDING.*`, viewports 375×667 and 1280×800, staff register navigation from landing.
- **Why closed:** All documented pass/fail criteria met; overall **PASS**; ready for archive.
- **Closed at (UTC):** 2026-03-24 18:35
---

# Nice the landing page

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/69

## Problem / goal
The public landing at `http://127.0.0.1:4202/` (and production equivalent) should feel polished and welcoming for both restaurant owners and guests. The issue suggests benchmarking modern landing patterns (example reference in the issue) and upgrading visuals, layout, and overall experience—not a minimal placeholder.

## High-level instructions for coder
- Review the current landing route/components and branding constraints (tenant vs global landing if applicable).
- Research a small set of reference patterns (accessibility, performance, mobile-first) and align with existing Angular/design tokens in the repo rather than one-off CSS sprawl.
- Propose or implement improved hero, value props, and clear paths for owners vs clients; keep load time and SSR/dev build implications in mind.
- Smoke-test locally (e.g. landing Puppeteer script / curl) after changes; document any env-specific assets in README only if behavior changes.

## Coder notes (2026-03-24)
- **`front/src/app/landing/landing.component.ts`:** Hero with radial gradient using `--color-primary-light`, clamp typography, three value props (inline SVG, `aria-hidden`), mobile-first two-column split (guests: table code + takeaway; staff: copy + primary CTA to `/register`), restaurants block with section heading; tenant cards use `<article>` + `<h3>` for structure. Footer and `data-testid` for version / provider links unchanged.
- **`front/public/i18n/*.json`:** New `LANDING.*` strings (values, section titles, staff CTA, restaurants heading); refreshed title/subtitle; `zh-CN` / `hi` gained `ORDER_TAKEAWAY` for parity.

---

## Testing instructions

### What to verify
- `/` loads without console/build errors; hero, value row, guest panel (table code), staff panel (register CTA), restaurant grid (when tenants exist), footer, and version bar look correct on narrow and wide viewports.
- Language switcher still works; new strings appear translated per locale.
- Provider footer links and staff register link navigate correctly.

### How to test
- Stack up (e.g. `docker compose -f docker-compose.yml -f docker-compose.dev.yml`); open `http://127.0.0.1:4202/`.
- `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` — no Angular/TS errors after edits.
- From `front/`: `BASE_URL=http://127.0.0.1:4202 node scripts/test-landing-version.mjs` (optional: with `DEMO_LOGIN_*` / `LOGIN_*` for extended nav test).
- `BASE_URL=http://127.0.0.1:4202 node scripts/test-landing-provider-links.mjs`

### Pass / fail criteria
- **Pass:** Builds clean; both Puppeteer scripts exit 0; manual spot-check shows no layout breakage or missing i18n keys (no raw `LANDING.*` in UI).
- **Fail:** Any build error, script exit non-zero, or obvious regression on `/` (broken table lookup, tenant cards, or footer links).

---

## Test report

1. **Date/time (UTC):** 2026-03-24 ~18:28–18:32 (verification run). **Log window:** same (front container `pos-front` tail reviewed immediately after checks).

2. **Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (services up: `pos-front`, `pos-back`, `pos-haproxy`, `pos-postgres`, `pos-redis`, `pos-ws-bridge`). **BASE_URL:** `http://127.0.0.1:4202`. **Branch:** `development`, **commit (host):** `012c7a3`.

3. **What was tested:** Per “What to verify”: `/` load and build health; hero/value/guest/staff/footer/version; narrow/wide viewport spot-check; language switcher + no raw `LANDING.*`; provider links script; staff register navigation; optional extended landing script with login/sidebar.

4. **Results**
   - **Docker stack / HTTP:** **PASS** — `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/` → `200`.
   - **Front build logs (tail 80):** **PASS** — `Application bundle generation complete`; no `error` / `TS` / `NG` lines in sample.
   - **`test-landing-version.mjs` (with credentials from `.env`):** **PASS** — exit `0`; landing version present; sidebar nav + inventory sublinks OK. (Browser console showed WebSocket auth warnings during nav; script still completed successfully — not a landing regression.)
   - **`test-landing-provider-links.mjs`:** **PASS** — exit `0`; provider login + register links OK.
   - **i18n (Puppeteer):** **PASS** — `select.language-select` `en` → `de`; hero title changed (`Your restaurant, connected` → `Ihr Restaurant, vernetzt`); `document.body.innerText` contained no substring `LANDING.`.
   - **Viewports 375×667 and 1280×800:** **PASS** — hero + guest panel text present (EN).
   - **Staff register:** **PASS** — click `a[href="/register"]` from `/` → pathname `/register`.

5. **Overall:** **PASS** (all criteria above satisfied).

6. **Product owner feedback:** The refreshed landing builds cleanly and the scripted smokes pass, including provider links and switching to German without exposing translation keys. Layout checks at phone and desktop widths show the hero and guest entry path still present. Ready for closing review / archive when convenient.

7. **URLs tested**
   1. `http://127.0.0.1:4202/`
   2. `http://127.0.0.1:4202/register` (from landing CTA)
   3. Provider register target as exercised by `test-landing-provider-links.mjs` (from footer)
   4. Post-login routes from `test-landing-version.mjs` (e.g. `http://127.0.0.1:4202/dashboard`, … `/settings`)

8. **Relevant log excerpts**
   - `pos-front` (tail): `Application bundle generation complete. [0.007 seconds] - 2026-03-24T18:25:50.747Z` (repeated successful rebuilds; no failure lines in tail).
   - `test-landing-version.mjs`: `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.` / `exit=0`
   - `test-landing-provider-links.mjs`: `>>> RESULT: Landing shows provider login and register links; register link works.` / `exit=0`

**GitHub:** Attempted `gh issue comment` and label `agent:testing` on **#69**; **failed** — `Resource not accessible by personal access token (addComment)`; label `agent:testing` not found on repo. Human with repo access may comment/label manually if required.
