-- Per-tenant employment contract templates (body with {{placeholders}}; linked from staff_contract.template_key).

CREATE TABLE IF NOT EXISTS staff_contract_template (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    template_key VARCHAR(64) NOT NULL,
    name VARCHAR(256) NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    kind staff_contract_kind NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_staff_contract_template_tenant_key UNIQUE (tenant_id, template_key)
);

CREATE INDEX IF NOT EXISTS ix_staff_contract_template_tenant_id ON staff_contract_template(tenant_id);
