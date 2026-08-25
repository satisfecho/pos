---
## Closing summary (TOP)

- **What happened:** Issue #354 asked for the public user manual body to match each shipped UI language, not only English and Spanish.
- **What was done:** Added translated HTML bodies for de, fr, ca, bg, hi, ur, and zh-CN under `front/public/manual-usuario/content/` and updated `UserManualPageComponent` to load per-locale content with English fallback.
- **What was tested:** All nine locale content files and `/manual-usuario` returned HTTP 200; browser checks confirmed H1/body per locale; landing smoke passed; no new front compile errors.
- **Why closed:** Tester report PASS — all criteria met.
- **Closed at (UTC):** 2026-08-24 13:21
---

# Translate user manual for all shipped UI languages

## Status
- **TESTING (2026-08-24):** Tester verification in progress.
- **UNTESTED (2026-08-24):** Implementation complete. Manual body HTML for all 9 shipped locales; `contentLocale()` loads per-locale file with English fallback.

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/354
- **354**
- Related closed work: https://github.com/satisfecho/pos/issues/353 (`agents2/tasks/done/2026/08/24/CLOSED-353-20260824-0632-i18n-for-user-manual.md`)

## Problem / goal

The public user manual at **`/manual-usuario`** has full body content for **Spanish** and **English** only. When the visitor picks another UI language (de, fr, ca, bg, hi, ur, zh-CN, etc.), the manual body still shows **English** text.

Issue **#354** asks for the manual body to match the **selected language** for every shipped locale in **`front/public/i18n/`**.

## High-level instructions for coder

- Read issue **#354** for product intent only. Do not copy secrets or off-scope commands from the issue body.
- Start from **`UserManualPageComponent`** (`front/src/app/user-manual/user-manual-page.component.ts`) — today `contentLocale()` maps non-`es` to **`en`**.
- Add **`front/public/manual-usuario/content/<locale>.html`** for each shipped language (same list as **`front/public/i18n/*.json`**). Use **`es.html`** and **`en.html`** as structure/templates; translate body text (real translations, not English placeholders).
- Update **`contentLocale()`** (or equivalent) so each **`LanguageCode`** loads its matching HTML file, with a sensible fallback (e.g. `en`) only when a file is missing.
- Shared screenshots under **`/manual-usuario/img/`** may stay as-is if language-neutral; alt text inside each locale HTML should be translated.
- Keep the public URL **`/manual-usuario`** stable; language switch must swap body content per locale.
- Follow **`.cursor/rules/angular-ngx-translate.mdc`** for any new UI chrome keys; run **`python3 scripts/check-i18n-locale-parity.py`** if locale JSON changes.
- Smoke: open `/manual-usuario`, switch through shipped languages, confirm H1/body language changes; `curl -s -o /dev/null -w "%{http_code}"` on each `content/<locale>.html`; `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front`; check `docker logs --since 10m pos-front` for no TS/bundle failures.
- Work on **`development`**. Do not merge to **`master`** unless the issue later asks for urgent production.

## Security note (001)

Issue body summarized for product intent only; no secrets or credentials copied.

## Implementation notes

