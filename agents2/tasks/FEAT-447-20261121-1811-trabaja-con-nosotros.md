# Trabaja con nosotros (careers / CV intake) (#447)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/447
- **447**

## Status
- **Blocked - waiting for human** (proposal fit, CV/PII retention, encryption at rest)
- **Waiting notice posted:** 2026-11-21T18:13:23Z

## Problem / goal
Restaurants need a public **Work with us** / **Trabaja con nosotros** flow so candidates can learn why to join and leave a CV. When the owner enables the option, the venue can show template copy (why work here) and collect applications; later, when a position opens, staff can email candidates for an interview.

Product questions on the issue (proposal fit, data safety, encryption at rest) are open - implement a privacy-safe MVP aligned with existing tenant public pages and PII handling; if encryption-at-rest or retention policy needs an explicit owner decision, post **one** waiting comment and park per **Waiting for human** in `agents2/TASKS-README.md` (do not invent crypto without a clear product answer).

## High-level instructions for coder
- Add an owner-togglable tenant setting for public careers / "trabaja con nosotros" (default off). Mirror patterns used for other public guest surfaces (book, waitlist, delivery).
- Public page (tenant slug or id): show optional owner-editable template text ("why work here") and a form to submit application basics + CV (file upload or structured fields). Store tenant-scoped applications; never log full CV payloads or secrets.
- Staff/owner UI: list applications for the tenant, mark status (e.g. new / contacted), and support emailing a candidate when a role opens (reuse existing tenant SMTP / email helpers if present).
- Privacy: document retention and access (tenant staff only); follow `.cursor/rules/security-secrets-tenant.mdc` - no cross-tenant reads; avoid `@example.com` in email tests.
- i18n: EN / ES / DE / CA for new UI strings (`front/public/i18n/`).
- Docs: short note under `docs/` for the public URL and owner toggle; point smoke tests in the task when done.
- Smoke: public careers page loads when enabled; submit creates a tenant-scoped row; owner list shows it; front build clean in `docker logs --since 10m pos-front`.
