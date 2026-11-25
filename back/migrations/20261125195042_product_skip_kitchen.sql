-- Migration 20261125195042: Product skip_kitchen (ready-made / no KDS)
-- Description: Flag prepared catalog items so order lines skip kitchen/bar routing
-- Date: 2026-11-25
-- Issue: #454

ALTER TABLE product ADD COLUMN IF NOT EXISTS skip_kitchen BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN product.skip_kitchen IS
  'When true, order lines for this product skip kitchen/bar KDS (ready-made / no prep)';
