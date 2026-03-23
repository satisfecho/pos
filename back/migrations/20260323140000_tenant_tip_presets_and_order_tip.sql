-- POS tip presets (owner-configurable) and tip charged on orders (GitHub #58)
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS tip_preset_percents JSONB;
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS tip_tax_rate_percent INTEGER NOT NULL DEFAULT 0;
UPDATE tenant SET tip_preset_percents = '[5, 10, 15, 20]'::jsonb WHERE tip_preset_percents IS NULL;

ALTER TABLE "order" ADD COLUMN IF NOT EXISTS tip_percent_applied INTEGER;
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS tip_amount_cents INTEGER;
