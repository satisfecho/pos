# Feedback / Prepayment amount needs to be separated

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/82

## Problem / goal

In **Settings → Reservations**, prepayment amount entry is awkward: users must mentally convert between cents and euros. The issue asks for separate controls (e.g. euros and cents) and to respect **multi-currency** behaviour—not a single hard-coded currency assumption.

## High-level instructions for coder

- Find reservation / prepayment settings in the frontend (and any API fields that store the amount).
- Design UX so major and minor units are clear per tenant currency (or use existing money-input patterns elsewhere in the app).
- Align with backend validation and stored representation (integer minor units vs display); avoid rounding surprises.
- Smoke-test with at least one non-EUR currency if the product supports it; document any limits in the issue if scope is constrained.
