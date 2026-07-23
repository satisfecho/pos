# Align 0028 public branding coverage (waitlist + feedback)

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`docs/0028-tenant-public-branding.md` documents background colour and header image for `/book`, `/menu`, and reservation-view only. Public **waitlist** and **guest feedback** pages already apply the same branding tokens, so the coverage table is incomplete and agents may skip branding when touching those routes.

## Evidence (008 preflight / review)

- Doc age >90d (`docs_stale` family; not in current SIGNAL top-14; no dedicated open task)
- `waitlist-public` / `feedback-public` templates bind `--color-bg` and `has-bg-image` / header background like book/menu
- Doc “Where it applies” table omits waitlist and feedback public URLs
- Preflight weekly sweep; prefer small doc align over bulk rewrite

## High-level instructions for coder

- Update the **Where it applies** table (and any one-line overview) to include public waitlist and guest-feedback pages that already use `public_background_color` / header background.
- Keep Settings / API / migration sections; only fix coverage drift.
- Optional one-line **Status: shipped** at top if missing.
- Pass criteria: a reader sees waitlist + feedback in the coverage table; no product code changes required unless a page is documented as branded but is not (then note gap only — do not expand branding in this task unless trivial).
