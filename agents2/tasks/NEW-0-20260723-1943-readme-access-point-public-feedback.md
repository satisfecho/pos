# Add public /feedback Access Point and short 0011 pointer

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Public guest feedback at **`/feedback/:tenantId`** is shipped (rate-limited, i18n smoke, Google-review thank-you path), but root **`README.md` Access Points** and **`docs/0011-table-reservation-user-guide.md`** never mention it. Operators sharing book/waitlist links miss the feedback URL; staff nav already lists Guest feedback without a public counterpart in Access Points.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T19:43Z: SIGNAL stale-doc basenames already owned; not a bulk `docs/*.md` rewrite
- README Access Points (~L117–130): `/book/{tenantId}` present; no `/feedback/{tenantId}`
- `rg` on **`docs/0011-table-reservation-user-guide.md`**: no `feedback` hits
- `docs/testing.md` already indexes `test:feedback-public-i18n`; siblings own waitlist Access Point (**`NEW-0-20260723-1744-readme-restaurant-groups-and-waitlist`**) and AGENTS Key URLs without feedback (**`NEW-0-20260723-1933-agents-md-key-urls-jul-guest-routes`**) — do **not** merge; this task is README Access Points + one short 0011 pointer only
- Out of scope: staff smoke (**`NEW-0-20260723-1943-staff-guest-feedback-puppeteer-smoke`**)

## High-level instructions for coder

- In **`README.md` Access Points**, add one row for public guest feedback, e.g. `http://localhost:4202/feedback/{tenantId}`
- In **`docs/0011-table-reservation-user-guide.md`**, add a short bullet or URL-table row pointing at public `/feedback/:tenantId` and staff `/guest-feedback` (no new epic doc)
- Do not rewrite branding docs (**`NEW-0-20260722-1359-align-0028-…`** owns waitlist/feedback branding table)
- Pass/fail: `rg '/feedback' README.md docs/0011-table-reservation-user-guide.md` hits; no product code
