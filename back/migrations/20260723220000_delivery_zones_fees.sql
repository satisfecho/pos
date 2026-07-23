-- Migration: Satisfecho Delivery zones/radius + fee snapshot (#306)
-- Description: Tenant delivery fee, radius, postal-code zones; order fee snapshot
-- Date: 2026-07-23

ALTER TABLE tenant
    ADD COLUMN IF NOT EXISTS delivery_fee_cents INTEGER NOT NULL DEFAULT 0;

ALTER TABLE tenant
    ADD COLUMN IF NOT EXISTS delivery_radius_meters INTEGER;

ALTER TABLE tenant
    ADD COLUMN IF NOT EXISTS delivery_postal_codes TEXT;

ALTER TABLE "order"
    ADD COLUMN IF NOT EXISTS delivery_fee_cents INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN tenant.delivery_fee_cents IS 'Flat Satisfecho Delivery fee in cents (0 = free)';
COMMENT ON COLUMN tenant.delivery_radius_meters IS 'Optional max delivery distance from tenant lat/lng; null = no radius check';
COMMENT ON COLUMN tenant.delivery_postal_codes IS 'Optional JSON array of allowed postal codes; null/empty = no postal check';
COMMENT ON COLUMN "order".delivery_fee_cents IS 'Delivery fee snapshot at create time (Satisfecho Delivery)';
