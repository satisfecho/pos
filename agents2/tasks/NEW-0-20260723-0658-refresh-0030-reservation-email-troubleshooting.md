# Refresh docs/0030 reservation confirmation email troubleshooting

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`docs/0030-reservation-confirmation-email-troubleshooting.md` is the live ops runbook for “booking has email but no confirmation,” but it has been untouched **>90 days** while SMTP/Settings and sibling email docs moved. Preflight’s stale-doc sample (`find docs … | head -20`) often **omits** 0030, so earlier 008 sweeps never queued it. Operators and agents still land here from **0005** / **0018** cross-links.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23: `SIGNAL docs_stale count=14` — all 14 listed basenames already have `NEW-0-20260722-*` owners; **0030** is age ~106d and **unqueued**
- Cross-links: `NEW-0-20260722-1420-mark-0005-email-options-research` and `NEW-0-20260722-1239-align-gmail-setup-doc-smtp-fields` point readers at **0030** for confirmation failures
- Doc still references `scripts/diagnose_reservation_email.py`, Settings → Email SMTP shape, and `TEST_EMAIL` / Puppeteer `test-reservation-create` — verify these paths still match `development`

## High-level instructions for coder

- Skim **`docs/0030-…`** against current code: `diagnose_reservation_email.py` location/CLI, tenant vs global SMTP fields, log message strings, and reservation locale / template placeholder notes
- Apply a **light** refresh only: fix stale commands/paths/log strings; add a short top status line (**ops troubleshooting — current**) with pointers to **`docs/0018-gmail-setup.md`** (SMTP setup) and **`docs/0005-…`** (research only)
- Do **not** rewrite **0018** / **0005** here (owned by sibling NEWs); do not bulk-touch other stale docs
- Confirm `docs/README.md` still indexes 0030 under the right section if an index entry exists
- Pass/fail: 0030 commands run or clearly match repo paths; no contradiction with Settings → Email / 0018 field list; mtime/status banner shows the doc was reviewed
