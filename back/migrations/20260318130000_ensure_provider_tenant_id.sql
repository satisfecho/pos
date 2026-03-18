-- Repair: ensure provider.tenant_id exists (idempotent).
-- Use when schema_version has 20260318120000 but column was missing (e.g. partial apply or restore).
ALTER TABLE provider ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenant(id);
CREATE INDEX IF NOT EXISTS idx_provider_tenant_id ON provider(tenant_id) WHERE tenant_id IS NOT NULL;
