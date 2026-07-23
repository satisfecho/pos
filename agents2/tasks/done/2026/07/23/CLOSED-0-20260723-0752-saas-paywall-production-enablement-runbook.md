---
## Closing summary (TOP)

- **What happened:** SaaS paywall product paths shipped, but operators lacked an amvara9/production enablement checklist while `SAAS_PAYWALL_ENABLED` stays false.
- **What was done:** Documented ordered Production enablement in `docs/0052`, added a short keep-off pointer in `docs/0001`, and updated the `docs/README.md` Feature guides blurb; no product or prod flag changes.
- **What was tested:** Docs criteria 1–6 (0052 checklist, 0001 link, README, `rg`, amvara9 still off, local `/saas/config`) all **PASS** (tester 2026-07-23).
- **Why closed:** All pass/fail criteria met; no GitHub issue (0).
- **Closed at (UTC):** 2026-07-23 08:00
---

# SaaS paywall production enablement runbook

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

SaaS signup paywall (#296), Stripe billing webhook, and Puppeteer smoke are shipped, but **`SAAS_PAYWALL_ENABLED` stays false** and there is **no amvara9 / ops checklist** for a safe first production enable. Operators risk flipping the flag without webhook secrets, Stripe Price ID, or a grandfather/smoke verification path. **`docs/0052`** describes env vars and webhook events; **`docs/0001`** has no paywall section.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23: `SIGNAL changelog_sparse` / `docs_stale×14` already owned; investigating post-ship ops gaps after delivery cleanup cron closed
- `docs/0052-saas-signup-paywall.md` — defaults, webhook events, flow; no “Production enablement” checklist
- `rg` on `docs/0001-ci-cd-amvara9.md`: no `paywall` / `SAAS_` matches
- Related CLOSED: webhook (`CLOSED-0-20260722-1320-saas-stripe-billing-webhook`), smoke (`CLOSED-0-20260722-1320-paywall-puppeteer-smoke`), #296 — do not re-implement product code
- Sibling NEW owns guided signup wizard doc (`NEW-0-20260723-0716-document-guided-signup-wizard`) — do not merge; this task is **ops enablement only**

## High-level instructions for coder

- Add a short **Production enablement** section to **`docs/0052-saas-signup-paywall.md`**: ordered checklist (Stripe Price + platform keys, Dashboard webhook → `{API}/saas/webhook` with required events, set `SAAS_STRIPE_WEBHOOK_SECRET`, confirm existing tenants stay `grandfathered`, set `SAAS_PAYWALL_ENABLED=true` via `config.env` + compose recreate, verify `GET /saas/config` → `enabled:true`, dry-run register → `/paywall` → trial)
- Add a one-paragraph pointer (or subsection) under **`docs/0001-ci-cd-amvara9.md`** linking to that 0052 checklist — do not duplicate the full Stripe table
- Optionally one-line **`docs/README.md`** Feature guides blurb for 0052 if it still omits “enablement / keep off until ready”
- Do **not** enable paywall on amvara9 in this task unless an operator explicitly requests it; documentation + copy-paste verify commands only
- Pass/fail: reader can follow 0052 + 0001 to enable safely; `npm run test:paywall` still documented; no product code changes required

## Implementation notes (feature coder)

- Added **Production enablement** to `docs/0052-saas-signup-paywall.md` (ordered checklist + rollback).
- Added **SaaS paywall (keep off until ready)** subsection in `docs/0001-ci-cd-amvara9.md` linking to 0052.
- Updated Feature guides blurb in `docs/README.md` for 0052.
- No product / env / amvara9 flag changes. No GitHub issue to label or comment (issue none).

## Testing instructions

Docs-only task (no product code). Pass if:

1. `docs/0052-saas-signup-paywall.md` has a **Production enablement** section with ordered steps covering Stripe Price + platform keys, webhook → `/api/saas/webhook`, `SAAS_STRIPE_WEBHOOK_SECRET`, grandfather spot-check, `SAAS_PAYWALL_ENABLED=true` + compose recreate, `GET /saas/config` → `enabled:true`, dry-run register → `/paywall` → trial, and `npm run test:paywall`.
2. `docs/0001-ci-cd-amvara9.md` has a short **SaaS paywall** subsection that links to 0052 and does **not** duplicate the full Stripe event table.
3. `docs/README.md` Feature guides row for 0052 mentions keep-off / enablement.
4. `rg -n 'Production enablement|SaaS paywall' docs/0052-saas-signup-paywall.md docs/0001-ci-cd-amvara9.md docs/README.md` finds the new sections.
5. Confirm paywall was **not** enabled on amvara9 by this task (`SAAS_PAYWALL_ENABLED` still false unless an operator changed it separately).
6. Optional sanity (local stack): `curl -sS http://127.0.0.1:4202/api/saas/config` returns JSON with `"enabled"` (default false); command in 0052 step 3 runs inside `back` without ImportError.

## Test report

1. **Date/time (UTC):** 2026-07-23 07:58:24 – 07:59:11 UTC. Log window: `docker logs --since 10m` on `pos-back` / `pos-haproxy`.
2. **Environment:** branch `development`; local compose `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; amvara9 via SSH (`/development/pos`, prod compose) + `https://www.satisfecho.de`.
3. **What was tested:** Docs criteria 1–6 from Testing instructions (Production enablement checklist in 0052, 0001 pointer, README blurb, `rg`, amvara9 flag still off, local `/saas/config` + grandfather Python one-liner).
4. **Results:**
   - Criterion 1 — **PASS** — `docs/0052` § Production enablement (lines 63–102) ordered steps 1–7 cover Price+keys, webhook `/api/saas/webhook` + `SAAS_STRIPE_WEBHOOK_SECRET`, grandfather exec, enable+recreate, `GET /saas/config`, dry-run → `/paywall` → trial, `npm run test:paywall`, plus Rollback.
   - Criterion 2 — **PASS** — `docs/0001` § SaaS paywall (keep off until ready) links to 0052 § Production enablement; `rg` finds no Stripe event names in 0001.
   - Criterion 3 — **PASS** — `docs/README.md` Feature guides row for 0052 includes “Keep off until ready; production enablement checklist”.
   - Criterion 4 — **PASS** — `rg -n 'Production enablement|SaaS paywall'` hits 0052:63, 0001:161, README:55.
   - Criterion 5 — **PASS** — amvara9 `back` `printenv SAAS_PAYWALL_ENABLED` → `false`; prod `GET /api/saas/config` → `"enabled":false` (task did not enable).
   - Criterion 6 — **PASS** — local `curl http://127.0.0.1:4202/api/saas/config` → `{"enabled":false,...}`; 0052 step-3 Python one-liner in `pos-back` prints tenants (count 177) with no ImportError.
5. **Overall:** **PASS**
6. **Product owner feedback:** Operators now have a single ordered path in 0052 plus a short amvara9 keep-off pointer in 0001. Paywall remains off in prod until someone intentionally completes the checklist. README correctly steers people to enablement without duplicating Stripe details.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/api/saas/config`
   2. `https://www.satisfecho.de/api/saas/config`
8. **Relevant log excerpts:**
   ```
   pos-back: INFO: ... "GET /saas/config HTTP/1.1" 200 OK
   pos-haproxy: "GET /api/saas/config HTTP/1.1" → 200
   amvara9 back: SAAS_PAYWALL_ENABLED=false
   prod body: {"enabled":false,"trial_days":14,"price_cents":4900,"currency":"eur","stripe_checkout_available":false}
   ```

