-- Migration: product stock alert fields (#356 / discussion #21)
-- Add per-product stock quantity and alert threshold for Products UI.

ALTER TABLE product
  ADD COLUMN IF NOT EXISTS stock_alert_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE product
  ADD COLUMN IF NOT EXISTS stock_qty INTEGER NOT NULL DEFAULT 0;

ALTER TABLE product
  ADD COLUMN IF NOT EXISTS stock_alert_level INTEGER NOT NULL DEFAULT 0;
