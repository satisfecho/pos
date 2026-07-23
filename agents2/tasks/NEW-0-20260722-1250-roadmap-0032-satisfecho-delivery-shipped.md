# Note first-party Satisfecho Delivery on 0032 roadmap

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`docs/0032-github-issues-roadmap.md` lists **Uber Eats interface** as the only delivery-channel theme under #52 and marks it **Not started**. First-party **Satisfecho Delivery** (staff create, courier Mine/actions, public checkout WIP) has already shipped in product and is documented in `docs/0053-satisfecho-delivery-order-channel.md`. Planners cannot see that gap vs aggregator work.

## Evidence (008 preflight / review)

- `SIGNAL docs_stale` — `docs/0032-github-issues-roadmap.md` (~121d untouched) while delivery/courier code landed (#297–#301, related)
- Roadmap table: Uber Eats **Not started** only; no row or note for first-party Satisfecho Delivery
- Feature doc exists: `docs/0053-satisfecho-delivery-order-channel.md` (recently touched)
- Active WIP: `WIP-302-…-public-satisfecho-delivery-checkout-address-pay.md` (do not duplicate that product work here)

## High-level instructions for coder

- Edit **only** `docs/0032-github-issues-roadmap.md` (optional one-line cross-link from `docs/0050-…` if it helps; no filing of new GitHub issues in this task).
- Add a short row or footnote under #52: **Satisfecho Delivery (first-party)** — **Partial / shipped core** (API + staff UI + courier flows); link `docs/0053-…`; keep **Uber Eats** as separate **Not started** aggregator work.
- Do not rewrite phases A–E or paste issue bodies from 0050.
- Pass/fail: roadmap distinguishes first-party delivery (done/partial) from Uber Eats (not started); links to 0053; no product code changes.
