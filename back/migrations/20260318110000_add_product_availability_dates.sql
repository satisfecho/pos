-- Product availability window: show on customer-facing menu only when today is within [available_from, available_until].
-- Enables planning upcoming products and end-dating products (e.g. provider change).

ALTER TABLE product ADD COLUMN IF NOT EXISTS available_from DATE;
ALTER TABLE product ADD COLUMN IF NOT EXISTS available_until DATE;

ALTER TABLE tenantproduct ADD COLUMN IF NOT EXISTS available_from DATE;
ALTER TABLE tenantproduct ADD COLUMN IF NOT EXISTS available_until DATE;

