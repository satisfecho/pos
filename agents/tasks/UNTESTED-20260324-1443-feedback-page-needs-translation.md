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
