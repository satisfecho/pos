# Add Jul feature guides to root README Documentation table

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Root **`README.md` § Documentation** still lists mid-lifecycle plans (reservations, verification, provider, kitchen) but omits shipped July guides **`docs/0052`**, **`0053`**, and **`0054`**. Contributors who skim the Documentation table (not Features) miss paywall, Satisfecho Delivery, and restaurant groups docs even when Features/Access Points tasks eventually land.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T20:04Z: `SIGNAL docs_stale×14` basenames already queued; not a bulk `docs/*.md` rewrite — root README index gap only
- `rg '0052|0053|0054' README.md` → no hits in Documentation table (~L156+)
- Sibling NEWs own other README slices — do **not** merge:
  - Features / Access Points Delivery-courier-paywall → **`NEW-0-20260722-1159-readme-delivery-courier-saas-features`**
  - Groups + waitlist Access Points → **`NEW-0-20260723-1744-readme-restaurant-groups-and-waitlist`**
  - Configuration `SAAS_PAYWALL_ENABLED` → **`NEW-0-20260723-1943-readme-config-saas-paywall-enabled`**
  - `/features` pointer → **`NEW-0-20260723-1903-document-public-features-page`**

## High-level instructions for coder

- In **`README.md` Documentation** table, add three short rows linking:
  - **`docs/0052-saas-signup-paywall.md`**
  - **`docs/0053-satisfecho-delivery-order-channel.md`**
  - **`docs/0054-restaurant-groups.md`**
- One-line descriptions only; do not edit Features / Access Points / Configuration here
- Pass/fail: `rg '0052|0053|0054' README.md` hits under Documentation; links resolve; no product code
