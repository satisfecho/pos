---
## Closing summary (TOP)

- **What happened:** The tester handed off a closed task to fix the Bulgarian staff dashboard subtitle that still showed English copy under the welcome heading.
- **What was done:** `DASHBOARD.WELCOME_TEXT` in `front/public/i18n/bg.json` was set to the Bulgarian string **"Управлявайте бизнес операциите си оттук"**; the tester re-checked locale selection, staff `/dashboard`, front build logs, and landing smoke.
- **What was tested:** Bulgarian UI path plus `curl`/`bg.json` key check, last-80-lines front compose logs, and `npm run test:landing-version` — all **PASS** per the embedded test report.
- **Why closed:** All testing instructions satisfied and overall outcome **PASS**; ready to archive.
- **Closed at (UTC):** 2026-03-26 12:47
---

# Bulagarian internal dashboard subtitle not translated

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/107

## Problem / goal
With Bulgarian selected and after login, the internal dashboard still shows the English subtitle **"Manage your business operations from here"**. The Bulgarian i18n JSON (and any related keys for the dashboard / home shell) needs to be completed so this string is translated like the rest of the staff UI. Related prior work: issue **#103** (Bulgarian language) — this is a follow-up gap on the dashboard subtitle.

## High-level instructions for coder
- Locate the dashboard (or layout) template that renders the subtitle and identify the translation key or hard-coded string.
- Add or fix the Bulgarian (`bg`) entry in the appropriate `front` i18n file(s); keep key parity with other locales.
- Manually verify: set locale to Bulgarian, log in as staff, confirm the subtitle is no longer English and matches tone of neighboring UI copy.
- Run the usual front build check (`docker compose … logs front` or equivalent) so no TS/i18n regressions.

## Implementation
- **Key:** `DASHBOARD.WELCOME_TEXT` in `front/public/i18n/bg.json` was still the English source string.
- **Change:** Set to **"Управлявайте бизнес операциите си оттук"** (imperative, aligned with neighboring dashboard card copy).

## Testing instructions
1. **Manual:** Open the app, use the header **language** dropdown and choose **Български** (`bg`). Log in as staff and open `/dashboard`. The line under **„Добре дошли отново“** must show the Bulgarian sentence above, not **"Manage your business operations from here"**.
2. **Build:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` — no Angular/TS errors after reload.
3. **Smoke:** With stack up, `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` (exit 0).

---

## Test report

1. **Date/time (UTC):** 2026-03-26T12:46:02Z (verification run). Log window reviewed: `pos-front` lines through ~2026-03-26T12:41:33Z (compose log timestamps).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202` (HAProxy); branch `development` @ `8f38961`.
3. **What was tested:** Items 1–3 under **Testing instructions** (Bulgarian dashboard subtitle, front build log, landing smoke).
4. **Results:**
   - **Manual (bg + staff `/dashboard` subtitle):** **PASS** — Puppeteer: `/login?tenant=1` → `select.language-select` = `bg` → staff login → `/dashboard`; `p.welcome-text` text exactly `Управлявайте бизнес операциите си оттук`; English string absent. Served JSON check: `curl http://127.0.0.1:4202/i18n/bg.json` → `DASHBOARD.WELCOME_TEXT` resolves to same Bulgarian string.
   - **Build (front logs):** **PASS** — No `error`/`TS[0-9]`/`NG[0-9]` in last 80 lines; ends with `Application bundle generation complete. [0.013 seconds] - 2026-03-26T12:41:33.937Z`.
   - **Smoke (`test:landing-version`):** **PASS** — Exit code 0; demo login and sidebar nav completed.
5. **Overall:** **PASS**
6. **Product owner feedback:** The internal dashboard welcome line now follows the selected Bulgarian locale instead of staying in English, which matches staff expectations for a fully localized UI. No regressions observed in the quick landing/login navigation smoke. Ready to ship with the rest of the Bulgarian rollout.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/`
   2. `http://127.0.0.1:4202/login?tenant=1`
   3. `http://127.0.0.1:4202/dashboard`
   4. `http://127.0.0.1:4202/i18n/bg.json` (HTTP fetch for `DASHBOARD.WELCOME_TEXT` verification)
8. **Relevant log excerpts (last section):**
   - `pos-front`: `Application bundle generation complete. [0.013 seconds] - 2026-03-26T12:41:33.937Z` / `Page reload sent to client(s).`
