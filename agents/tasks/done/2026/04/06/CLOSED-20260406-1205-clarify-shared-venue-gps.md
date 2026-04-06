---
## Closing summary (TOP)

- **What happened:** Issue #166 asked for clearer settings copy so managers understand that one venue coordinate set applies to both order location checks and optional staff clock-in GPS.
- **What was done:** i18n strings for Location verification and Staff clock-in QR hints were updated across `front/public/i18n/*.json` to describe a single shared venue pin; the tester verified EN and DE on Settings (Payment + Security).
- **What was tested:** Manual checks plus optional `test:landing-version` — **PASS** per test report (2026-04-06T13:46Z–13:51Z UTC); front build healthy.
- **Why closed:** Test report overall **PASS**; acceptance criteria met.
- **Closed at (UTC):** 2026-04-06 13:52
---

# Clarify shared venue GPS for orders and clock-in (settings copy)

## GitHub Issues
- [github.com/satisfecho/pos/issues](https://github.com/satisfecho/pos/issues)
- `gh issue list --repo satisfecho/pos --state open --limit 40`
- Optional: `--json number,title,labels,updatedAt,url`
- **Issue:** https://github.com/satisfecho/pos/issues/166

## Problem / goal
Clarify the settings copy regarding shared venue GPS for orders and clock-in processes to avoid user confusion.

## High-level instructions for coder
- Review current settings copy related to GPS and venue sharing.
- Update the text in the frontend (Angular) to be clearer and more descriptive.
- Ensure the changes align with the intended user experience for both ordering and clocking in.

## Coder notes
- Updated **`SETTINGS.LOCATION_VERIFICATION_DESC`**, **`SETTINGS.ENABLE_LOCATION_CHECK_HINT`**, and **`SETTINGS.CLOCK_QR_LOCATION_VERIFY_HINT`** in all **`front/public/i18n/*.json`** locales so managers see that **one** venue coordinate + radius is used for **order location flagging** and (when enabled) **staff clock-in GPS**, not a separate “ordering-only” pin.

## Testing instructions

### What to verify
- Settings → **Location verification** intro and hint explain the shared venue point for orders and optional clock GPS.
- Settings → **Staff clock-in QR** → **Require GPS at venue for clock** hint references the same **Location verification** coordinates (one shared pin).

### How to test
- Stack: `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (app on **`http://127.0.0.1:4202`**).
- Log in as a user who can open **Settings**; switch language in app if needed and open **Settings** → scroll to **Staff clock-in QR** and **Location verification**.
- Smoke (optional): `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version`

### Pass/fail criteria
- **Pass:** New copy appears (no raw missing keys); English and at least one other locale read clearly; front build has no errors (`docker compose … logs --tail=80 front`).
- **Fail:** Missing translation keys, misleading text (implies two separate GPS pins), or Angular build errors.

---

## Test report

1. **Date/time (UTC):** 2026-04-06T13:46Z–13:51Z (log window aligned with `docker compose … logs --tail=80 front` and Puppeteer runs).
2. **Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml`; **`BASE_URL=http://127.0.0.1:4202`**; branch **`development`** @ **`d9a2a85`**.
3. **What was tested:** Settings → **Payment Settings** → **Location verification** intro + enable-location hint; Settings → **Security** → **Staff clock-in QR** → **Require GPS at venue for clock** hint; optional smoke `npm run test:landing-version`; German locale via in-app language select (`de`).
4. **Results:**
   - Location verification copy (EN) explains one shared venue point for orders and staff clock-in GPS — **PASS** — Puppeteer `innerText` contained: `Set the restaurant venue coordinates and radius below`, `The same point flags orders`, `Staff clock-in QR`.
   - Enable-location hint (EN) ties staff clock-in to same center/radius — **PASS** — text present on Payment Settings view.
   - Clock QR GPS hint (EN) references same coordinates as Location verification — **PASS** — `one shared venue pin for ordering checks and clock-in` on Security section.
   - Second locale (DE) reads clearly and matches intent — **PASS** — Payment Settings: `Derselbe Punkt markiert Bestellungen`, `Mitarbeiter-Stempeluhr-QR`; Security: `gemeinsamer Standort für Bestellprüfung und Stempeln`.
   - No raw missing i18n keys observed in UI — **PASS**.
   - Front build healthy — **PASS** — `docker compose … logs --tail=80 front` shows `Application bundle generation complete` with no TS/Angular errors in window.
   - Optional smoke — **PASS** — `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` exited **0** (landing + login + nav including `/settings`).
5. **Overall:** **PASS**
6. **Product owner feedback:** The English and German strings make it explicit that order location flagging and optional clock-in GPS share one venue coordinate set, which should reduce confusion about multiple pins. The Security tab label remains the English word “Security” in DE locale (pre-existing `SETTINGS.SECURITY` coverage); the new GPS hints themselves are localized.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/`
   2. `http://127.0.0.1:4202/login?tenant=1`
   3. `http://127.0.0.1:4202/dashboard` (post-login)
   4. `http://127.0.0.1:4202/settings` — navigated to **Payment Settings** and **Security** subsections (EN + DE).
8. **Relevant log excerpts (last section)**

```
pos-front | Application bundle generation complete. [0.013 seconds] - 2026-04-06T13:43:04.811Z
pos-front | Page reload sent to client(s).
...
pos-front | Application bundle generation complete. [0.016 seconds] - 2026-04-06T13:43:08.842Z
```

**GitHub:** Comment posted on issue **#166** (“Verification started”). `gh issue edit … --add-label agent:testing` failed: label **`agent:testing`** is not defined on the repo (create or use existing labels per `docs/agent-loop.md`).
