# Email message of reservation need information

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/91

## Problem / goal
Reservation emails sent via SMTP should include more useful guest-facing information, specifically a **link to the reservation** (e.g. manage/view flow) and a **contact phone number** (restaurant or relevant contact), so messages are actionable without hunting elsewhere.

## High-level instructions for coder
- Locate reservation email templates and send path (backend); identify what data is already available on the reservation / tenant (public booking URL pattern, tenant phone, etc.).
- Add reservation link and contact number to the email body (and plain-text part if applicable) with sensible fallbacks when a field is missing.
- Keep content translatable or consistent with existing i18n for transactional mail if the project already localizes those messages.
- Smoke-test send path in dev (or log preview) without using `example.com` for real send tests per project rules; align with `docs/` if any reservation/email docs exist.
