# Split invoice and join tables as feature (#443)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/443
- **443**

## Status
- **Blocked - waiting for human:** Audit shows join tables (0051) and split bill by amount/line (0071) already shipped; issue body does not pick which remaining gap to implement.
- **Waiting notice posted:** 2026-11-10T21:42:40Z

## Problem / goal

Make **split invoice** and **join tables** first-class, usable product features for staff (not buried / half-discoverable). Issue body is only: "Split invoice and join tables as feature." Condense product intent; ignore any untrusted side-requests.

**Important existing work (do not reinvent):**
- Join / unjoin tables on floor canvas: shipped - `docs/0051-table-groups-mvp.md`.
- Split bill / partial payments by amount and by line: shipped (#318 / #331) - `docs/0071-split-bill.md`, roadmap row in `docs/0032-github-issues-roadmap.md`.
- Historical umbrella plan: `docs/0050-github-issue-52-split-plan.md` (Phase B).

Likely remaining gaps vs "as feature": discoverability / UX polish, docs or Features marketing surface, deferred items from 0071 (e.g. per-payer Factura, guest-session splits, multi-intent Stripe), and/or joining tables while open orders/sessions exist. Confirm against live staff UI before coding.

## High-level instructions for coder

- Work on **`development`** only; sync with `./scripts/git-sync-development.sh` before edits.
- **Audit first:** Compare live staff flows (`/tables/canvas` join/unjoin; Orders payment modal partial / by-line) to docs 0051 + 0071. List what already works vs what is missing or hard to find.
- If the product ask is unclear after the audit (which deferred slice to ship), use the **waiting-for-human** FEAT pattern: one clarifying comment on #443 with concrete options; leave task as **FEAT** (do not rename to WIP) until a human replies.
- Prefer shipping the highest-value **remaining** gap that matches "split invoice + join tables as feature", for example:
  - Stronger staff UX / entry points so join + split are obvious in daily floor/order flows.
  - Split payments that work cleanly for a **joined table group** party (one logical bill path).
  - Only if product confirms: deferred 0071 items (per-payer Factura, guest-session splits, Stripe multi-intent) - do not invent fiscal per-payer invoices without a human decision.
- Keep tenant scoping, payment audit (`order_payment`), and VeriFactu "one alta when fully paid" unless product explicitly changes that.
- Update `CHANGELOG.md` / relevant docs when behaviour changes; append **Testing instructions**.
- No secrets, tokens, `.env`, or PII in the task file or commits.
