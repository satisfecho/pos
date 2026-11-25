# Roadmap: CAPTCHA after failed login (#452)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/452
- **452**

## Status
- **Blocked - waiting for human:** CAPTCHA provider and threshold (failed attempts before challenge) not decided on #452. Prefer privacy-friendly option; do not invent provider unilaterally.
- **Waiting notice posted:** 2026-11-25T09:45:20Z

## Problem / goal
Add CAPTCHA after failed login attempts as a nice-to-have on top of existing rate limits. Listed as not implemented in `docs/0020-rate-limiting-production.md`. Goal: reduce credential-stuffing / automated login abuse when rate limits alone are not enough, without harming normal staff login.

## High-level instructions for coder
- Read `docs/0020-rate-limiting-production.md` and the current login / token rate-limit path (`POST /api/token` or equivalent) before designing.
- Propose a minimal slice: show CAPTCHA (or equivalent challenge) only after N failed logins for the same identity/IP (reuse Redis/rate-limit patterns where practical). Prefer a privacy-friendly provider or self-hosted option; do not hard-code secrets - use `config.env` / `config.env.example`.
- Wire challenge verification on the backend before issuing a token; update the Angular login UI and i18n (EN/ES/DE/CA at minimum).
- Keep tenant scoping and existing rate limits intact; CAPTCHA is additive, not a replacement.
- If product/provider choice is unclear (reCAPTCHA vs hCaptcha vs Turnstile vs none), post **one** waiting-for-human comment on #452 and park the FEAT per `agents2/TASKS-README.md` rather than inventing a provider unilaterally.
- Work on **`development`**. Add or extend smoke coverage (e.g. rate-limit / login Puppeteer) only for the chosen slice.
- Do not paste secrets, API keys, or provider site keys into the task file or commits.
