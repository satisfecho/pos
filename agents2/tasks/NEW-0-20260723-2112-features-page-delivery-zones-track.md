# Refresh /features Satisfecho Delivery card for zones, fees, track

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Public **`/features`** Satisfecho Delivery copy (`FEAT_SATISFECHO_DELIVERY_DESC`) still describes only guest checkout + staff/courier fulfill. **2.1.32 / #306** added configurable **zones/fees** and a customer **track** page; the marketing card lags the shipped product (2.1.29 Jul refresh landed before zones).

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T21:12Z: SIGNAL docs/changelog owned; demo OK; product finding after **2.1.32**
- `en.json` `FEAT_SATISFECHO_DELIVERY_DESC`: “Guests order delivery online with address and payment; staff create delivery orders and couriers fulfill them.” — no fee/zone/track
- Closed **`CLOSED-0-20260723-1903-refresh-public-features-page-jul-capabilities`** shipped the Jul card set without #306 scope
- Sibling **`NEW-0-20260723-1903-document-public-features-page`** owns README/docs **index** only — do **not** merge
- Sibling **`NEW-0-20260723-1903-features-page-puppeteer-smoke`** owns smoke — optional assert on new wording after this lands
- Sibling **2103** NEWs own docs/README 0053 blurb / track smoke alias / demo fee seed — not i18n marketing copy

## High-level instructions for coder

- Update **`FEAT_SATISFECHO_DELIVERY_DESC`** (and title only if needed) in **`front/public/i18n/en.json`**, then backfill the same leaf in all shipped locales (or follow existing i18n backfill NEW pattern / parity check)
- Keep one short sentence: mention fee/coverage and customer order tracking without maps; do not add a second Delivery card
- Do not rewrite other feature cards; no new routes
- Pass/fail: `/features` Delivery card mentions fee/zone or track (manual or features smoke); `rg FEAT_SATISFECHO_DELIVERY_DESC front/public/i18n/*.json` shows updated leafs; front build clean
