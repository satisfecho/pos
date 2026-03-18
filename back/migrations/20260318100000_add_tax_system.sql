-- Tax (IVA) system: per-tenant rates with validity period, product override, order item snapshot
-- Prices are tax-inclusive; tax is used for invoice breakdown and reporting.

CREATE TABLE IF NOT EXISTS tax (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    rate_percent INTEGER NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tax_tenant_id ON tax(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tax_valid ON tax(tenant_id, valid_from, valid_to);

ALTER TABLE tenant ADD COLUMN IF NOT EXISTS default_tax_id INTEGER REFERENCES tax(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tenant_default_tax ON tenant(default_tax_id);

ALTER TABLE product ADD COLUMN IF NOT EXISTS tax_id INTEGER REFERENCES tax(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_product_tax_id ON product(tax_id) WHERE tax_id IS NOT NULL;

ALTER TABLE tenantproduct ADD COLUMN IF NOT EXISTS tax_id INTEGER REFERENCES tax(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tenantproduct_tax_id ON tenantproduct(tax_id) WHERE tax_id IS NOT NULL;

ALTER TABLE orderitem ADD COLUMN IF NOT EXISTS tax_id INTEGER REFERENCES tax(id) ON DELETE SET NULL;
ALTER TABLE orderitem ADD COLUMN IF NOT EXISTS tax_rate_percent INTEGER;
ALTER TABLE orderitem ADD COLUMN IF NOT EXISTS tax_amount_cents INTEGER;
CREATE INDEX IF NOT EXISTS idx_orderitem_tax_id ON orderitem(tax_id) WHERE tax_id IS NOT NULL;
