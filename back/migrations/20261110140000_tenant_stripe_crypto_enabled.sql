-- Migration 20261110140000: tenant Stripe crypto (stablecoin) toggle
-- Description: Enable optional guest Pay with crypto via Stripe stablecoin payments (#439)
-- Date: 2026-11-10 14:00:00

ALTER TABLE tenant
ADD COLUMN IF NOT EXISTS stripe_crypto_enabled BOOLEAN NOT NULL DEFAULT FALSE;
