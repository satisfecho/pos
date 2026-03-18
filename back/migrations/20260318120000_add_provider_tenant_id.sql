-- Migration 20260318120000: Add tenant_id to provider for personal (tenant-owned) providers
-- Enables restaurant owners to add their own providers and link products to them.
-- Unique name per tenant: (tenant_id, name). Global providers keep tenant_id NULL.

ALTER TABLE provider ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenant(id);
CREATE INDEX IF NOT EXISTS idx_provider_tenant_id ON provider(tenant_id) WHERE tenant_id IS NOT NULL;

-- Drop legacy unique on name so we can have same name for different tenants
ALTER TABLE provider DROP CONSTRAINT IF EXISTS provider_name_key;

-- Unique per tenant: global (tenant_id NULL) and per-tenant names
CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_tenant_name
ON provider (COALESCE(tenant_id, -1), name);
