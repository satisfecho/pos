# Reject default SECRET_KEY placeholder (#423)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/423
- **423**

## Problem / goal
Startup does not reject the placeholder `SECRET_KEY` (`CHANGE_THIS_IN_PRODUCTION`). An operator who hand-creates `config.env` and leaves the default can run with a world-known key that signs JWTs and seeds Fernet encryption for stored Stripe/Revolut secrets. Deploy scripts may generate a real key, but that is not a hard guard. See `docs/SECURITY-REVIEW.md` (secrets / sessions) and `config.env.example`.

## High-level instructions for coder
- Add a startup / settings validation that **refuses to boot when production** (or equivalent `is_production`) if `SECRET_KEY` (and related refresh/crypto seeds if they share the same placeholder pattern) still starts with or equals the documented placeholder (`CHANGE_THIS…`).
- Keep local/dev usable: do not break `./run.sh` / docker-compose.dev with a hard fail unless the same production flag is set; document the rule in `config.env.example` or deploy docs if needed.
- Confirm `scripts/deploy-amvara9.sh` / prod overlay still supply a non-placeholder key so amvara9 is unaffected.
- Do not paste real secrets into tasks, commits, or logs; only reject known placeholders.
- Smoke: with `PRODUCTION=true` and placeholder key, process exits/fails clearly; with a non-placeholder key, app starts; existing auth/login smoke still passes in normal dev.
