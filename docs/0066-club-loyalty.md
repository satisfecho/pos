# Club loyalty (points / stamps)

**Status:** MVP + VIP tiers + referral (#327 / #334) + Wallet pass issuance (#343). Apple PassKit `.pkpass` / Google Wallet API run when platform certs/issuer are configured; otherwise join falls back to the balance card.

## Goal

Tenant-scoped loyalty distinct from pricing promos (**#322**):

- Guests join via public URL `/loyalty/{tenantId}` (optional `?ref=` referral code)
- Bare `/loyalty` (no tenant id) shows a short “need a restaurant link” page - it does **not** redirect to the Satisfecho marketing landing (#373)
- Staff enable rules under **Settings → Loyalty club**
- Units (points or stamps) earn **once per paid order** when the order is linked to a membership
- Staff redeem a reward at checkout → `order.loyalty_discount_cents` (order-level discount via `order_discounts.order_level_discount_cents`, shared with #322)
- Balance never goes negative (ledger + check)
- **VIP tiers** from lifetime earn; **referral** awards on successful referred join

## Data model

| Table | Role |
|-------|------|
| `loyalty_program` | One row per tenant: enabled, mode (`points`\|`stamps`), earn rate, redemption threshold, reward discount cents, optional `birthday_bonus_units`, VIP thresholds, referral bonuses, `wallet_passes_enabled` |
| `loyalty_membership` | Member identity (name + email/phone), opaque `member_token`, cached `balance`, `lifetime_earn_units`, opaque `referral_code`, optional `referred_by_membership_id`, birthday fields, Apple/Google pass ids |
| `loyalty_ledger_entry` | Append-only `earn` / `redeem` / `adjust`; optional `order_id`; unique earn-per-order; unique referral-reward note per invitee |
| `loyalty_apple_device` | PassKit device registrations (`device_library_identifier` + `push_token`) for balance push-update |
| `order` columns | `loyalty_membership_id`, `loyalty_discount_cents`, `loyalty_units_redeemed` |

Migrations: `back/migrations/20260726162500_club_loyalty.sql`, `20260726223000_split_by_line_and_loyalty_birthday.sql`, `20260727073523_loyalty_vip_referral.sql`, `20260801131339_loyalty_wallet_passes.sql`.

## VIP tiers (#334)

**Rule:** Tier is derived from **lifetime earn** (`lifetime_earn_units` = sum of positive `earn` ledger units), **not** current balance. Redeeming or adjusting does **not** demote VIP.

| Threshold (program) | Effect |
|---------------------|--------|
| `vip_silver_min_lifetime_units` | ≥ value → `silver` (0 = silver off) |
| `vip_gold_min_lifetime_units` | ≥ value → `gold` (0 = gold off; must be ≥ silver when both > 0) |

Membership API payloads include `vip_tier` (`null` \| `"silver"` \| `"gold"`). Shown on staff member list and public balance card.

## Referral rewards (#334)

**Award trigger:** once when a **new** membership is created with a valid `referral_code` (not on returning join by same email/phone).

- Each member gets an opaque `referral_code`; share link `/loyalty/{tenantId}?ref={code}`.
- Program: `referral_bonus_units` → referrer; optional `referral_invitee_bonus_units` → invitee (0 = that side off).
- Ledger: referrer `earn` with note `Referral reward for membership {invitee_id}` (unique index prevents double-claim); invitee flag `referral_reward_granted`.
- **Self-referral** rejected (same email/phone as referrer, or same membership id).
- Invalid code → 400. Returning existing member → no second referral award.

## Earn / redeem

- **Earn:** after `paid_at` is set (`mark-paid`, `finish`, Stripe/Revolut confirm), `loyalty_service.award_on_order_paid` runs if `loyalty_membership_id` is set. Idempotent (one `earn` ledger row per order). Also increments `lifetime_earn_units`.
- **Birthday bonus (#331):** when `birthday_bonus_units > 0` and the member’s month/day matches `paid_at` (UTC), extra units are folded into that earn row (or a standalone earn with `order_id` null if the order already had an earn). Once per calendar year (`birthday_bonus_year`). Join accepts optional birthday; linked `BillingCustomer.birth_date` can seed month/day.
- **Redeem:** `POST /orders/{id}/loyalty/redeem` with `membership_id` or `member_token`. Requires balance ≥ threshold; writes `redeem` ledger row and sets order discount fields.
- **Manual adjust:** `POST /loyalty/memberships/{id}/adjust` - **owner/admin** (`loyalty:write`) only. Adjust does **not** change lifetime earn / VIP.
- **Delete member:** `DELETE /loyalty/memberships/{id}` - **owner/admin** (`loyalty:write`) only; hard delete (see below).
- **Permissions:** `loyalty:read`, `loyalty:write` (program + adjust + delete), `loyalty:redeem` (waiter+).
- **Wallet push:** every ledger change best-effort notifies Apple (tag bump + APNs when configured) and Google (object PATCH).

## APIs (summary)

- Public: `GET/POST /public/tenants/{id}/loyalty`, `POST /public/tenants/{id}/loyalty/recover` (email/phone → card token, #372), `GET /public/loyalty/members/{token}`, wallet status, `…/wallet/apple.pkpass`, `…/wallet/google`
- PassKit web service: `/public/passkit/v1/devices/…`, `/public/passkit/v1/passes/…`, `/public/passkit/v1/log`
- Staff: `GET/PUT /loyalty/program` (includes `wallet_passes_enabled`), memberships list/detail/adjust/delete (`GET /loyalty/memberships?search=`, `DELETE /loyalty/memberships/{id}`), order link + redeem

Public loyalty GETs use `@public_menu_ip_limit()` (not `@limiter.limit(public_menu_ip_limit)` - that passes the helper function instead of a rate string and 500s under live SlowAPI). Join and recover use a dedicated per-hour limit. All SlowAPI-wrapped handlers take `request: Request` and `response: Response` so rate-limit headers inject correctly.

### Recovering a lost card (#372)

- Guests who lost wallet/bookmark use **Already a member?** on `/loyalty/{tenantId}` with the same email or phone used at join. `POST …/loyalty/recover` returns the opaque `member_token` and card URL (does not create a new membership).
- Re-joining with the same email/phone still returns the existing membership (unchanged).
- Staff: Settings → Loyalty club member list supports search (name/email/phone) and **Copy card link** to share `/loyalty/card/{token}` without pasting raw tokens into docs.
- After join/recover, the public page always shows the balance card link (not only when Wallet buttons are available).

### Deleting a member (#362)

- Staff with **`loyalty:write`** (owner/admin) can remove a membership from Settings → Loyalty club (confirm dialog) via `DELETE /loyalty/memberships/{id}`.
- **Hard delete** (no soft-delete column): ledger rows and Apple device registrations cascade; `order.loyalty_membership_id` and `referred_by_membership_id` become null.
- Waiters (`loyalty:redeem` only) and other tenants cannot delete. Public card/recover for that token returns 404 after delete.

## Interaction with #322 (price promos)

Line-level category % promos reduce `OrderItem.price_cents` and store a promo audit snapshot (`docs/0068-price-promotions.md`). Loyalty redemption remains an **order-level** discount on `loyalty_discount_cents`, subtracted through `order_discounts.order_level_discount_cents` for guest checkout, staff totals, and fiscal amount. Do not invent a parallel order-level discount column.

## Wallet: Apple PassKit & Google Wallet (#343)

**Do not invent signing formats.** Follow official docs:

- Apple: [Wallet Developer Guide / PassKit](https://developer.apple.com/documentation/walletpasses) - `.pkpass` ZIP with `pass.json`, manifest SHA-1 hashes, PKCS#7 signature using Apple WWDR + Pass Type ID certificate.
- Google: [Google Wallet API](https://developers.google.com/wallet) - issuer account + service account JWT; loyalty object/class updates for balance pushes.

Implementation: `back/app/loyalty_wallet.py`.

### Config model (shared platform + per-tenant opt-out)

Satisfecho uses **one shared** Apple Pass Type ID and **one** Google Wallet issuer for the platform (env below). Each pass’s `organizationName` / Google `issuerName` is the **restaurant tenant name**. Tenants can turn issuance off with `loyalty_program.wallet_passes_enabled` (Settings → Loyalty club) without disabling join or the balance card.

**Apple multi-merchant note:** A single Pass Type ID for an organization’s own loyalty passes (branded per merchant in pass fields) is the usual SaaS pattern. Confirm ongoing Apple Developer Program terms for your account; if Apple requires a Pass Type ID per merchant, you would need per-tenant cert onboarding (not implemented - out of scope for this MVP).

### Setup steps

1. **Apple:** Apple Developer → Identifiers → Pass Type ID; create Pass signing certificate; download Apple WWDR intermediate; export cert + key as PEM on the server (never commit). Optionally create an APNs Auth Key (`.p8`) for push-update.
2. **Google:** Google Pay & Wallet Console → create issuer; create a service account with Wallet Object Issuer role; download JSON to the server path in env.
3. Set env vars (below), restart `back`, confirm `GET /public/loyalty/members/{token}/wallet` shows `apple_wallet_available` / `google_wallet_available` when files exist.
4. Join a test member → download `.pkpass` / open Google save URL. Adjust balance → Google PATCH + Apple tag/APNs (devices registered via PassKit web service).

### Operational dependencies (env)

Documented in `config.env.example`:

| Variable | Purpose |
|----------|---------|
| `LOYALTY_APPLE_PASS_TYPE_ID` | Pass Type ID |
| `LOYALTY_APPLE_TEAM_ID` | Apple Team ID |
| `LOYALTY_APPLE_PASS_CERT_PATH` | Pass signing cert (PEM path on server) |
| `LOYALTY_APPLE_PASS_KEY_PATH` | Private key path (PEM) |
| `LOYALTY_APPLE_WWDR_CERT_PATH` | Apple WWDR intermediate PEM |
| `LOYALTY_APPLE_APNS_KEY_PATH` | Optional APNs `.p8` for PassKit push (HTTP/2) |
| `LOYALTY_APPLE_APNS_KEY_ID` | APNs key id |
| `LOYALTY_APPLE_WEB_SERVICE_BASE_URL` | Optional override; default `{PUBLIC_APP_BASE_URL}{ROOT_PATH}/public/passkit` |
| `LOYALTY_GOOGLE_ISSUER_ID` | Google Wallet issuer |
| `LOYALTY_GOOGLE_SERVICE_ACCOUNT_JSON` | Path to service-account JSON (**never commit**) |

### `wallet_pass_status()` behaviour

Returned on public program/join/balance and staff program GET:

| Field | Meaning |
|-------|---------|
| `apple_wallet_configured` / `google_wallet_configured` | Env vars non-empty |
| `apple_wallet_available` / `google_wallet_available` | Env set **and** cert/JSON files exist on disk **and** tenant `wallet_passes_enabled` |
| `detail` | Human-readable **operator** status (staff Settings only). Omitted from public guest APIs (#393). |
| `apple_pkpass_path` / `google_save_url` | Present when download/save is ready for that member |

When unavailable: join still works; balance card URL `/loyalty/card/{memberToken}` still works if the guest has the link. Public `/loyalty/{tenantId}` does **not** show certificate/issuer setup copy or Add-to-Wallet buttons when Wallet is unavailable (#393). The post-join “Save this card link” block is shown only when at least one Wallet action is available.

### Issuance + push-update

- **Apple join/download:** `GET /public/loyalty/members/{token}/wallet/apple.pkpass` builds a signed storeCard pass (balance + member name). `webServiceURL` points at `/public/passkit` for device registration and updated-pass fetch.
- **Apple push:** On balance change, bump `apple_pass_updated_tag` and send empty APNs payload to registered devices when APNs `.p8` is configured (requires HTTP/2 / `h2` with httpx). Devices then `GET` the latest `.pkpass` - update, not reissue.
- **Google join:** Create loyalty class (per tenant) + loyalty object; return JWT save URL (`google_save_url`).
- **Google push:** `PATCH` loyalty object points balance on earn/redeem/adjust.

## Testing

- `back/tests/test_club_loyalty.py` - tenant isolation, earn-once, redeem, non-negative balance, wallet unconfigured, VIP, referral.
- `back/tests/test_loyalty_wallet.py` - `.pkpass` generation, Google create/PATCH (mocked HTTP), PassKit register + update list, tenant disable fallback.
