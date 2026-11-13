# Main contact via GitHub Discussions (#446)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/446
- **446**

## Problem / goal
Public marketing contact should go through GitHub (prefer Discussions), not email. Feedback, questions, and issues belong in public GitHub channels.

Replace email contact CTAs on marketing pages with a clear, inviting link to GitHub Discussions (`https://github.com/satisfecho/pos/discussions`). Issues (`https://github.com/satisfecho/pos/issues`) is an acceptable secondary target if Discussions does not fit a given CTA.

Known surfaces from the issue:
- `/about` - email link (`mailto:hello@satisfecho.de`)
- `/pricing` - "Contactenos" / contact CTA currently mailto

## High-level instructions for coder
- Find marketing/public contact CTAs that use `mailto:hello@satisfecho.de` (at least About and Pricing; check landing footer / shared contact links if they are the same "main contact" pattern).
- Replace those main product-contact links with an inviting sentence/CTA that opens GitHub Discussions (new tab, `rel="noopener noreferrer"`). Prefer Discussions over Issues.
- Do **not** change operational mailto links that are not "contact Satisfecho the product" (e.g. tenant email on book/menu, platform owner emails, guest-feedback contact_email).
- Update i18n copy (en/es/de as used by those pages) so the CTA invites people to open a Discussion instead of sending email.
- Smoke: open `/about` and `/pricing`; confirm contact CTAs point to Discussions and front build is clean in `docker logs --since 10m pos-front`.
