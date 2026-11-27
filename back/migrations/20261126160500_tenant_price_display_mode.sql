-- Migration: tenant price_display_mode (#455)
-- Description: Guest/staff price labels inclusive (default) vs exclusive; billed amounts stay tax-inclusive.
-- Date: 2026-11-26

ALTER TABLE tenant
    ADD COLUMN IF NOT EXISTS price_display_mode VARCHAR(16) NOT NULL DEFAULT 'inclusive';

COMMENT ON COLUMN tenant.price_display_mode IS
    'inclusive (default) or exclusive: how unit prices are shown; payable totals stay tax-inclusive';
