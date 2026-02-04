-- Add table PIN security and location verification fields
-- This migration adds support for:
-- 1. Table activation with PIN codes for order validation
-- 2. One shared order per active table (active_order_id)
-- 3. Optional GPS location verification for tenants

-- Table changes for PIN security
ALTER TABLE "table" ADD COLUMN IF NOT EXISTS order_pin VARCHAR(6);
ALTER TABLE "table" ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;
ALTER TABLE "table" ADD COLUMN IF NOT EXISTS active_order_id INTEGER;
ALTER TABLE "table" ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP;

-- Index for quick lookup of active tables
CREATE INDEX IF NOT EXISTS idx_table_is_active ON "table" (is_active);

-- Foreign key constraint for active_order_id (table references order)
-- Note: Using DO block to handle case where constraint already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_table_active_order'
    ) THEN
        ALTER TABLE "table" ADD CONSTRAINT fk_table_active_order 
            FOREIGN KEY (active_order_id) REFERENCES "order"(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Tenant location settings for GPS verification
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS location_radius_meters INTEGER DEFAULT 100;
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS location_check_enabled BOOLEAN DEFAULT FALSE;

-- Order item tracking: who added the item and location flag
ALTER TABLE orderitem ADD COLUMN IF NOT EXISTS added_by_session VARCHAR;
ALTER TABLE orderitem ADD COLUMN IF NOT EXISTS location_flagged BOOLEAN DEFAULT FALSE;

-- Order location verification tracking
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS location_verified BOOLEAN;
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS flagged_for_review BOOLEAN DEFAULT FALSE;
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS flag_reason VARCHAR;
