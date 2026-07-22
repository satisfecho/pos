# Mark WhatsApp reservation reminders as shipped in docs/0024

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`docs/0024-whatsapp-reminder-notes.md` still reads as a **design / recommendation / implementation outline** (“why add WhatsApp”, “worth doing”). The product already sends reservation reminders via **Twilio WhatsApp** when configured (`whatsapp_service.py`, `POST /reservations/{id}/send-reminder`, `TWILIO_*` in `config.env.example`). Operators following 0024 may think the feature is unbuilt; agents treat the doc as stale plan noise.

## Evidence (008 preflight / review)

- `SIGNAL docs_stale` — `docs/0024-whatsapp-reminder-notes.md` age_days≈119
- Code: `back/app/whatsapp_service.py`; `settings.twilio_*`; reminder endpoint returns `whatsapp_sent`
- `config.env.example` documents `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`
- No open root task covers WhatsApp / 0024 (grep)

## High-level instructions for coder

- Update **`docs/0024-whatsapp-reminder-notes.md` only** (no bulk `docs/` rewrite): add a short **Status: shipped** section at the top (email and/or WhatsApp on Send reminder; phone-only OK when Twilio configured).
- Document required env vars and point to `config.env.example`; note E.164 normalization and that production may need Meta-approved templates (existing note in code docstring).
- Soften or retitle remaining “recommendation / outline” sections so they read as historical design notes, not unfinished work.
- Optionally one-line cross-link from **`docs/README.md`** Reference row for 0024 (“shipped Twilio channel” wording).
- Pass criteria: a reader of 0024 knows reminders work today and which env vars to set; `rg -i 'shipped|TWILIO' docs/0024-whatsapp-reminder-notes.md` hits; no product code changes required.
- Append **Testing instructions** only if anything beyond docs is touched.
