# Newsletter sending (#435)

Staff (owner/admin with settings permission) can compose and send branded newsletter emails from **Settings → Newsletter**.

## Audience

Recipients come from existing tenant data (no second CRM):

| Source | Emails |
|--------|--------|
| Billing customers | `billing_customer.email` for the tenant (Factura CRM) |
| Reservations | Distinct `reservation.customer_email` for the tenant |
| Both | Union, deduplicated |

Staff must confirm opt-in (`consent_confirmed`) before a campaign is queued. There is no separate marketing-opt-in column in this slice - restaurants remain responsible for consent.

## Sending

- Uses the same per-tenant SMTP path as transactional mail (`email_service`; see [0005-email-sending-options.md](0005-email-sending-options.md), [0056-gmail-setup.md](0056-gmail-setup.md)).
- A background worker sends **~30 messages per minute** (2 s between sends) so SMTP is not flooded.
- Campaign and per-recipient status are stored (`newsletter_campaign`, `newsletter_recipient`). Full recipient lists are not written to application logs.

## Tracking

When `PUBLIC_APP_BASE_URL` (and optional `ROOT_PATH`) is set:

- **Opens:** 1×1 pixel at `/public/newsletter/o/{tracking_token}`
- **Clicks:** redirect at `/public/newsletter/c/{tracking_token}?u=<http(s) url>`

Tokens are opaque (no email in the URL). Only `http`/`https` destinations are allowed for click redirects.

## Staff API (auth)

- `GET /tenant/newsletter/audience`
- `GET /tenant/newsletter/campaigns`
- `POST /tenant/newsletter/campaigns`
- `POST /tenant/newsletter/campaigns/{id}/cancel`
- `POST /tenant/newsletter/test-send` - one immediate preview to the current user (or `to_email`)

## Privacy note

Prefer sending only to people who opted in to marketing. Transactional reservation/order email flows are unchanged.
