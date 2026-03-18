-- Add cost price to product, tenantproduct and orderitem for profit calculation.
-- product.cost_cents / tenantproduct.cost_cents: optional cost per unit (cents).
-- orderitem.cost_cents: snapshot of cost when item was added (for historical profit).

ALTER TABLE product ADD COLUMN IF NOT EXISTS cost_cents INTEGER;
ALTER TABLE tenantproduct ADD COLUMN IF NOT EXISTS cost_cents INTEGER;
ALTER TABLE orderitem ADD COLUMN IF NOT EXISTS cost_cents INTEGER;
