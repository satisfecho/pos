# Document guided restaurant signup wizard

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Guided restaurant signup (`/register`, `/signup` onboarding priming) shipped with the SaaS paywall work, but there is **no** short operator/contributor guide for the wizard steps. **`docs/0052-saas-signup-paywall.md`** covers trial/subscribe after priming; root **`README.md`** (owned by sibling NEW) and **`docs/README.md`** do not describe the multi-step signup UX. Agents and new operators may miss how priming relates to paywall and platform billing.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23: changelog/docs SIGNAL lines already queued; scanning recent shipped UX without docs
- **0052** mentions “guided signup priming (`/register` / `/signup`)” only in passing; no step list, routes, or “what gets created”
- No `agents2/tasks/NEW-*` / `FEAT-*` owns a signup-wizard doc (paywall smoke CLOSED; README delivery/saas NEW does not cover wizard steps)
- Related: do **not** expand **WIP-304** or paywall product scope

## High-level instructions for coder

- Add a **short** section to **`docs/0052-saas-signup-paywall.md`** (preferred) **or** a small new `docs/005x-…` only if 0052 would become confusing — cover:
  - Guest/operator path: landing → `/register` / `/signup` priming → tenant created → `/paywall` when enabled vs dashboard when paywall off
  - What priming APIs/routes are exempt from the 402 middleware (pointer to existing 0052 exempt list)
  - Link to **`docs/0015-platform-operator-portal.md`** (or **0055** if renumbered) for platform oversight
- Index the section in **`docs/README.md`** only if the 0052 blurb needs a “includes signup wizard” tweak (one line)
- Do **not** rewrite root README here (**`NEW-0-20260722-1159-readme-delivery-courier-saas-features`** owns that); optional one cross-link from 0052 is enough
- Pass/fail: a reader can follow register → paywall/dashboard from the doc; no product code changes
