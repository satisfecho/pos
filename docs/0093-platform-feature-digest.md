# Platform monthly feature digest (#453)

Platform operators can email **verified restaurant owners** a monthly “what is new” digest. This is separate from tenant guest marketing ([0079-newsletter.md](0079-newsletter.md)).

## Product decisions (from #453)

| Topic | Decision |
|-------|----------|
| Cadence / audience | Monthly email to all verified sign-ups / owners who have not unsubscribed |
| Consent | Signup verification email states they subscribe and can unsubscribe anytime |
| Unsubscribe | Link in every digest; opaque token on `user.feature_digest_unsub_token` |
| Content | Manual draft in the platform portal (paste CHANGELOG / FEAT highlights as needed) |
| Sender | Configurable platform SMTP in `/platform/feature-digest` (falls back to global `SMTP_*`) |
| Locale | Configurable; **default English** |

## Operator UI

- Dashboard link → `/platform/feature-digest`
- Save SMTP + locale
- See subscribed audience count
- Compose subject + HTML body → queue send (~30 messages/minute via background worker)

## API

| Method | Path | Auth |
|--------|------|------|
| `GET`/`PUT` | `/platform/feature-digest/settings` | platform operator |
| `GET` | `/platform/feature-digest/audience` | platform operator |
| `GET`/`POST` | `/platform/feature-digest/campaigns` | platform operator |
| `GET` | `/public/feature-digest/unsubscribe/{token}` | public HTML |

## Privacy

- Do not log full recipient lists or SMTP passwords.
- Password is never returned from settings GET (`smtp_password_set` only).
- Soft-deleted tenants are excluded from the audience.

## Related

- [0059-platform-operator-portal.md](0059-platform-operator-portal.md)
- [0088-owner-signup-email-verify-inactive-tenants.md](0088-owner-signup-email-verify-inactive-tenants.md)
- [0005-email-sending-options.md](0005-email-sending-options.md)
