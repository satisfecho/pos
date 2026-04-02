# My shift: scan venue QR from the page instead of requiring `?clock_qr=` in the URL

## GitHub Issues

- [github.com/satisfecho/pos/issues](https://github.com/satisfecho/pos/issues)
- **Issue:** https://github.com/satisfecho/pos/issues/151

## Problem / goal

Staff who open **My shift** from normal navigation (without a venue QR URL) currently hit a confusing error and cannot clock in. The product goal is to let staff use the usual app flow, then **prove they are at the venue** from the My shift page—e.g. by scanning the physical venue QR with the device camera—using the same token/URL payload as today’s staff link. Server-side validation of venue tokens must stay strict; do not weaken security or expose secrets in UI or logs.

## High-level instructions for coder

- Review existing My shift / clock-QR flows and any docs under `docs/` that describe shift or QR behavior.
- Add a clear primary action on My shift (e.g. “Scan venue QR”) that opens camera-based scanning and parses the same payload as the current `?clock_qr=` flow.
- After a successful scan, treat the session as clock-QR validated so **Start shift** / **End shift** works consistently (one coherent flow: validate on scan vs. validate immediately before clock actions—pick one and document in the task outcome).
- Ensure copy is user-friendly; avoid telling end users to manually add query strings except possibly as an advanced fallback in internal docs.
- Verify acceptance: clock-in/out works when opening My shift from the sidebar after scanning the venue QR on that page; landing only via bookmarked QR URLs is no longer required.
