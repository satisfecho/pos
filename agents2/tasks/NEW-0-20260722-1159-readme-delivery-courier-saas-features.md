# Add Satisfecho Delivery, courier, and SaaS paywall to root README

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Root **`README.md`** Features / Key URLs still describe table-QR ordering and the provider portal, but omit shipped **Satisfecho Delivery**, the **courier** app, and the documented **SaaS signup paywall** / platform operator surfaces. Operators and new contributors land on README first; **`docs/README.md`** already indexes **0052** / **0053**, so the root overview lags the product.

## Evidence (008 preflight / review)

- `SIGNAL docs_stale count=15` — scope this task to **root `README.md` only** (no bulk `docs/` rewrite)
- Recent code on `development`: Satisfecho Delivery channel, courier Mine/actions, public `/delivery/{tenantId}` (WIP-302), SaaS paywall (WIP-296 / `docs/0052`)
- `rg` on root `README.md`: no matches for `/courier`, `/delivery`, `/paywall`, or “Satisfecho Delivery”; Multi-tenant roles list omits `courier`
- `docs/README.md` already lists 0052 and 0053 under Feature guides

## High-level instructions for coder

- In **Features**, add short rows (or extend **Orders** / **Multi-tenant**) for:
  - **Satisfecho Delivery** — staff Delivery tab + public `/delivery/{tenantId}`; link **`docs/0053-satisfecho-delivery-order-channel.md`**
  - **Courier portal** — `/courier/login`, `/courier` (Mine / actions); link 0053
  - **SaaS signup paywall** — `/paywall`, `SAAS_*` in `config.env.example`; link **`docs/0052-saas-signup-paywall.md`** (note default `SAAS_PAYWALL_ENABLED=false` for local/demo)
  - Optional one-liner for **platform operator** portal linking **`docs/0015-platform-operator-portal.md`**
- Add **Key URLs** (or equivalent) for `/courier/login`, `/delivery/1`, `/paywall` where the table already lists provider/kitchen URLs
- Add `courier` to the Multi-tenant roles list
- Do **not** expand WIP-296 / WIP-302 product scope here — documentation pointers only; if a feature is still behind a WIP, phrase as “in progress / see doc”
- Pass criteria: a reader of root README can find Delivery, courier, and SaaS paywall and open the matching `docs/0052` / `0053` links; no other stale docs edited
