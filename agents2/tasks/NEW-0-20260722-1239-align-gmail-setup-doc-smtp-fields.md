# Align Gmail setup doc with Settings SMTP fields

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`docs/0018-gmail-setup.md`** tells operators to enter a “Gmail address” and “SMTP password” only. The Settings UI actually requires **SMTP host, port, TLS, user, and password** (plus optional From email / From name). Operators following 0018 alone can leave host/port empty and fail to send mail. Sibling docs (**0005**, **0030**) already describe the full SMTP shape.

## Evidence (008 preflight / review)

- `SIGNAL docs_stale` — **`docs/0018-gmail-setup.md`** untouched >90d while Settings SMTP UI is live
- Settings Email section: `smtp_host`, `smtp_port`, `smtp_use_tls`, `smtp_user`, `smtp_password`, `email_from`, `email_from_name` (`front/src/app/settings/settings.component.ts`)
- 0018 §5 still says “Gmail address” / “SMTP password” without host/port/TLS defaults
- Cross-check: `docs/0005-email-sending-options.md` and `docs/0030-reservation-confirmation-email-troubleshooting.md` already list `smtp.gmail.com` / `587`

## High-level instructions for coder

- Update **only** **`docs/0018-gmail-setup.md`** §5 (and a short Notes bullet if needed) so Gmail setup maps 1:1 to Settings fields:
  - Host `smtp.gmail.com`, port `587`, TLS on, user = Gmail address, password = 16-char App Password
  - Optional From email / From name
- Keep the App Password / 2FA steps; do not rewrite **0005** / **0030**
- Pass criteria: a reader of 0018 can fill every Settings SMTP field for Gmail without opening another doc; no product code changes
