# Owner signup email verify + inactive tenants (#442)

Anti-spam and hygiene for restaurant (tenant owner) signup.

## Email verification at signup

1. `POST /register` creates the tenant + owner with `email_verified=false`, stores a **SHA-256** hash of a random **six-digit** code, and emails the code (global SMTP).
2. Wizard step **2** on `/register` / `/signup` collects the code → `POST /register/verify-email` `{ email, code }`.
3. `POST /register/resend-verification` `{ email }` re-issues a code (no email enumeration).
4. Staff `POST /token` (and OTP completion) returns **403** `email_verification_required` until the owner is verified. Soft-deleted tenants return **403** `tenant_soft_deleted`.
5. On successful verify, Satisfecho notifies **`PLATFORM_OPERATOR_EMAIL`** (same mailbox as `/platform` login).

Code lifetime: `OWNER_SIGNUP_VERIFICATION_EXPIRE_MINUTES` (default 30). Local smokes may set `OWNER_SIGNUP_FIXED_CODE` (ignored when `PRODUCTION=true`).

## Inactive tenant housekeeping

| Stage | When | Action |
|-------|------|--------|
| Warning | Owner `last_login_at` (or tenant `created_at` if never logged in) older than **30 days** | Email owner; set `inactivity_warning_sent_at` |
| Soft-delete | Warning aged **7+ days** and still inactive | Set `soft_deleted_at`, `hard_delete_after` = soft + **60 days**; block login |
| Hard-delete | `hard_delete_after` reached | `delete_tenant_cascade` + upload cleanup (no legal retention) |

Owner login clears `inactivity_warning_sent_at` (cancels the clock). Demo tenant **id 1** is skipped unless `--include-demo`.

```bash
docker compose exec back python -m app.seeds.inactive_tenant_housekeeping --dry-run
./scripts/inactive-tenant-housekeeping-on-server.sh
```

Cron notes: [0001-ci-cd-amvara9.md](0001-ci-cd-amvara9.md) § Inactive tenant housekeeping.

## Related

- Guided signup / paywall: [0052-saas-signup-paywall.md](0052-saas-signup-paywall.md)
- Platform operator: [0059-platform-operator-portal.md](0059-platform-operator-portal.md)
- End-user customer verify (separate tables): [0002-customer-features-plan.md](0002-customer-features-plan.md)
