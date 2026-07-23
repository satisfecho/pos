# Document SAAS_PAYWALL_ENABLED in README Configuration table

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

SaaS hard paywall is controlled by **`SAAS_PAYWALL_ENABLED`** in **`config.env`** / **`config.env.example`** (default `false`), but root **`README.md` Configuration** table never lists it. Operators following README alone miss the flag when enabling trial/subscribe locally or on amvara9 (runbook lives in **`docs/0052`**).

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T19:43Z: `SIGNAL docs_stale` / `changelog_sparse` owned; `demo_tables_check=ok`; NEW backlog deep — one-table-row doc fix
- `config.env.example` already defines `SAAS_PAYWALL_ENABLED=false`; README Configuration (~L140–150) lists Stripe currency / Twilio / phone country but not SAAS paywall
- Sibling **`NEW-0-20260722-1159-readme-delivery-courier-saas-features`** owns Features / Access Points / roles for Delivery, courier, paywall URL — **not** the Configuration env table — do **not** merge
- Closed runbook **`CLOSED-0-20260723-0752-saas-paywall-production-enablement-runbook`** owns ops checklist in 0052/0001 — this task is README Configuration only

## High-level instructions for coder

- Add one row to **`README.md` Configuration** for **`SAAS_PAYWALL_ENABLED`**: optional; default `false`; when `true`, new restaurant signups hit `/paywall`; link **`docs/0052-saas-signup-paywall.md`**
- Keep the table style consistent; do not paste Stripe secrets or change defaults
- Pass/fail: `rg 'SAAS_PAYWALL_ENABLED' README.md` hits under Configuration; no product code