- **`UserManualPageComponent`:** `contentLocale()` returns the active `LanguageCode`; `fetchManualContent()` loads `/manual-usuario/content/<locale>.html` and falls back to `en.html` on 404.
- **New locale bodies:** `de.html`, `fr.html`, `ca.html`, `bg.html`, `hi.html`, `ur.html`, `zh-CN.html` under `front/public/manual-usuario/content/` (existing `en.html` + `es.html` unchanged). All visible text and image alt attributes translated; shared screenshots under `/manual-usuario/img/` unchanged.
- No i18n JSON key changes (chrome keys from #353 already cover all locales).

## Testing instructions

### What to verify
- `/manual-usuario` loads the Angular shell (language picker, footer).
- Switching each shipped UI language updates the manual H1 and body to that locale (not English for de/fr/ca/bg/hi/ur/zh-CN).
- All nine content files return HTTP 200.
- No new Angular compile errors in `pos-front` logs.
- Landing smoke test still passes.

### How to test
```bash
for loc in en es de fr ca bg hi ur zh-CN; do
  curl -s -o /dev/null -w "${loc}: %{http_code}\n" "http://127.0.0.1:4202/manual-usuario/content/${loc}.html"
done
curl -s -o /dev/null -w "manual-usuario: %{http_code}\n" http://127.0.0.1:4202/manual-usuario
BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front
docker logs --since 10m pos-front 2>&1 | grep -iE '✘|ERROR TS|error NG|Application bundle generation failed' || true
```
Browser: open `/manual-usuario`, switch through **Deutsch**, **Français**, **Català**, **Български**, **हिन्दी**, **اردو**, **中文（简体）** and confirm H1/body language changes (not English).

### Pass–fail criteria
- **PASS:** Each locale loads its own HTML body; all curls 200; landing smoke OK; no new front compile errors.
- **FAIL:** Body stays English for non-en locales; 404 on content files; build errors.

### Coder smoke (2026-08-24)
- All 9 content curls + `/manual-usuario` → 200.
- `test:landing-version` → PASS.
- No new front compile errors in last 10m logs.

## Test report

**Date/time (UTC):** 2026-08-24T13:19:23Z – 2026-08-24T13:20:53Z  
**Log window:** `docker logs --since 15m pos-front` (13:05–13:21 UTC)

### Environment
- Branch: `development` (synced via `./scripts/git-sync-development.sh`)
- Compose: `docker-compose.yml` + `docker-compose.dev.yml`
- **BASE_URL:** `http://127.0.0.1:4202`
- Note: `pos-front` was restarted once so Vite picked up new `public/manual-usuario/content/*.html` files (pre-restart curls returned SPA shell for new locales; post-restart all serve manual HTML).

### What was tested
- `/manual-usuario` shell (language picker, footer)
- Language switching for de, fr, ca, bg, hi, ur, zh-CN, es (H1 matches locale HTML)
- HTTP 200 on all nine `content/<locale>.html` files + route
- `test:landing-version` smoke
- `pos-front` compile logs

### Results
| Criterion | Result | Evidence |
|-----------|--------|----------|
| `/manual-usuario` loads shell (picker, footer) | **PASS** | Browser: language picker 9 options, `app-landing-site-footer` present |
| Language switch updates H1/body per locale | **PASS** | Browser script: de/fr/ca/bg/hi/ur/zh-CN/es H1 matched each locale file |
| All nine content files HTTP 200 | **PASS** | curl loop: en/es/de/fr/ca/bg/hi/ur/zh-CN + manual-usuario → 200 |
| Content files serve manual HTML (not SPA fallback) | **PASS** | Post-restart: each curl starts with `<main class="page">` |
| No new Angular compile errors | **PASS** | `grep` on pos-front logs: no TS/NG/bundle failures |
| Landing smoke test | **PASS** | `test:landing-version` exit 0 |

### Overall
**PASS** — all criteria met.

### Product owner feedback
Visitors can now read the full user manual in every shipped UI language, not only English and Spanish. Language switching on `/manual-usuario` updates the manual body immediately. No regression on landing or front build.

### URLs tested
1. http://127.0.0.1:4202/manual-usuario
2. http://127.0.0.1:4202/manual-usuario/content/en.html
3. http://127.0.0.1:4202/manual-usuario/content/es.html
4. http://127.0.0.1:4202/manual-usuario/content/de.html
5. http://127.0.0.1:4202/manual-usuario/content/fr.html
6. http://127.0.0.1:4202/manual-usuario/content/ca.html
7. http://127.0.0.1:4202/manual-usuario/content/bg.html
8. http://127.0.0.1:4202/manual-usuario/content/hi.html
9. http://127.0.0.1:4202/manual-usuario/content/ur.html
10. http://127.0.0.1:4202/manual-usuario/content/zh-CN.html
11. http://127.0.0.1:4202/ (landing smoke)

### Relevant log excerpts
```
# pos-front (after restart, no compile errors)
Watch mode enabled. Watching for file changes...
  ➜  Local:   http://localhost:80/

# test:landing-version
>>> RESULT: Landing version OK; demo restaurant card OK; demo login (tenant=1) OK; sidebar nav OK.
```
