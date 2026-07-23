# Align no-show doc reminder API with WhatsApp channel

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`docs/0019-no-show-implementation-plan.md` still says `POST /reservations/{id}/send-reminder` **requires `customer_email`**, and the frontend summary says “Send reminder” only when email is present. That is outdated: reminders also send via WhatsApp when `customer_phone` is set and Twilio is configured. Support and fork implementers following 0019 will mis-test the API.

## Evidence (008 preflight / review)

- `SIGNAL docs_stale` — `docs/0019-no-show-implementation-plan.md` age_days≈127
- Live API: send-reminder allows email and/or phone+WhatsApp; 400 only when neither channel can send
- Related: NEW for 0024 WhatsApp shipped status (same review); keep this task scoped to **0019** only
- `docs/0023-prioritisation-019-022.md` already marks 0019 **Done** — do not reopen product scope

## High-level instructions for coder

- In **`docs/0019-no-show-implementation-plan.md`**, fix the Implemented summary / API rows so send-reminder requires **at least one** of email or (phone + WhatsApp configured); note optional view/cancel link via `PUBLIC_APP_BASE_URL` if already accurate.
- Update the frontend bullet if UI still gates the button on email only — if the UI is wrong, fix the **UI** in the same small task; if UI already allows phone-only, doc-only.
- Cross-link **`docs/0024-whatsapp-reminder-notes.md`** in one sentence; do not rewrite 0024 here.
- Pass criteria: `rg -n 'send-reminder|customer_email|WhatsApp' docs/0019-no-show-implementation-plan.md` no longer claims email-only; optional quick API/UI check on a booked reservation with phone and no email when Twilio unset still 400 as expected.
- Append **Testing instructions** when done.
