# Refresh docs/0001 daily demo reset scope (Delivery + waitlist)

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`docs/0001-ci-cd-amvara9.md` § *Daily demo data reset* still says reset re-seeds **orders + reservations only**. `reset_demo_data` now also clears/reseeds **waiting-list entries** and includes **Satisfecho Delivery** sample orders. Operators following 0001 alone will misread what cron refreshes on tenant 1.

## Evidence (008 preflight / review)

- Digest 2026-07-23T20:26Z: `demo_daily_reset=documented`; scope text in 0001 is stale vs `back/app/seeds/reset_demo_data.py` + CHANGELOG 2.1.30/2.1.31
- 0001 line: “reset and re-seed **orders + reservations only** (tables, products, and users are untouched)”
- No open NEW covers refreshing this 0001 paragraph (Delivery/waitlist seed tasks own code, not this ops blurb)

## High-level instructions for coder

- Update **`docs/0001-ci-cd-amvara9.md`** Daily demo data reset section to state that reset clears/reseeds **orders** (including Satisfecho Delivery samples), **reservations**, and **waiting-list entries** for tenant 1; tables/products/users remain untouched
- Keep cron install instructions unchanged; one short sentence is enough
- Cross-check wording against **`AGENTS.md`** Demo reset blurb so the two stay aligned
- Pass/fail: 0001 no longer claims “orders + reservations only”; mentions waitlist and Delivery samples; no code/seed changes required
