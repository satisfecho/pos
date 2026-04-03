# Reservation confirmation emails: consistent language + no duplicate prepay text

## GitHub Issues
- [github.com/satisfecho/pos/issues](https://github.com/satisfecho/pos/issues)
- `gh issue list --repo satisfecho/pos --state open --limit 40`
- Optional: `--json number,title,labels,updatedAt,url`
- **Issue:** https://github.com/satisfecho/pos/issues/162

## Problem / goal
Reservation confirmation emails should use a single language end-to-end: prefer tenant default language (normalized as today), or reservation/booking locale if the model already stores it—use that when sending.

All server-built strings in the confirmation flow must go through localized messaging (`get_message(..., lang)` or equivalent) in `back/app/reservation_email_template.py` and related helpers: prepayment amount line, arrival tolerance, map link labels (Google/OSM), contact block labels (“Contact us”, “Phone”, “Email”), and any other hard-coded English. Preserve HTML escaping and placeholder allowlists.

Eliminate duplicate prepayment wording: `prepayment_notice` already combines amount + `reservation_prepayment_text`; ensure default/custom tenant body templates do not repeat the same content (align `DEFAULT_BODY` and docs so `{{prepayment_text}}` is not redundant with `{{prepayment_notice}}`). Policy typos in tenant-entered content are out of scope unless adding validation hints in Settings.

Add or adjust message keys for supported languages and tests covering rendered output in at least English and Spanish.

## High-level instructions for coder
- Trace confirmation email assembly (template + helpers); identify every user-visible string not yet keyed by language.
- Implement one clear language source per send (tenant default vs reservation locale); document the rule briefly if non-obvious.
- Route remaining hard-coded strings through existing i18n/message infrastructure consistently.
- Fix duplicate prepay lines by reconciling `prepayment_notice`, `prepayment_text`, and tenant body defaults/docs.
- Extend translations and add/adjust tests for en + es rendered HTML/text as appropriate.
- Skim `docs/` for reservation/email behavior if referenced elsewhere; keep changes backend-focused unless the issue explicitly needs front settings copy.
