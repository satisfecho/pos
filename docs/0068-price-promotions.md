# Price promotions engine

**Status:** MVP shipped (#322).

## Goal

Tenant-scoped **pricing promotions** distinct from social-media scheduling (#199-#201) and from club loyalty earn/redeem (#327):

- Staff create/enable rules under **Settings → Promotions**
- MVP rule type: **`percent_off_category`** (e.g. 20% off `Beverages`)
- Eligibility: absolute `starts_at`/`ends_at`, optional local daily `start_time_local`/`end_time_local` (tenant timezone), optional `days_of_week` (Mon=0…Sun=6), optional `channels` (`table`, `satisfecho_delivery`, `marketplace`; empty/null = all)
- Public QR menu (`GET /menu/{token}`) and public tenant menu show live discounted `price_cents` plus `list_price_cents` / `promo_label`
- Order lines store audit: `list_price_cents`, `discount_cents` (unit), `promo_id`, `promo_snapshot` JSON
- Tax: discount applies to **tax-inclusive** list price; `tax_amount_cents` is recomputed from the paid unit price

## Stackability / loyalty

- **Line promos:** at most one promo per line - highest `percent_off` wins (ties: lowest id). The `stackable` flag is reserved for future multi-promo stacking.
- **Order-level:** loyalty redemption still writes `order.loyalty_discount_cents`. All payable and fiscal totals subtract it via `order_discounts.order_level_discount_cents` (shared path). Do not invent a second discount field for coupons later - extend that helper.

## Data model

| Table / columns | Role |
|-----------------|------|
| `price_promotion` | Tenant rules |
| `orderitem.list_price_cents` | Pre-promo unit price (null if no promo) |
| `orderitem.discount_cents` | Unit discount (list - paid) |
| `orderitem.promo_id` | FK to rule (nullable) |
| `orderitem.promo_snapshot` | Immutable `{id,name,promo_type,percent_off,category,stackable}` |

Migration: `back/migrations/20260726171000_price_promotions.sql`.

## APIs

- Staff: `GET/POST /promos`, `PUT/DELETE /promos/{id}` (`promo:read` / `promo:write`; delete soft-disables)
- Apply is automatic at menu load and order-item create (table + delivery)

## Permissions

`promo:read`, `promo:write` - owner/admin.

## Testing

See `back/tests/test_price_promotions.py`.
