# Add restaurant groups to docs/README Quick links

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`docs/0054-restaurant-groups.md`** is indexed under Feature guides, but **Quick links** (first stop for operators) has no “Need to… multi-location / restaurant groups” row. Sibling **`NEW-0-20260723-1628-docs-readme-quick-links-delivery-paywall`** owns Delivery / paywall / optional platform only.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T17:44Z: `SIGNAL docs_stale×14` owned; index follow-on on recently touched **`docs/README.md`**
- Quick links (~L9–19): no 0054 / restaurant groups
- Feature guides already lists 0054 — do **not** rework that table here
- Out of scope: root README groups (**`NEW-0-20260723-1744-readme-restaurant-groups-and-waitlist`**), waiting-list 0011 Feature guides blurb (**`NEW-0-20260723-1714-…`**), groups Puppeteer smoke (**`NEW-0-20260723-1659-…`**)

## High-level instructions for coder

- In **`docs/README.md` Quick links only**, add one row such as: manage multi-location restaurant groups → **`0054-restaurant-groups.md`**
- Do not edit Feature guides, Deployment tables, or other docs
- Pass/fail: `rg -n '0054|restaurant group' docs/README.md` hits under Quick links; link resolves; no product code
