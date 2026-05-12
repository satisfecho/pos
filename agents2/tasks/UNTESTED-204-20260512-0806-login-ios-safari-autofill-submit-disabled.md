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

## Implementation (coder)

- Submit button: `[disabled]="loading()"` only (password step).
- `syncLoginFieldsFromDom()` patches `username` / `password` from `#email` and `#password` before `updateValueAndValidity()` so iOS Keychain-filled values match the reactive model.
- `onSubmit()`: sync → `updateValueAndValidity({ emitEvent: false })` → if invalid, `markAllAsTouched()` and return (no API).
- Inline hint under email when touched + invalid: `AUTH.INVALID_EMAIL`.
- Changelog: `[Unreleased]` / Fixed entry for #204.

## Testing instructions

1. **Angular build:** With the dev stack up, check `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --since 10m front` (or `docker logs --since 10m pos-front`) for no compile errors after the change.
2. **Smoke:** From `front/` with app on HAProxy (e.g. `http://127.0.0.1:4202`): `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version`.
3. **Desktop:** Open `/login`, enter valid credentials, submit — should reach dashboard as before.
4. **Empty submit:** Clear fields, submit — expect email field hint (`AUTH.INVALID_EMAIL`) after touch, no login API call, no silent no-op.
5. **iOS Safari (manual):** On iPhone, use Keychain to autofill email/password on `/login`, then Sign In — button must be tappable and login should proceed when credentials are valid.
