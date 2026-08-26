---
## Closing summary (TOP)

- **What happened:** Issue #358 asked the public `/pricing` page to show QR Menu as free forever and add professional support at €50/h + tax.
- **What was done:** The pricing page gained a QR Menu free-forever card and hero callout, a support block with mailto CTA, updated i18n in all nine locales, extended `test-pricing.mjs`, and docs/changelog updates.
- **What was tested:** Tester ran i18n parity, Puppeteer `test:pricing`, manual EN layout, DE/ES locale spot-check, and hosted-price/register regression — all PASS.
- **Why closed:** All five testing criteria passed per tester report.
- **Closed at (UTC):** 2026-08-26 10:05
---

# Pricing update

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/358
- **358**

## Status

Implementation complete (agent 010). Ready for tester.

## Problem / goal

The public `/pricing` page (shipped in #328) shows hosted and self-host tiers but does not yet reflect two product decisions from the issue:

1. **QR Menu is free forever** — prospects should see QR digital menu / table ordering as a zero-cost offering, not only bundled inside the paid hosted plan bullets.
2. **Support pricing** — add an optional professional-support line at **€50/h + tax** with the message **"We support you!"** (or equivalent i18n), shown as needed alongside hosted/self-host.

Align wording with README **Start with one feature** (#355) and existing marketing copy so QR-free and hosted-trial stories stay consistent.

## What was done

- **`front/src/app/pricing/pricing-page.component.ts`:** Added QR Menu free-forever card (first tier), hero callout, 3-column tier grid, and professional support section with `mailto:hello@satisfecho.de` CTA. Hosted price still from `GET /saas/config`.
- **`front/public/i18n/*.json`:** New `PRICING_PAGE.*` keys (QR tier, support block, updated subtitle) in all nine locales.
- **`front/scripts/test-pricing.mjs`:** Asserts QR free-forever callout/tier, support headline and €50/h price, and CTAs.
- **`CHANGELOG.md`**, **`docs/0052-saas-signup-paywall.md`**, **`docs/testing.md`:** Updated for new pricing content and smoke scope.

## High-level instructions for coder

- Update **`front/src/app/pricing/pricing-page.component.ts`** (and styles if needed) to surface **QR Menu free forever** clearly — e.g. a dedicated tier/card, hero callout, or reordered tiers so free QR is visible before paid hosted. Do not remove the live hosted price from `GET /saas/config`.
- Add a **Support** block or card: **€50/h + tax**, headline/message **"We support you!"**, with sensible CTA (e.g. contact / mailto / existing support link in marketing footer — reuse patterns from `/about` or landing footer if present).
- Add **`PRICING_PAGE.*`** keys in **all nine** `front/public/i18n/*.json` locales; run **`python3 scripts/check-i18n-locale-parity.py`**.
- Extend **`front/scripts/test-pricing.mjs`** (and **`npm run test:pricing`**) to assert QR-free messaging and support pricing copy appear on `/pricing`.
- Update **`CHANGELOG.md`** [Unreleased] and, if behaviour changes materially, **`docs/0052-saas-signup-paywall.md`** or **`docs/testing.md`** test table.
- Append **Testing instructions** to this task when implementation is done (**wip → untested**).

## Testing instructions

1. **i18n parity:** From repo root: `python3 scripts/check-i18n-locale-parity.py` — expect PASS.
2. **Automated smoke:** With stack up on 4202: `BASE_URL=http://127.0.0.1:4202 npm run test:pricing --prefix front` — expect PASS (QR free tier, support €50/h, live hosted price/trial, self-host, billing note).
3. **Manual `/pricing` (EN):** Open http://127.0.0.1:4202/pricing — confirm order: QR Menu (Free / Free forever) → Hosted (live €/month from config) → Self-host; hero callout mentions free forever; support block shows **We support you!** and **€50/h + tax** with Contact us mailto.
4. **Manual locale spot-check:** Switch language to DE or ES on `/pricing` — QR and support strings translate (no raw `PRICING_PAGE.*` keys).
5. **Regression:** Hosted card still shows price from `GET /saas/config` (not hardcoded); register CTA links to `/register`.

## Test report

**Date/time (UTC):** 2026-08-26T10:02:44Z – 2026-08-26T10:03:14Z  
**Log window:** same UTC range (containers up; no errors in window)

**Environment:** `docker-compose.yml` + `docker-compose.dev.yml`, `BASE_URL=http://127.0.0.1:4202`, branch `development` @ `50d73f83`

### What was tested

All five criteria from **Testing instructions** (i18n parity, Puppeteer smoke, manual EN layout, DE/ES locale spot-check, hosted-price/register regression).

### Results

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | i18n locale parity | **PASS** | `python3 scripts/check-i18n-locale-parity.py` — all 8 locales OK vs en.json (3099 leaves) |
| 2 | Automated `test:pricing` smoke | **PASS** | Exit 0; QR free callout, support €50/h, hosted €49 from config, trial 14d, self-host, billing-inactive note |
| 3 | Manual `/pricing` (EN) | **PASS** | Tier order QR Menu → Hosted (€49/mo) → Self-host; hero callout “QR Menu is free forever”; support “We support you!” + “€50/h + tax”; mailto Contact us |
| 4 | Locale spot-check (DE + ES) | **PASS** | DE: “Wir unterstützen Sie!”, “50 €/h + MwSt.”, “Für immer kostenlos”; ES: “¡Te apoyamos!”, “50 €/h + IVA”, “Gratis para siempre”; no raw `PRICING_PAGE.*` keys |
| 5 | Regression (live config + register CTA) | **PASS** | `GET /api/saas/config` → `price_cents: 4900`; page shows €49; register CTAs href `/register` |

**Overall: PASS**

### Product owner feedback

The pricing page now clearly shows QR Menu as free forever before paid tiers. Support pricing at €50/h is visible with a direct contact CTA. Copy is consistent across EN, DE, and ES. Ready to ship on the next promote window.

### URLs tested

1. http://127.0.0.1:4202/pricing (EN, DE, ES via language selector)
2. http://127.0.0.1:4202/api/saas/config

### Relevant log excerpts

```
# test:pricing (exit 0)
QR free: QR Menu is free forever — start with zero cost
Support: We support you! — €50/h + tax
Price: €49/ month
Trial: 14-day free trial — no card required

# GET /api/saas/config
price_cents: 4900, trial_days: 14, enabled: false

# docker logs pos-front / pos-back (2026-08-26T10:02:00Z–10:03:14Z)
(no build errors; no API 4xx/5xx or exceptions in window)
```
