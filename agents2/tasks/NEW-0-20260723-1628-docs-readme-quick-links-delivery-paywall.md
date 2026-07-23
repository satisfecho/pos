# Add Delivery and SaaS paywall to docs/README Quick links

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`docs/README.md`** Feature guides already list **0052** / **0053** / **0054** / platform portal, but the **Quick links** table (first stop for operators) still only covers Revolut, testing, agent-loop, deploy, Gmail, reservations, rate limits, and screenshots. People scanning “Need to…” miss Satisfecho Delivery checkout and SaaS paywall enablement.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23: `SIGNAL docs_stale×14` owned; docs-vs-code follow-on (not a bulk stale-doc rewrite)
- `docs/README.md` Quick links (≈L9–19): no rows for Delivery, paywall, or platform operator
- Feature guides table already correct — do **not** rework that section
- Sibling **`NEW-0-20260722-1159-readme-delivery-courier-saas-features`** is root **README.md** only; **`NEW-0-20260723-0752-index-unpaid-delivery-cleanup-ops-docs`** is Deployment/0004 index only — do not merge

## High-level instructions for coder

- In **`docs/README.md`** Quick links only, add rows such as:
  - Guest / staff Satisfecho Delivery → `0053-satisfecho-delivery-order-channel.md`
  - Enable or understand SaaS signup paywall → `0052-saas-signup-paywall.md` (note keep-off until runbook)
  - Optional: platform operator oversight → `0015-platform-operator-portal.md`
- Do not rewrite Feature guides, Deployment tables, or other docs
- Pass/fail: Quick links table links resolve; `rg` finds `0052` and `0053` under the Quick links section; no product code
