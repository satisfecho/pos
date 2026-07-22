# Mark 0013 verification alternatives as research-only

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`docs/0013-verification-alternatives.md` recommends **SMS verification** as “RECOMMENDED FOR POS” and ranks social login / other options. It sits under Reference in `docs/README.md` like operational guidance, while product auth remains email/password (+ planned email verification in **0002**). Agents may treat SMS as an accepted product decision.

## Evidence (008 preflight / review)

- `SIGNAL docs_stale` — `docs/0013-verification-alternatives.md` (~129d untouched)
- Doc header: “Alternatives to email verification…” with SMS starred recommended
- Related historical snapshot: `NEW-0-20260722-1250-mark-0007-verification-report-historical.md` (explicitly left 0013 out of scope)
- OAuth design lives separately in `docs/0022-oauth-social-login-notes.md` (not implemented)

## High-level instructions for coder

- Edit **only** `docs/0013-verification-alternatives.md` and the **`docs/README.md`** Reference blurb.
- Add a short top banner: **research / alternatives note** — not a shipping decision; current app uses email/password; do not implement SMS/OAuth from this doc alone.
- Optionally tone down or footnote the “RECOMMENDED FOR POS” star so it is clearly relative to the research options, not current roadmap.
- Do not implement SMS, Twilio, or OAuth; do not bulk-rewrite the alternatives body.
- Pass/fail: readers see research-only status from banner + README; no product code changes.
