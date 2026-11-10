# Security: block negative-quantity price tampering on guest menu orders

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/440
- **440**
- **Advisory:** https://github.com/satisfecho/pos/security/advisories/GHSA-hm8g-49xv-2j5m
- **GHSA:** GHSA-hm8g-49xv-2j5m

## Problem / goal
Public guest order create accepts unbounded line `quantity`. Negative quantities can reduce the guest payable total so a take-away guest can underpay. Enforce `quantity >= 1` on create/merge paths and keep payment totals consistent with server-side quantities.

## High-level instructions for coder
- Implement and verify on `development` first. Keep labels `security` and `production-urgent`. After tester PASS and closer archives CLOSED, loop step 009 auto-promotes to `master` (production).
- Validate guest order item quantity lower bound in the API model and create-order path.
- Confirm guest payment amount uses the same server-side totals after the guard.
- Add or extend backend tests for rejected negative (and zero) quantities.
- Do not copy exploit steps from the advisory into code comments or commits.
- Point to related payment/order docs if useful.

## Status
- Queued by agent loop security-advisory watch (001) from GHSA-hm8g-49xv-2j5m.
