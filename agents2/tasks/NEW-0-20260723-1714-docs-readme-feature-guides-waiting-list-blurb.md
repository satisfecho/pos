# Mention waiting list in docs/README Feature guides (0011 row)

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`docs/0011-table-reservation-user-guide.md`** already documents public **`/waitlist/:tenantId`** and staff Waiting list tab, but the **Feature guides** one-liner in **`docs/README.md`** still describes only timed reservations (book + view/cancel). Contributors scanning the index miss that waiting list lives under 0011 (there is no separate `005x` waitlist guide).

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T17:14Z: `SIGNAL docs_stale×14` owned; docs-vs-code follow-on (one-row blurb), not a bulk stale-doc rewrite
- `docs/README.md` Feature guides ≈L48: “Table reservations: staff flows, public booking… view/cancel…” — no waitlist / `/waitlist`
- **`docs/0011`** §§ public waiting list + staff tab are current (~10d touch)
- Out of scope / do not merge:
  - Quick links Delivery/paywall (**`NEW-0-20260723-1628-docs-readme-quick-links-delivery-paywall`**) — that NEW forbids Feature guides edits
  - Waiting-list Puppeteer smoke (**`NEW-0-20260723-1648-waiting-list-puppeteer-smoke`**)
  - Root ROADMAP refresh (**`NEW-0-20260723-1628-refresh-root-roadmap-shipped-jul-features`**)

## High-level instructions for coder

- Edit **only** the **0011** description cell in **`docs/README.md`** Feature guides (and the matching Quick links reservations blurb **only if** it also omits waiting list — one short phrase)
- Example cue: mention public `/waitlist/:tenantId` and staff Waiting list tab alongside book/view-cancel
- Do not add a new doc file; do not rewrite 0011 body
- Pass/fail: `rg -n 'waitlist|waiting list' docs/README.md` hits the Feature guides 0011 row; no product code
