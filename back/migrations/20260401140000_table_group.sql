-- Table groups: merge N physical tables for capacity and booking (tenant-scoped).

CREATE TABLE IF NOT EXISTS table_group (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_table_group_tenant ON table_group(tenant_id);

ALTER TABLE "table" ADD COLUMN IF NOT EXISTS table_group_id INTEGER REFERENCES table_group(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_table_table_group ON "table"(table_group_id);
