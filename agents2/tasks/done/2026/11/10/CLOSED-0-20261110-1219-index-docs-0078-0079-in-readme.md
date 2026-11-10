---
## Closing summary (TOP)

- **What happened:** Docs 0078 (customer-facing display) and 0079 (newsletter) were missing from `docs/README.md` after shipping.
- **What was done:** Index rows and Quick links were added for both docs (Feature guides, Implementation plans; 0079 also under Email & SMTP); no product code.
- **What was tested:** `rg` and file-existence checks PASS for both slugs and relative links.
- **Why closed:** All pass/fail criteria met (index-only docs change).
- **Closed at (UTC):** 2026-11-10 12:25
---

# Index docs 0078 and 0079 in docs/README.md

## GitHub Issues
- **Issue:** (none - enhancement reviewer)
- **0**

## Problem / goal

Shipped Oct docs **`docs/0078-customer-facing-display.md`** (#434) and **`docs/0079-newsletter.md`** (#435) are not listed in **`docs/README.md`**. Operators and agents browsing the doc index cannot find customer counter display or newsletter sending from the catalog even though feature docs and Puppeteer smokes already exist.

## Evidence (008 preflight / review)

- Weekly sweep 2026-11-10: `weekly_due=yes`; demo ok; NEW backlog empty
- `ls docs/0078* docs/0079*` present; CHANGELOG **2.1.186** documents both features
- `rg '0078|0079|newsletter|customer-facing' docs/README.md` returns no hits
- Smokes already indexed in `docs/testing.md` (`test:customer-display`, `test:newsletter-settings`) - this task is **index rows only**, not new tests

## High-level instructions for coder

- Add one row each for **0078** and **0079** under the appropriate **`docs/README.md`** tables (Feature guides and/or Quick links - match nearby style for 0076/0077)
- Optional: one Quick link for “customer counter display” and/or “tenant newsletter” if that table already lists similar staff/public surfaces
- Do not rewrite 0078/0079 bodies; no product code
- Pass/fail: `rg '0078-customer-facing-display|0079-newsletter' docs/README.md` hits; links resolve

## Status

- **WIP** started 2026-11-10T12:23:00Z
- **Done** 2026-11-10T12:24:11Z: indexed **0078** and **0079** in `docs/README.md` (Quick links, Feature guides, Implementation plans near 0076/0077; **0079** also under Email & SMTP). No product code; doc bodies untouched.

## Testing instructions

### What to verify

- `docs/README.md` lists both **0078-customer-facing-display** and **0079-newsletter** with working relative links.
- Target markdown files exist and were not rewritten for this task.

### How to test

```bash
# From repo root
rg '0078-customer-facing-display|0079-newsletter' docs/README.md
test -f docs/0078-customer-facing-display.md
test -f docs/0079-newsletter.md
# Optional: confirm Quick links + Feature guides rows present
rg -n 'Open customer counter|Send tenant newsletter|0078-customer-facing-display|0079-newsletter' docs/README.md
```

No Docker / Puppeteer required (index-only change). Existing smokes remain as documented in `docs/testing.md`.

### Pass/fail criteria

- **Pass:** `rg` finds both slug strings in `docs/README.md`; both `docs/0078-*.md` and `docs/0079-*.md` exist; relative links in the new rows match those filenames.
- **Fail:** either slug missing from the index, or linked files absent.

## Test report

1. **Date/time (UTC):** 2026-11-10T12:24:44Z start; 2026-11-10T12:24:50Z end. Log window N/A (docs-only; no container checks).
2. **Environment:** branch `development` (synced via `./scripts/git-sync-development.sh`). No compose / BASE_URL (index-only).
3. **What was tested:** `docs/README.md` indexes **0078-customer-facing-display** and **0079-newsletter**; target markdown files exist; relative links match filenames.
4. **Results:**
   - Both slug strings present in `docs/README.md` (Quick links L30-31, Email & SMTP L57 for 0079, Feature guides L69-70, Implementation plans L114-115): **PASS**
   - `docs/0078-customer-facing-display.md` exists: **PASS**
   - `docs/0079-newsletter.md` exists: **PASS**
   - Relative links `](0078-customer-facing-display.md)` and `](0079-newsletter.md)` match those filenames: **PASS**
5. **Overall:** **PASS**
6. **Product owner feedback:** Operators and agents can now find customer counter display and newsletter docs from the catalog without hunting CHANGELOG. Index placement next to 0076/0077 and Email & SMTP for 0079 matches existing style. No product-code risk.
7. **URLs tested:** N/A - no browser
8. **Relevant log excerpts:** N/A - docs-only verification via `rg` and `test -f`.
