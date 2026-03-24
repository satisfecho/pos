---
## Closing summary (TOP)

- **What happened:** Tester verified guest feedback public i18n after the coder extended the Puppeteer regression script to cover missing-tenant (404) UI in English and German.
- **What was done:** Locale JSONs and `FeedbackPublicComponent` were already aligned with #67; the coder added assertions for `FEEDBACK.TENANT_NOT_FOUND` in body and document title for en/de in `front/scripts/test-feedback-public-i18n.mjs`.
- **What was tested:** `node front/scripts/test-feedback-public-i18n.mjs` against `BASE_URL=http://127.0.0.1:4202` on `development` @ `aaa09f3`; all six `>>> RESULT:` lines OK, no raw `FEEDBACK.` leaks; optional manual and production checks were not run (N/A per task).
- **Why closed:** Test report **PASS**; task handed off from tester; archived per agent-loop closing workflow.
- **Closed at (UTC):** 2026-03-24 14:49
---

# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback (`/feedback/{tenant}`, e.g. with `?token=…` on production) must show **fully translated** UI in the selected language: no missing strings, wrong language, or raw i18n keys (`FEEDBACK.*`) in visible copy or document title. Issue reporter cited **https://satisfecho.de** example URL. See `front/public/i18n/`, `FeedbackPublicComponent`, and prior **`agents/tasks/done/`** archives for this theme (multiple tester PASS notes; optional production spot-check and GitHub close remain product decisions per `docs/agent-loop.md`).

## High-level instructions for coder

- Reproduce locally and (if relevant) on production: exercise `/feedback/{tenant}` with and without token across supported locales (language picker and `Accept-Language`).
- Confirm every guest-visible string (form, errors, thank-you, invalid tenant, rate limits) uses ngx-translate; tab title stays localized after language changes.
- Fix any gaps in locale JSON files under `front/public/i18n/` or binding in `feedback-public` as needed; add a short regression check (manual or script) so keys do not reappear.
- When satisfied, document evidence for the issue; support verification comment and closing **#67** when product agrees.

## Coder notes (this pass)

- Product strings and `FeedbackPublicComponent` title handling were already aligned with #67; locale JSONs include full `FEEDBACK.*` for **en, de, es, fr, ca, zh-CN, hi**.
- **Change:** Extended `front/scripts/test-feedback-public-i18n.mjs` to assert **`FEEDBACK.TENANT_NOT_FOUND`** (missing tenant / API 404) in **en** and **de** body text and document title, so this path cannot regress silently.

## Testing instructions

1. **Stack:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d` (or `./run.sh`); app on HAProxy host port **4202** (typical).
2. **Automated (required):** From repo:
   ```bash
   cd front && BASE_URL=http://127.0.0.1:4202 node scripts/test-feedback-public-i18n.mjs
   ```
   Or `npm run test:feedback-public-i18n --prefix front` with `BASE_URL` set if not using the default port discovery.
   Expect: all `>>> RESULT:` lines OK; **no** raw `FEEDBACK.` substrings in body or tab title during checks.
3. **Manual spot-check (optional):** `/feedback/1` and `/feedback/1?token=test`; switch language picker through **en, de, fr, es, ca, zh-CN, hi**; confirm form, errors, thank-you, **invalid id** (`/feedback/0`), **missing tenant** (e.g. `/feedback/999999999`), and browser tab title track the locale.
4. **Production (optional):** Repeat a subset on **https://satisfecho.de** per `docs/agent-loop.md` / product process.

---

## Test report

1. **Date/time (UTC) and log window:** 2026-03-24 14:47:44 UTC – ~14:48:10 UTC (automated run ~14s).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `aaa09f3`; Puppeteer headless (`HEADLESS=1`).
3. **What was tested:** Required item (2) from **Testing instructions** — `front/scripts/test-feedback-public-i18n.mjs` per coder extension (browser default `es`, locales en/de/fr/es/ca/zh-CN/hi, `?token=`, POST thank-you DE, `/feedback/0`, `/feedback/999999999`). Optional manual (3) and production (4) not run; automated script already exercises those URL classes.
4. **Results:**
   - **Docker stack reachable on 4202:** **PASS** — `docker compose … ps` shows `pos-haproxy` `0.0.0.0:4202->4202/tcp`, services up.
   - **Script exit 0, all `>>> RESULT:` OK:** **PASS** — six OK lines printed; no assertion failures.
   - **No raw `FEEDBACK.` in body or document title (automated checks):** **PASS** — script asserts absence of `FEEDBACK.` substring and localized phrases per locale; including missing-tenant (404) EN/DE body and DE title.
   - **Optional manual / production spot-check:** **N/A** — not required for closure of this verification step per task text.
5. **Overall:** **PASS**
6. **Product owner feedback:** Public feedback i18n is covered end-to-end by the headless script on dev, including the new 404 tenant-not-found regression checks. Remaining decision is whether to spot-check **https://satisfecho.de** and close **#67** when product is satisfied.
7. **URLs tested (automated):**
   1. `http://127.0.0.1:4202/feedback/1` (browser stub `es-ES` first load)
   2. `http://127.0.0.1:4202/feedback/1` (language picker: en, de, fr, es, ca, zh-CN, hi)
   3. `http://127.0.0.1:4202/feedback/1?token=dummy-token-for-i18n-smoke`
   4. `http://127.0.0.1:4202/feedback/1` → submit → thank-you (de)
   5. `http://127.0.0.1:4202/feedback/0` (invalid id, en then de)
   6. `http://127.0.0.1:4202/feedback/999999999` (missing tenant, en then de)
8. **Relevant log excerpts:**
   - **Script (host stdout):** `>>> RESULT: Browser default locale (es, navigator stub) on first load OK (no FEEDBACK.* leaks)` … through `>>> RESULT: Missing tenant (404) error UI i18n OK`.
   - **`docker logs pos-front` (tail):** `Application bundle generation complete. [0.022 seconds] - 2026-03-24T14:32:32.085Z` — no errors in tail during window.

**GitHub:** `gh issue comment 67` failed with “Resource not accessible by personal access token (addComment)”; labels `agent:testing` / `agent:wip` are also absent on the repo’s label set. Human/closer should comment on **#67** if needed.
