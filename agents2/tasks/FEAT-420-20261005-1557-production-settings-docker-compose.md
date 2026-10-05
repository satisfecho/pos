# Set PRODUCTION in docker-compose prod overlay (#420)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/420
- **420**

## Problem / goal
`PRODUCTION` is never set in `docker-compose.prod.yml`, so `settings.is_production` stays `False` in production. Auth cookies omit the `Secure` flag, and login/register/payment rate limits stay on relaxed dev values. HAProxy HTTP→HTTPS helps cookies partially, but production should set `PRODUCTION=true` (or the documented env alias). See `docs/SECURITY-REVIEW.md` (cookie flags) and `docs/0004-deployment.md` / `docs/0001-ci-cd-amvara9.md`.

## High-level instructions for coder
- Set `PRODUCTION=true` (or the env name `settings` already reads via `validation_alias`) for the **backend** (and any other service that reads the same flag) in the **prod** compose overlay only — not in the default/dev overlay.
- Verify cookie `secure=` and production rate-limit paths use `settings.is_production` as intended after the env is set.
- Update deploy/docs briefly if operators must also set `PRODUCTION` in `config.env` (prefer compose overlay so amvara9 gets it without a silent miss).
- Confirm local `docker-compose.dev.yml` still runs with `is_production=False`.
- Smoke: inspect prod overlay env; in dev, login still works; no regression on `/api/token` happy path.
