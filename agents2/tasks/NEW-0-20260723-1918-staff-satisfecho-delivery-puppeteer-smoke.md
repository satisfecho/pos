# Add Puppeteer smoke for staff Satisfecho Delivery create/edit

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Staff can create and edit first-party **Satisfecho Delivery** orders on **`/staff/orders`** (channel, address, phone, courier assign) — shipped and covered by pytest — but there is **no** Puppeteer smoke for that staff UI path. Public **`test-delivery-checkout.mjs`** and courier **`test:courier-actions`** do not exercise staff create/edit. Regressions in the staff form or channel badge only show up manually.

## Evidence (008 preflight / review)

- SIGNAL docs/changelog themes already queued; product gap from Jul delivery commits (**2.1.24+** staff UI, **#299** closed)
- `front/scripts/`: `test-delivery-checkout.mjs` (public), `test-courier-actions.mjs` — no `test-staff-delivery*.mjs`
- `rg 'staff.*delivery|satisfecho-delivery' front/scripts/*.mjs` → public/courier only
- Open index/alias tasks cover public delivery + platform; none own a **staff** delivery smoke
- NEW backlog is deep — keep this to a **small** smoke (happy path), not a full FEAT rewrite

## High-level instructions for coder

- Add **`front/scripts/test-staff-delivery.mjs`** (or similar) that logs in as demo staff/admin, opens orders, creates (or opens) a Satisfecho Delivery order with address/phone, optionally assigns/clears courier if UI allows, and asserts channel badge / success without console errors
- Add **`test:staff-delivery`** alias in **`front/package.json`** and a short row in **`docs/testing.md`** (env: `BASE_URL`, `LOGIN_EMAIL` / `LOGIN_PASSWORD`)
- Reuse patterns from `test-delivery-checkout.mjs` / `test-courier-actions.mjs`; do not duplicate public checkout or courier Mine-tab coverage
- Pass/fail: `BASE_URL=http://127.0.0.1:4202 npm run test:staff-delivery --prefix front` exits 0 with credentials; docs list the alias
