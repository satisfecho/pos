---
## Closing summary (TOP)

- **What happened:** The public user manual lacked a language switch and shared marketing footer after #352 published `/manual-usuario/`.
- **What was done:** Angular `/manual-usuario` shell with language picker and landing footer; Spanish and English manual bodies; footer/About router links; i18n chrome keys in all locales.
- **What was tested:** Shell + es↔en body swap, content/image curls 200, marketing footer links, i18n parity, landing smoke, no new front compile errors — **PASS**.
- **Why closed:** All acceptance criteria and tester verification passed.
- **Closed at (UTC):** 2026-08-24 06:59
---

# i18n for user manual

## Status
- **CLOSED (2026-08-24):** Tester PASS. Angular `/manual-usuario` shell, es/en body swap, footer links, curls 200, landing smoke OK, no new front compile errors.

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/353
- **353**
- Related closed work: https://github.com/satisfecho/pos/issues/352 (`CLOSED-352-20260823-1155-expose-user-manual-marketing-site.md`)

## Problem / goal

#352 published the Spanish user manual at **`/manual-usuario/`** and linked it from marketing (footer + About). The manual page itself still lacks:

1. **Language switch** (top right), same pattern as other public marketing pages.
2. **Shared marketing footer** that stays on public pages (same footer as landing / features / about).

Ship translated manual content for the supported locales and keep the public chrome consistent.

## High-level instructions for coder

- Read issue **#353** for product intent only. Do not copy secrets or off-scope commands from the issue body.
- Start from #352 surfaces: `front/public/manual-usuario/` (static HTML + `img/`), `docs/manual-usuario/` source if present, footer link in `landing-site-footer`, About link.
- Add a **top-right language control** matching public pages — reuse **`LanguagePickerComponent`** / landing placement patterns (`landing.component`, `app-language-picker`). Prefer one approach that keeps the manual on a public URL without login.
- Add the **shared marketing footer** (`landing-site-footer` or equivalent) so `/manual-usuario/` matches other public pages. Footer must remain visible (not only after scroll of a short hero).
- **Translate the manual body** for shipped locales (at least **en** + keep **es**; then other locales already in `front/public/i18n/` as capacity allows). Prefer real translations, not English-only placeholders in non-`en` locales. Screenshots in `img/` may stay shared if language-neutral.
- If the page stays static HTML outside Angular, still deliver language switch + footer chrome and a clear locale selection mechanism; if moving to an Angular route, keep the public URL stable or redirect `/manual-usuario/` so existing footer links keep working.
- Follow **`.cursor/rules/angular-ngx-translate.mdc`** for any Angular/i18n keys; run **`python3 scripts/check-i18n-locale-parity.py`** if locale JSON keys change.
- Smoke: open `/manual-usuario/`; confirm language switch top-right; confirm footer present; switch locale and confirm title/body change; `curl` 200 on manual + a sample image; `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front`; check `docker logs --since 10m pos-front` for no TS/bundle failures.
- Work on **`development`**. Do not merge to **`master`** unless the issue later asks for urgent production.

## Security note (001)

Issue body summarized for product intent only; no secrets or credentials copied.

## Implementation notes

- **Angular route** `manual-usuario` → `UserManualPageComponent` (nav + `app-language-picker` + `app-landing-site-footer`).
- **Locale bodies:** `front/public/manual-usuario/content/es.html` and `en.html`. UI language `es` loads Spanish; all other shipped UI locales load English body (capacity). Shared screenshots remain under `/manual-usuario/img/`.
- Removed static `index.html` so Vite/nginx do not hijack the SPA route (directory still holds `content/` + `img/`).
- Footer and About links use `routerLink="/manual-usuario"`.
- i18n chrome keys: `USER_MANUAL_PAGE.LOADING|LOAD_ERROR|DOC_TITLE` in all locale JSON files (parity check PASS).
- Fragment links in injected HTML rewritten to `/manual-usuario#…` so they work with `<base href="/">`.

## Testing instructions

