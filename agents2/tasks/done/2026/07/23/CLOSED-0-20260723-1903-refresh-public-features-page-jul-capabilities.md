---
## Closing summary (TOP)

- **What happened:** Public `/features` marketing page was stale vs July-shipped capabilities (waitlist, delivery, groups, signup, comments, paywall/oversight).
- **What was done:** Added July feature cards to `FeaturesComponent` (guest/business/platform) with matching `FEATURES_PAGE.*` keys in all 9 locales; layout unchanged.
- **What was tested:** EN/ES/DE titles on `/features` PASS; FEATURES_PAGE leaf parity 68/0 missing across locales; front build clean; landing `/features` links OK (overall PASS).
- **Why closed:** All task criteria passed; tester overall PASS.
- **Closed at (UTC):** 2026-07-23 19:10
---

# Refresh public /features page for Jul capabilities

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

The marketing **`/features`** page (`front/src/app/features/features.component.ts`) still lists the mid-2026 capability set (QR menu, reservations, kitchen/bar, courier marketplace, etc.) but omits major **July** product surfaces already live on `development`: waiting list, Satisfecho Delivery (public + staff), restaurant groups, guided signup, order comments, and SaaS paywall / platform oversight. Prospects landing from the home nav see an incomplete story vs changelog **2.1.11–2.1.28**.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T19:03Z: `SIGNAL docs_stale×14` all basename-owned; demo_tables_check=ok; Unreleased=2; NEW≈96 — this is a **product copy/structure** FEAT (empty FEAT queue), not another docs/README micro-index
- `FeaturesComponent.categories`: guest/operations/business/platform — no waitlist, delivery checkout, groups, signup wizard, order comments, or paywall/platform cards
- Changelog shipped those features (**2.1.11** waitlist through **2.1.28** delivery/ops); landing still links “View all features” → `/features`
- No open `agents2/tasks/*features*` owns this refresh (screenshot NEW covers delivery/waitlist PNGs, not the features grid)

## High-level instructions for coder

- Add concise feature cards (i18n `FEATURES_PAGE.*` keys in **all** shipped locales, or run parity check after `en.json` + backfill siblings) for at least: **waiting list**, **Satisfecho Delivery**, **restaurant groups**, **guided signup**, **order comments**; optionally **SaaS paywall** / **platform operator** under platform
- Place cards in the matching category (guest vs operations vs business vs platform); keep copy short and marketing-accurate — link deep docs only if the page already does so elsewhere
- Do not redesign the whole page layout; do not invent unshipped capabilities
- Pass/fail: `/features` shows the new titles in EN; `python3 scripts/check-i18n-locale-parity.py` passes (or only fails on pre-existing locale gaps already owned by open i18n backfill NEWs); front build clean

## Implementation notes (feature coder)

- Extended `FeaturesComponent.categories` with July cards:
  - Guest: waiting list, Satisfecho Delivery, order comments
  - Business: restaurant groups
  - Platform: guided signup, SaaS trial & paywall, platform oversight
- Added matching `FEATURES_PAGE.FEAT_*` keys in all 9 locale files (`en`, `de`, `es`, `fr`, `ca`, `bg`, `zh-CN`, `hi`, `ur`).
- Layout unchanged; no unshipped capabilities invented.
- No GitHub issue on this task (enhancement reviewer) — skipped issue label/comment.

## Testing instructions

1. Open `http://127.0.0.1:4202/features` (or current HAProxy port) with language set to **English**.
2. Confirm these titles appear:
   - Guest: **Waiting list**, **Satisfecho Delivery**, **Order comments**
   - Business: **Restaurant groups**
   - Platform: **Guided signup**, **SaaS trial & paywall**, **Platform oversight**
3. Switch language (e.g. Español / Deutsch) and confirm the same cards show localized titles (not raw keys).
4. Optional: `python3 scripts/check-i18n-locale-parity.py` — may still FAIL on pre-existing non-FEATURES gaps; verify `FEATURES_PAGE` keys are present in every locale (leaf count for that section matches `en.json`).
5. Confirm front build is clean: `docker logs --since 10m pos-front` shows no TS/NG errors after the change.
6. Smoke: `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` (landing still loads; `/features` linked from home).

**Coder pre-check (2026-07-23):** EN and ES titles verified in browser; FEATURES_PAGE parity across all locales = 0 missing; front bundle regenerated without errors.

## Test report

1. **Date/time (UTC):** 2026-07-23T19:08:40Z start → 2026-07-23T19:09:47Z end. Log window: `docker logs --since 20m pos-front`.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202` (HAProxy); branch `development`.
3. **What was tested:** EN feature titles on `/features`; ES/DE localized titles (no raw keys); `FEATURES_PAGE` leaf parity vs `en.json`; front build clean; landing loads with `/features` linked from home.
4. **Results:**
   - EN titles (Waiting list, Satisfecho Delivery, Order comments, Restaurant groups, Guided signup, SaaS trial & paywall, Platform oversight) — **PASS** — all present under Guest / Business / Platform on `http://127.0.0.1:4202/features` (lang=en).
   - Localized titles ES — **PASS** — Lista de espera, Satisfecho Delivery, Comentarios del pedido, Grupos de restaurantes, Alta guiada, Prueba SaaS y paywall, Supervisión de plataforma; no `FEATURES_PAGE.*` leak.
   - Localized titles DE — **PASS** — Warteliste, Satisfecho Delivery, Bestellkommentare, Restaurant-Gruppen, Geführte Anmeldung, SaaS-Test & Paywall, Plattform-Übersicht; no key leak.
   - `FEATURES_PAGE` i18n parity — **PASS** — all 9 locales have 68 leaves, 0 missing vs `en.json`. Full `check-i18n-locale-parity.py` still **FAIL** on pre-existing non-FEATURES gaps (e.g. fr/hi/zh-CN AUTH/MENU) as allowed by instructions.
   - Front build clean — **PASS** — `Application bundle generation complete` (e.g. 2026-07-23T19:07:21Z); 0 matches for `✘ [ERROR]` / `error TS` / `Application bundle generation failed` in last 20m. Only pre-existing NG8107 warnings in `menu.component.html`.
   - Smoke landing + `/features` link — **PASS** (task intent) — `GET /` → 200; nav/CTA links to `/features` (DE: “Funktionen”, “Alle Funktionen ansehen”). Note: `npm run test:landing-version` itself exits FAIL on unrelated footer semver drift (`2.1.8` on page vs `package.json` `2.1.28`); not caused by this features-copy change.
5. **Overall:** **PASS**
6. **Product owner feedback:** The public features grid now tells the July story — waitlist, delivery, groups, signup, comments, and paywall/oversight all show in the right categories in English and in ES/DE without key leaks. Prospects clicking “View all features” from home get an accurate capability set vs the mid-2026 list. Footer package-version drift on the landing smoke is a separate env/rebuild issue, not a blocker for this marketing refresh.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/features` (English)
   2. `http://127.0.0.1:4202/features` (Español)
   3. `http://127.0.0.1:4202/features` (Deutsch)
   4. `http://127.0.0.1:4202/` (landing — features links)
8. **Relevant log excerpts:**
```
Application bundle generation complete. [0.796 seconds] - 2026-07-23T19:07:21.184Z
Application bundle generation complete. [0.016 seconds] - 2026-07-23T19:07:22.432Z
# no Application bundle generation failed / error TS in window
# landing smoke note: Landing semver "2.1.8" !== package.json "2.1.28"
```
