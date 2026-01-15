-- Migration 20260115104644: add language and currency code and i18n text
-- Description: add language and currency code and i18n text
-- Date: 2026-01-15 10:46:44

-- Add tenant currency_code (ISO 4217) and default_language
ALTER TABLE tenant
  ADD COLUMN IF NOT EXISTS currency_code TEXT,
  ADD COLUMN IF NOT EXISTS default_language TEXT;

-- Backfill currency_code from existing tenant.currency symbol/text when possible.
UPDATE tenant
SET currency_code = CASE
  WHEN currency IS NULL OR btrim(currency) = '' THEN NULL
  WHEN upper(currency) = 'EUR' OR currency = '€' THEN 'EUR'
  WHEN upper(currency) = 'MXN' THEN 'MXN'
  WHEN upper(currency) = 'USD' OR currency = '$' THEN 'USD'
  WHEN upper(currency) = 'INR' OR currency = '₹' THEN 'INR'
  WHEN upper(currency) = 'CNY' OR currency = '¥' THEN 'CNY'
  WHEN upper(currency) = 'TWD' THEN 'TWD'
  ELSE NULL
END
WHERE currency_code IS NULL;

-- Default language (kept NULL if not set; app falls back to browser/en)
UPDATE tenant
SET default_language = 'en'
WHERE default_language IS NULL;

-- Generic translation storage: tenant overrides + global base translations (tenant_id NULL)
CREATE TABLE IF NOT EXISTS i18n_text (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NULL REFERENCES tenant(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id BIGINT NOT NULL,
  field TEXT NOT NULL,
  lang TEXT NOT NULL,
  text TEXT NOT NULL
);

-- Ensure uniqueness for tenant-scoped translations
CREATE UNIQUE INDEX IF NOT EXISTS i18n_text_unique_tenant
  ON i18n_text (tenant_id, entity_type, entity_id, field, lang)
  WHERE tenant_id IS NOT NULL;

-- Ensure uniqueness for global translations (tenant_id NULL)
CREATE UNIQUE INDEX IF NOT EXISTS i18n_text_unique_global
  ON i18n_text (entity_type, entity_id, field, lang)
  WHERE tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS i18n_text_lookup_tenant
  ON i18n_text (tenant_id, entity_type, entity_id, lang);

CREATE INDEX IF NOT EXISTS i18n_text_lookup_global
  ON i18n_text (entity_type, entity_id, lang)
  WHERE tenant_id IS NULL;

