# Premium email experience: reservation confirmation + reservation reminder (layout, branding, localization)

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/150

## Problem / goal
Stakeholders want transactional reservation emails (confirmation after booking, reminder before visit) to look professional and on-brand: clear hierarchy, readable typography, email-safe HTML, optional tenant logo, strong CTAs where self-service links exist, human-readable localized dates/times using tenant timezone when available. Confirmation should improve defaults and wrappers while preserving owner-customizable placeholders (`reservation_email_template.py` allowlist). Reminder path should be redesigned to match confirmation quality or share a common layout module; align tone and subject with confirmation. Follow existing i18n patterns (`get_message` / messages), escape user content, avoid secrets in logs. See `docs/0030-reservation-confirmation-email-troubleshooting.md` and `docs/0024-whatsapp-reminder-notes.md` where relevant.

## High-level instructions for coder
- Audit `back/app/email_service.py` (confirmation vs `send_reservation_reminder`), `reservation_email_template.py`, and related `main.py` background tasks; plan shared layout/partials without breaking placeholder allowlists.
- Improve HTML structure and default copy for confirmation; ensure custom templates still render inside `wrap_html_email` (or equivalent).
- Redesign reminder HTML/subject to match confirmation quality; consider extracting shared header/footer or styles.
- Wire subject/body strings through existing translation/message infrastructure; document timezone fallback if tenant timezone missing.
- Add or extend tests for rendering and escaping; smoke-test send paths where the environment supports SMTP (without committing secrets).

## Implementation summary
- **`reservation_email_template.py`:** `reservation_email_document()` + `tenant_logo_block_html()` shared by `wrap_html_email()` (confirmation) and `render_reminder_email()` (reminder). `wrap_html_email()` now accepts optional `tenant`, `public_app_base_url`, `lang`. Link blocks use **`get_message("email_reservation_manage_link_text", lang)`** with a button-style CTA. `build_value_maps` / `render_confirmation_email` take **`lang`** (from tenant `default_language` via `normalize_lang_for_messages`).
- **`email_service.py`:** Confirmation passes `settings.public_app_base_url` into the wrapper; reminders delegate to **`render_reminder_email()`**.
- **`messages.py`:** New reservation email keys (en, es, ca, de, zh-CN, hi, bg, fr) + **`normalize_lang_for_messages()`**.
- **Timezone:** Reminder **plain text** includes `email_reservation_timezone_note` only when **`tenant.timezone`** is non-empty; if unset, no line is added (guest should infer from date/time shown).

## Testing instructions
1. **Unit tests (back container):**  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest tests/test_reservation_reminder_email.py tests/test_reservation_email_template.py -q`  
   Expect: all passed.
2. **Manual / SMTP (optional):** With SMTP configured, create a public booking with email or use **Send reminder** on a reservation with email; confirm HTML shows card layout, optional logo if tenant has logo + `PUBLIC_APP_BASE_URL`, localized strings match tenant **Settings → default language** where applicable.
3. **Regression:** Custom confirmation templates (Settings → Email) still respect placeholder allowlist; body still renders inside the new outer wrapper.
