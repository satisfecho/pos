-- Billing customers for tax invoicing (Factura): company details for printing invoices
CREATE TABLE IF NOT EXISTS billing_customer (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    tax_id VARCHAR(64),
    address TEXT,
    email VARCHAR(255),
    phone VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_customer_tenant ON billing_customer(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_customer_name ON billing_customer(name);
CREATE INDEX IF NOT EXISTS idx_billing_customer_company_name ON billing_customer(company_name);
CREATE INDEX IF NOT EXISTS idx_billing_customer_tax_id ON billing_customer(tax_id);
CREATE INDEX IF NOT EXISTS idx_billing_customer_email ON billing_customer(email);

-- Link orders to billing customer for Factura
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS billing_customer_id INTEGER REFERENCES billing_customer(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_order_billing_customer ON "order"(billing_customer_id);
