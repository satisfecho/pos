# WhatsApp reservation reminder – Notes and options

This document captures thoughts on adding **WhatsApp reminders** for reservations when the guest has a mobile phone number, alongside (or instead of) the existing email reminder.

---

## 1. Current state

- **Reminder today**: `POST /reservations/{id}/send-reminder` sends an **email** only; it requires `customer_email`. Staff triggers it from the reservations UI.
- **Reservation model**: `customer_phone` (required), `customer_email` (optional). So many reservations have a phone but no email – WhatsApp would reach those guests.

---

## 2. Why add WhatsApp

- **Reach**: Guests often prefer WhatsApp; open rates are high. If they didn’t give email, we can still remind them via phone.
- **Consistency**: One reminder flow (staff clicks “Send reminder”); backend chooses channel(s): email if present, WhatsApp if phone present and configured.
- **Reduces no-shows**: Same goal as email reminder; more channels = better chance they see it.

---

## 3. Recommendation: add WhatsApp as an optional channel

- **Keep email reminder** as is. Add “send via WhatsApp when phone number is present and WhatsApp is configured”.
- **One action for staff**: “Send reminder” → backend sends email (if email present) and/or WhatsApp (if phone present and tenant/app has WhatsApp enabled). No need for two buttons unless you want “Email only” / “WhatsApp only” for power users.
- **Phone format**: WhatsApp (and most APIs) require **E.164** (e.g. `+34931234567`). Store or normalize `customer_phone` to E.164 when sending; accept national format on input and normalize in backend or at send time.
- **Optional per tenant**: Config flag “Allow WhatsApp reminders” and/or “WhatsApp enabled” so only tenants that have set up WhatsApp get it. Global config is simpler for v1.

---

## 4. How to send WhatsApp messages

Two main approaches:

| Option | Pros | Cons |
|--------|------|------|
| **WhatsApp Business API (Meta)** | Official, full control, templates. | Business verification, Meta approval, conversation-based pricing. Setup is heavier. |
| **Provider (Twilio, MessageBird, 360dialog, etc.)** | Faster onboarding, often same API under the hood, support. | Monthly/provider cost; dependency on third party. |

For a typical POS/restaurant product, **using a provider** (e.g. Twilio Conversations for WhatsApp, or a dedicated WhatsApp API provider) is often the fastest way to get “send template message to +34…” working. You still need a Meta Business Account and an approved **template** for the first message (e.g. “Reservation reminder: …”).

**Template requirement**: For “business-initiated” messages (we message the user first), Meta requires **pre-approved message templates**. You’d submit something like: “Hi {{1}}, reminder: your reservation at {{2}} on {{3}} at {{4}}. Party of {{5}}. See you soon!” and use it when sending. No free-form body for the first message in a 24h window.

---

## 5. Design choices

| Topic | Recommendation |
|--------|----------------|
| **When to send WhatsApp** | If “Send reminder” is clicked and `customer_phone` is present and valid (E.164 or normalizable) and WhatsApp is configured → send WhatsApp in addition to (or instead of) email when no email. |
| **Email + phone both present** | Send **both** email and WhatsApp so the guest gets the reminder in both channels (best chance they see it). Optionally make this configurable later. |
| **Phone only** | Send WhatsApp only (no email). Today we’d return 400 “no email”; with WhatsApp we no longer require email for reminders. |
| **Phone format** | Normalize to E.164 before calling the API (e.g. strip spaces/dashes, add country code from tenant locale or default). Validate that the number looks like a mobile (optional). |
| **Failure handling** | If WhatsApp send fails (invalid number, provider error), log and optionally still send email if present. Return 200 with e.g. `{"email_sent": true, "whatsapp_sent": false}` so UI can show “Reminder sent by email; WhatsApp failed”. |
| **Consent / opt-in** | In some jurisdictions, reminder SMS/WhatsApp may be considered “service” and allowed without explicit opt-in; others require consent. Document that the guest gave their phone for the reservation; if you add marketing later, get explicit opt-in. For “reminder for your reservation” only, usually acceptable; legal review per market is recommended. |

---

## 6. Implementation outline

### Backend

- **Config**: Add WhatsApp provider config (e.g. Twilio or 360dialog): account SID, token, WhatsApp sender (e.g. Twilio WhatsApp number or Meta WABA number). Optional per-tenant (e.g. `tenant.whatsapp_enabled`, `tenant.whatsapp_sender_id`) or global.
- **Phone normalization**: Helper to convert `customer_phone` to E.164 (default country from tenant timezone/locale or app default). Reject or skip send if number is clearly invalid (e.g. too short).
- **WhatsApp send**: New function (e.g. in `notification_service.py` or `whatsapp_service.py`) that calls the provider API with the approved template and variables (name, tenant, date, time, party size). Use async HTTP; don’t block email send.
- **Reminder endpoint**: In `POST /reservations/{id}/send-reminder`:  
  - If `customer_email` present → send email (existing).  
  - If `customer_phone` present and WhatsApp configured → normalize phone, send WhatsApp template.  
  - Return e.g. `{"email_sent": bool, "whatsapp_sent": bool}` (and optional `to_email` / `to_phone` for transparency).
- **Behaviour when no email**: Today we 400 if no email. With WhatsApp: if phone present and WhatsApp sent, return 200 and `whatsapp_sent: true`; if no email and no phone (or WhatsApp not configured), keep 400 or return 400 “No email or phone for reminder”.

### Frontend

- **Reservations UI**: “Send reminder” stays one action. Optionally show “Reminder sent by email and WhatsApp” or “Reminder sent by WhatsApp” when the response indicates it. If only one channel is configured, message can stay generic (“Reminder sent”).
- **Settings**: If you add per-tenant WhatsApp, add a settings section “WhatsApp reminders” (enable/disable, optional sender id). Global config only = no UI change.

### Template and provider

- **Meta**: Create WhatsApp Business Account, get approved template for “reservation reminder” (variables: name, restaurant, date, time, party size). Use same template in all tenants or allow tenant to select template id if you have multiple.
- **Provider**: Sign up (e.g. Twilio), enable WhatsApp, link Meta WABA, configure webhook if needed. Store credentials in env or tenant settings.

---

## 7. Summary

- **Worth doing**: WhatsApp reminder when the user has a mobile number increases reach and fits real-world usage (phone often present, email optional).
- **Approach**: Add WhatsApp as a second channel next to email; one “Send reminder” action; backend sends to both when both are present and configured.
- **Tech**: Use a provider (Twilio, MessageBird, 360dialog, etc.) and an approved Meta template; normalize phone to E.164; return sent status per channel so the UI can reflect it.
- **Scope**: Config (global or per-tenant), phone normalization, one send function, and reminder endpoint changes. Optional: per-tenant enable/disable and “reminder sent by WhatsApp” in the UI.
