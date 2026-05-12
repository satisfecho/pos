# Login — fix iOS Safari autofill leaving submit button disabled

## GitHub Issues

- **Issue:** https://github.com/satisfecho/pos/issues/204
- **204**

## Problem / goal

On iPhone Safari, Keychain/password autofill can fill email and password without firing normal input events, so the reactive login form may stay invalid and the Sign In control stays disabled even though values are visible. Fix behavior on the staff login screen only (`front/src/app/auth/login.component.ts`); leave register, forgot-password, provider login, OTP, and API flows unchanged unless the issue explicitly requires it.

## High-level instructions for coder

- Adjust submit control so it is not gated on `form.invalid` alone (iOS autofill bypasses Angular value tracking). Keep loading guard as today.
- In `onSubmit()`, call `updateValueAndValidity()` before reading state; if still invalid, `markAllAsTouched()` and return without calling the API.
- Optionally show inline validation for empty/invalid fields when touched, reusing existing `AUTH.*` keys and existing error styling—no new visual system.
- Do not change `autocomplete` values (`email` / `current-password`).
- Verify desktop browsers still log in; verify iPhone Safari path after Keychain fill; empty submit shows validation, not silent no-op.
- After implementation: note Angular build clean in `pos-front` logs; run landing smoke from `front/` as in the issue; add a short `[Unreleased]` changelog line for the login fix.
