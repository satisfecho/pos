# Mark 0005 email-sending options as research

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`docs/0005-email-sending-options.md` is a long comparison of Proton Mail / SendGrid / Resend / Gmail with no status banner. It still appears in `docs/README.md` as a live options guide while day-to-day ops live in **`docs/0018-gmail-setup.md`** and **`docs/0030-…`**. Agents may treat provider shopping as open product work.

## Evidence (008 preflight / review)

- `SIGNAL docs_stale` continuation — basename not in the top-14 list but **>90d** and unqueued (earlier 008 runs deferred `0005`)
- Cross-check already noted in open **`NEW-0-20260722-1239-align-gmail-setup-doc-smtp-fields.md`** (0018 owns SMTP field alignment; this task is status/index only)
- README row presents 0005 as current “comparison and config” without “research” wording

## High-level instructions for coder

- Add a short top banner on **`docs/0005-email-sending-options.md`**: **research / options comparison** — not an implementation backlog; for Gmail/SMTP ops use **`docs/0018-…`** and for confirmation failures use **`docs/0030-…`**.
- Soften the **`docs/README.md`** index blurb to say research/comparison (one line).
- Do **not** rewrite provider tables or pick a new mail vendor in this task.
- Pass/fail: first screenful + README make clear 0005 is historical research; no product code changes.
