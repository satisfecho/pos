# Contact us

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/104

## Problem / goal
Add a **Contact us** link in the **app landing** footer. Copy must respect **i18n** (all supported locales). Use contact address **`sales@saitsfecho.de`** as given in the issue; confirm spelling with product/marketing if the domain should be **`satisfecho.de`**.

## High-level instructions for coder
- Locate the landing footer component/layout and add a visible **Contact us** link (or mailto) consistent with existing footer styling.
- Add translation keys for the link label in **`front/public/i18n/*.json`** (parity with reference locale); avoid hard-coded English-only strings.
- Wire the target email to match the issue once confirmed; use existing patterns for external links or `mailto:` if the app already does so elsewhere.
- Smoke-check landing in at least two locales and run the usual front build log check after changes.

## Implementation (feature coder)
- **`front/src/app/landing/landing.component.ts`:** Footer adds a **Contact us** link after provider register, same `footer-sep` styling, `href="mailto:sales@satisfecho.de"`, `data-testid="landing-contact-us"`, label `LANDING.CONTACT_US`.
- **Email domain:** Issue text used `saitsfecho.de` (typo). Implemented **`sales@satisfecho.de`** to match the product domain used elsewhere (e.g. production host). Product/marketing can confirm if a different address is required.
- **`front/public/i18n/*.json`:** New key **`LANDING.CONTACT_US`** in en, de, es, ca, fr, zh-CN, hi, bg.
- **`front/scripts/test-landing-provider-links.mjs`:** Asserts contact link present and `href === mailto:sales@satisfecho.de`.

## Testing instructions (tester)
1. Start stack (e.g. `docker compose -f docker-compose.yml -f docker-compose.dev.yml`); app on HAProxy port (often **4202**).
2. Run: `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-landing-provider-links.mjs` — expect **Contact us (mailto) link: OK** and overall exit 0.
3. Optional: `npm run test:landing-version --prefix front` with same `BASE_URL` if credentials available.
4. Manual: Open `/`, use language picker (e.g. English → German), confirm footer shows localized contact label and link target is **sales@satisfecho.de**.
5. `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` — no Angular build errors after changes.

---

## Test report

1. **Date/time (UTC)** and log window: **2026-03-28T14:14:51Z** – **2026-03-28T14:16:30Z** (Puppeteer + manual check). Docker `front` log window sampled immediately after (**~09:54–09:55Z** build lines in container timestamps = same session).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **`BASE_URL=http://127.0.0.1:4202`**; git branch **`development`** (HEAD **`e4d4879`** at test time).

3. **What was tested** (from “What to verify” / Testing instructions): Puppeteer `test-landing-provider-links.mjs`; optional `test:landing-version.mjs`; manual landing footer in **English** and **Deutsch** (language picker); `front` container logs for TS/Angular errors.

4. **Results:**
   - **Stack reachable on HAProxy 4202:** **PASS** — `docker compose ps` shows `pos-haproxy` `0.0.0.0:4202->4202/tcp`.
   - **`test-landing-provider-links.mjs`:** **PASS** — stdout: `Contact us (mailto) link: OK`, exit **0**.
   - **`npm run test:landing-version --prefix front`:** **PASS** — `>>> RESULT: Landing version OK; …`, exit **0** (elapsed ~46s).
   - **Manual i18n + mailto:** **PASS** — `http://127.0.0.1:4202/`: EN link text **Contact us**; after picker **Deutsch**, link text **Kontakt**, `url` **mailto:sales@satisfecho.de** (a11y snapshot).
   - **Translation key parity:** **PASS** — `LANDING.CONTACT_US` present in **en, de, es, ca, fr, zh-CN, hi, bg** under `front/public/i18n/`.
   - **`docker compose … logs --tail=80 front`:** **PASS** — lines show `Application bundle generation complete`; **no** `error TS` / `NG8` / bundle failed.

5. **Overall:** **PASS** (all criteria above).

6. **Product owner feedback:** El enlace **Contact us** en el pie de la landing cumple i18n (probado EN/DE) y apunta a **sales@satisfecho.de**, alineado con el dominio del producto frente al typo del issue. El flujo queda cubierto por el script Puppeteer dedicado para regresiones futuras.

7. **URLs tested:**
   1. `http://127.0.0.1:4202/` (English, footer contact mailto)
   2. `http://127.0.0.1:4202/` (Deutsch, footer contact mailto)
   3. `http://127.0.0.1:4202/provider/register` (vía `test-landing-provider-links.mjs` paso 2)

8. **Relevant log excerpts (last section)**

`test-landing-provider-links.mjs` (host):
```
   Contact us (mailto) link: OK
>>> RESULT: Landing shows provider login, register, and contact links; register link works.
```

`pos-front` (docker, excerpt):
```
Application bundle generation complete. [0.679 seconds] - 2026-03-28T09:55:33.421Z
Page reload sent to client(s).
```
