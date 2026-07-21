-- Migration: Add OrderStatus.out_for_delivery for courier pickup / en route
-- Date: 2026-07-21

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'out_for_delivery'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'orderstatus')
    ) THEN
        ALTER TYPE orderstatus ADD VALUE 'out_for_delivery';
    END IF;
END $$;
