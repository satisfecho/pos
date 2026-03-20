-- Migration 20260319120000: add Revolut Merchant API secret to tenant
-- Description: Add revolut_merchant_secret for Revolut online payments
-- Date: 2026-03-19 12:00:00

ALTER TABLE tenant
ADD COLUMN IF NOT EXISTS revolut_merchant_secret VARCHAR(255) DEFAULT NULL;
