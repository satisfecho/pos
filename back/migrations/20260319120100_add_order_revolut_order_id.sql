-- Migration 20260319120100: add revolut_order_id to order for Revolut payment linking
-- Description: Store Revolut order id when creating Revolut checkout
-- Date: 2026-03-19 12:01:00

ALTER TABLE "order"
ADD COLUMN IF NOT EXISTS revolut_order_id VARCHAR(255) DEFAULT NULL;
