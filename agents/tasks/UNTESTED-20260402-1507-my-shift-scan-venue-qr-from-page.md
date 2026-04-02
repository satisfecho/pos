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

## Implementation summary

- **Front:** `front/src/app/my-shift/my-shift.component.ts` — primary **Scan venue QR** when venue requires clock QR and the session has no token yet; modal uses **`html5-qrcode`** (`html5-qrcode@2.3.8`) with rear camera when available. Decoded text accepts the same payloads as before: full app URL with `?clock_qr=`, path+query, or raw **64-char hex** token (from `secrets.token_hex(32)`). On success, token is stored in **`sessionStorage`** (`clock_qr_{tenant_id}`) and the existing **`clockQrToken`** signal — same persistence as the **`?clock_qr=`** query-param path (which now funnels through **`persistClockQrToken`**). **Start / end shift** and break flows that require QR still use **`buildClockPayload()`**; no backend or security rule changes.
- **i18n:** New **`MY_SHIFT.*`** keys (scan UI, errors, verified line, updated **`QR_HINT`** / **`ERR_QR`**) in all shipped locale files under **`front/public/i18n/`**.
- **Coherent validation model:** Token is validated **when clock actions run** (existing API + `clock_qr` in body); the client only obtains and stores the token via URL, query on load, or scan — no separate “pre-flight” API.

## Testing instructions

1. **Build:** `cd front && npx ng build` (expect success).
2. **Tenant:** Enable staff clock QR in **Settings** (generate token; optional: note **`/my-shift?clock_qr=…`** URL for a printed QR).
3. **Flow:** Log in as staff → open **My shift** from the sidebar (no `clock_qr` in URL). Confirm **Scan venue QR** appears and **ERR_QR** no longer tells users to add query strings manually.
4. **Scan:** Use a device/browser with camera; tap **Scan venue QR**, allow camera; scan the venue QR (or a QR encoding the same URL/token). Confirm **Venue verified for this session** appears and **Start shift** / **End shift** (and break actions if applicable) work. If **GPS at venue** is enabled, still allow location when prompted.
5. **Negative:** Scan a random non-venue QR → expect invalid message and **Try again**; cancel closes the modal.
6. **Regression:** Open **`/my-shift?clock_qr=TOKEN`** in one tab — token should still be picked up and stripped from the URL as before.

Optional smoke: `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` (may fail if landing version banner ≠ `front/package.json` — environment-specific).