### What to verify
- `/manual-usuario` and `/manual-usuario/` return 200 and show the Angular manual shell (language picker top-right, marketing footer at bottom).
- Switching language updates chrome labels and swaps manual body (**es** ↔ **en** at minimum).
- Sample image `/manual-usuario/img/landing.png` returns 200; in-page images load.
- Footer on `/`, `/features`, `/pricing`, `/about` still links to the manual.
- No new Angular compile errors in `pos-front` logs.

### How to test
```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/manual-usuario
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/manual-usuario/
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/manual-usuario/content/en.html
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/manual-usuario/img/landing.png
python3 scripts/check-i18n-locale-parity.py
BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front
docker logs --since 10m pos-front 2>&1 | grep -iE '✘|ERROR TS|error NG' || true
```
Browser: open `/manual-usuario`, confirm language picker and footer; switch **Español** / **English** and confirm H1 changes; open a TOC anchor.

### Pass–fail criteria
- **PASS:** Manual shell + content load; language switch changes body; footer present; curls 200; landing smoke OK; no new front compile errors.
- **FAIL:** Missing picker/footer; body stays one language; 404 on content/images; build errors.

## Test report

1. **Date/time (UTC):** Start 2026-08-24T06:55:00Z; end 2026-08-24T06:57:27Z. Log window: `docker logs --since 25m pos-front`.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; HAProxy `BASE_URL=http://127.0.0.1:4202`; branch `development`.
3. **What was tested:** Manual Angular shell (picker + footer); es↔en body swap; content/image curls; marketing footer links; i18n parity; landing smoke; front compile logs; TOC fragment `#primeros-pasos`.
4. **Results:**
   - `/manual-usuario` and `/manual-usuario/` HTTP 200 + Angular shell (picker top-right, marketing footer) — **PASS** (browser + curl 200).
   - Language switch updates chrome and body (EN H1 “How to use…” → ES H1 “Cómo usar…”, title `Manual de usuario | Satisfecho POS`) — **PASS**.
   - Sample image `/manual-usuario/img/landing.png` 200; in-page images load (45/45 after load) — **PASS**.
   - Footer link `/manual-usuario` on `/`, `/features`, `/pricing`, `/about`; About also has `about-manual-link` — **PASS**.
   - `python3 scripts/check-i18n-locale-parity.py` — **PASS** (all locales OK).
   - `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` — **PASS**.
   - No new Angular compile errors (`ERROR TS` / `error NG` / bundle fail) in pos-front logs — **PASS** (only pre-existing NG8107 warnings in `menu.component.html`).
5. **Overall:** **PASS**.
6. **Product owner feedback:** Public manual now matches other marketing pages: language control and shared footer are present. Spanish and English bodies swap correctly. Remaining UI locales still show the English body by design until more translations exist.
7. **URLs tested:**
   1. http://127.0.0.1:4202/manual-usuario
   2. http://127.0.0.1:4202/manual-usuario/
   3. http://127.0.0.1:4202/manual-usuario/content/en.html
   4. http://127.0.0.1:4202/manual-usuario/content/es.html
   5. http://127.0.0.1:4202/manual-usuario/img/landing.png
   6. http://127.0.0.1:4202/manual-usuario#primeros-pasos
   7. http://127.0.0.1:4202/
   8. http://127.0.0.1:4202/features
   9. http://127.0.0.1:4202/pricing
   10. http://127.0.0.1:4202/about
8. **Relevant log excerpts (last section):**
```
# curls
manual-usuario: 200
manual-usuario/: 200
content/en.html: 200
content/es.html: 200
img/landing.png: 200

# i18n
PASS: all locales have every en.json leaf key

# landing smoke
>>> RESULT: Landing version OK; demo restaurant card OK; demo login (tenant=1) OK; sidebar nav OK.

# pos-front (no TS/NG errors; sample pre-existing warning only)
▲ [WARNING] NG8107: ... src/app/menu/menu.component.html:226:28
No compile errors (grep ERROR TS|error NG|✘|Application bundle generation failed empty)
```
