---
## Closing summary (TOP)

- **What happened:** The user manual in `docs/manual-usuario/` was not reachable from any public marketing URL.
- **What was done:** Manual published at `/manual-usuario/` via `front/public/manual-usuario/`; footer and `/about` links added with i18n labels in all shipped locales.
- **What was tested:** Manual and sample image HTTP 200, footer links on marketing pages, `test:landing-version`, no Angular build errors — **PASS**.
- **Why closed:** All acceptance criteria and tester verification passed.
- **Closed at (UTC):** 2026-08-23 12:21
---

# Expose the user manual and link it from the marketing site

## Status
- **TESTING (2026-08-23):** Tester agent started verification.
- **UNTESTED (2026-08-23):** Implementation complete in commit `5a2ecc56`. Manual served at `/manual-usuario/`; footer and `/about` links added; i18n keys in all locales. Coder smoke: curl 200 on manual + sample image; `test:landing-version` passed.

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/352
- **352**

## Problem / goal

The complete user manual lives in `docs/manual-usuario/index.html` but is not reachable from any public URL. Publish it with the frontend static assets and link it from marketing entry points (footer, about).

## High-level instructions for coder

- Serve manual at **`/manual-usuario/`** (copy tree into `front/public/manual-usuario/` including `img/`).
- Add translated **User manual** link in **`landing-site-footer`**, **`/about`**, and ensure **`/features`** footer includes it (shared footer).
- i18n: translate link labels in all shipped locales; manual body stays Spanish for this slice (English manual translation is follow-up).
- Smoke: `curl` returns 200 for `/manual-usuario/`; landing/features/about show the link.

## Implementation notes

- Copied `docs/manual-usuario/` (HTML + `img/`) → `front/public/manual-usuario/` — served at **`/manual-usuario/`**.
- **`landing-site-footer`**: User manual link in Support group (`data-testid="landing-user-manual"`).
- **`about-page`**: New manual section with link (`data-testid="about-user-manual"`).
- **`/features`** footer uses shared `landing-site-footer` (link included).
- i18n: `LANDING.USER_MANUAL`, `ABOUT_PAGE.MANUAL_TITLE`, `ABOUT_PAGE.MANUAL_BODY` in all shipped locales. Manual body remains Spanish (source); English manual translation is follow-up per issue discussion.

## Testing instructions

### What to verify
- `/manual-usuario/` returns 200 and shows the manual (images load from `/manual-usuario/img/`).
- Footer on `/`, `/features`, `/pricing`, `/about` shows translated **User manual** link.
- `/about` has a manual section with working link.

### How to test
```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/manual-usuario/
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/manual-usuario/img/landing.png
cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version
```
Browser: open `/about` and `/features`, confirm footer link; open `/manual-usuario/`.

### Pass–fail criteria
- **PASS:** Manual URL and sample image return 200; marketing pages show link; no new Angular build errors in `docker logs pos-front`.
- **FAIL:** 404 on manual paths; missing link; broken images; compile errors.

## Test report

1. **Date/time (UTC):** 2026-08-23T12:14:00Z – 2026-08-23T12:17:38Z. Log window: front service logs `--since 60m`.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` at `e839388c` (feature commit `5a2ecc56` cited by coder).
3. **What was tested:** Manual static URL and sample image; footer link on marketing pages; `/about` manual section; `npm run test:landing-version`; front container build logs.
4. **Results:**
   - `/manual-usuario/` HTTP 200 — **PASS** (`curl` → 200).
   - `/manual-usuario/img/landing.png` HTTP 200 — **PASS** (`curl` → 200).
   - Footer link on `/`, `/features`, `/pricing`, `/about` (`data-testid="landing-user-manual"`, href `/manual-usuario/`, label "Manual de usuario") — **PASS** (browser DOM checks).
   - `/about` manual section with working link (`data-testid="about-user-manual"`, inner `a` href `/manual-usuario/`) — **PASS**.
   - `/manual-usuario/` shows manual title "Manual de usuario | Satisfecho POS" — **PASS**.
   - `npm run test:landing-version` — **PASS** (landing, demo card, login, sidebar nav OK).
   - No Angular **ERROR** in front logs during test window (12:14–12:17 UTC); only NG8107 warnings on unrelated `menu.component` — **PASS**. Note: transient TS2345 at 12:11:35Z from concurrent `#350` WIP edit; bundle complete again at 12:11:36Z before this test run.
5. **Overall:** **PASS**
6. **Product owner feedback:** The user manual is now reachable from the marketing site without login. Footer and About page links are consistent and use i18n labels. Spanish manual body is fine for this slice; English translation can follow separately.
7. **URLs tested:**
   1. http://127.0.0.1:4202/
   2. http://127.0.0.1:4202/features
   3. http://127.0.0.1:4202/pricing
   4. http://127.0.0.1:4202/about
   5. http://127.0.0.1:4202/manual-usuario/
8. **Relevant log excerpts:**
   - `curl manual-usuario/` → `200`; `curl landing.png` → `200`.
   - `test:landing-version` → `>>> RESULT: Landing version OK; demo restaurant card OK; demo login (tenant=1) OK; sidebar nav OK.`
   - `pos-front` (12:14–12:17 UTC): no `✘ [ERROR]` lines; latest line `Page reload sent to client(s).`
