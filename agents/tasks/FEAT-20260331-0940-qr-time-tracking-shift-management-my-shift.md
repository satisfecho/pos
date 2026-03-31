# QR-based time tracking and shift management ("My Shift")

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/121

## Problem / goal

Implement a **shift management** module so staff can track work time at the venue using **QR-based clock-in/out**, with optional **location verification** (e.g. GPS) when scanning. Support **breaks**: paused shift state, resume by scanning the venue QR again. Provide **owner/manager manual override** when someone forgets to scan, for payroll and compliance. Deliver a simple **employee** view (status, time worked today, scan action) and an **admin** view (who is on-site, on break, or not clocked in).

Align with existing auth/roles, tenant model, and any HR or employee docs under `docs/` if present.

## High-level instructions for coder

- Model employees, shifts, breaks, and scan events with clear audit fields; respect tenant scoping and privacy rules for legal/identity data storage.
- Generate or configure **per-venue (or per-tenant) QR payloads** that authenticate clock-in/out and tie scans to timestamps (and optional geolocation when enabled).
- Implement **pause/resume** flow: entering break from "My Shift"; returning requires scanning the QR to resume the active shift timer.
- Build **admin manual entry/adjustment** for shifts with appropriate role checks and an audit trail.
- Ship **employee** and **admin** UIs as described; keep mobile-friendly tap targets for the scan entry point.
- Add tests or smoke coverage for critical paths if the repo pattern supports it.
