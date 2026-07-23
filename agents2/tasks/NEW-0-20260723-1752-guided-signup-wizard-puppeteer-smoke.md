# Add Puppeteer smoke for guided restaurant signup wizard

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Guided restaurant signup (`/register` multi-step priming → tenant created) shipped (#286), but existing **`test:register-page`** only asserts the “Who is this for?” explanation and does **not** walk wizard steps. Agents and ops have no durable smoke for the onboarding path that feeds SaaS paywall priming. Sibling doc NEW covers prose only.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T17:52Z: `SIGNAL docs_stale` / changelog owned; recent Jul smokes queued for waiting-list / groups / order-comments — **no** guided-signup smoke
- `front/scripts/test-register-page.mjs` header: explanation-only; `test:register` / `test:register-page` indexed in **`docs/testing.md`** but neither covers multi-step wizard
- Product: guided signup + paywall docs (**`docs/0052`**); doc task **`NEW-0-20260723-0716-document-guided-signup-wizard`** (do **not** merge — this task is smoke + testing index only)
- Out of scope: paywall subscribe UI (**`test:paywall`** already exists); root README / ROADMAP siblings

## High-level instructions for coder

- Add **`front/scripts/test-guided-signup-wizard.mjs`** (or similar) using existing Puppeteer helpers (`puppeteer-headless.mjs`, `BASE_URL`)
- Prefer a **minimal, non-destructive** path: open `/register` → assert step-0 intro / “Get started” → advance into account/restaurant basics fields visible (Back/Next). Avoid creating a real tenant on shared demo/prod unless the script already uses disposable emails / cleanup; prefer local HAProxy and document any `REGISTER_*` env
- Add `test:guided-signup-wizard` (name flexible) to **`front/package.json`** and a short row in **`docs/testing.md`**
- Do **not** rewrite **0052** (owned by sibling doc NEW); link smoke from that doc only if it already exists when this lands
- Pass/fail: `npm run test:guided-signup-wizard --prefix front` exits 0 against local HAProxy; script listed in `docs/testing.md`
