# Newsletter sending for restaurant owners (#435)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/435
- **435**

## Status
- **WIP → implementation complete** (010 feature coder)
- **MVP slice:** compose + consent-gated send to billing customers / reservation emails / both; ~30/min worker; open + click tracking; Settings UI; no separate CRM.

## Problem / goal
Restaurant / POS owners collect customer emails and want a staff UI to send branded newsletter-style emails, with basic engagement metrics (opens, link clicks) and rate-limited sending (about **30 messages per minute**) so SMTP is not overwhelmed.

Reuse existing tenant email / SMTP paths where possible (`docs/0005-email-sending-options.md`, `docs/0056-gmail-setup.md`). Audience should come from known customer email sources (e.g. billing customers / end-user customers — see `docs/0017-billing-customers-factura.md`, `docs/0002-customer-features-plan.md`); do not invent a second CRM.

## High-level instructions for coder
- Clarify MVP vs later: compose + send to selected/opted-in recipients with rate limit first; open/click tracking may need tracking pixels / redirect links and storage — scope a minimal first slice if full analytics is large.
- Staff-only UI (owner/admin): pick audience, subject, HTML/plain body (or simple template), preview, send or schedule; respect tenant scoping and existing auth roles.
- Backend: queue or throttle outbound mail (~30/min); reuse tenant SMTP config; persist campaign/send status and failures; never log full recipient lists with secrets.
- Tracking (if in first slice): open and click counts without leaking PII in public URLs; document privacy / consent expectations (opt-in) briefly in the task notes or a short docs note when shipping.
- Do not replace reservation/order transactional email flows; newsletter is a separate product path.
- i18n for any new staff UI strings in all shipped `front/public/i18n/*.json` locales.
- Smoke: staff can open the newsletter UI; a test send to a real configured inbox succeeds without flooding SMTP; front build clean in `docker logs --since 10m pos-front`.

## What was implemented
- Migration `back/migrations/20261022130000_newsletter.sql` + models `NewsletterCampaign` / `NewsletterRecipient`.
- Staff API under `/tenant/newsletter/*` (audience, campaigns CRUD/queue/cancel, test-send); public `/public/newsletter/o/{token}` and `/c/{token}` for open/click (opaque token, http(s) only).
- Background worker ~30/min (`newsletter_worker.py`), wired in app lifespan.
- Settings → Newsletter UI + i18n; docs `docs/0079-newsletter.md`.
- Tests: `back/tests/test_newsletter.py`; Puppeteer `npm run test:newsletter-settings --prefix front`.

## Privacy / consent
Staff must check consent before queueing a campaign. No marketing opt-in column yet — restaurants remain responsible for lawful basis. Tracking URLs contain only a random token (no email).

## Testing instructions

1. **Migrate / stack:** Ensure migrations applied (`20261022130000_newsletter`) and back restarted so the newsletter worker is running (log: `Newsletter worker started`).
2. **Backend unit/API:**  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest tests/test_newsletter.py -q`
3. **UI smoke (no SMTP send):** With app up and owner/admin `LOGIN_*` / `DEMO_LOGIN_*`:  
   `BASE_URL=http://127.0.0.1:<haproxy-port> HEADLESS=1 npm run test:newsletter-settings --prefix front`  
   (or `node front/scripts/test-newsletter-settings.mjs`). Asserts Settings → Newsletter compose section.
4. **Manual (optional SMTP):** Settings → Email configured → Newsletter → compose → **Send test to me**; then queue a small audience with consent checked. Confirm history shows sent/opens/clicks and SMTP is not flooded (~30/min).
5. **Front build:** `docker logs --since 10m pos-front` — no TS/NG bundle errors.
6. **Docs:** Skim `docs/0079-newsletter.md`.
