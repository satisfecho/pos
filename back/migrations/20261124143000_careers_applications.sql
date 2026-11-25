-- Migration 20261124143000: Trabaja con nosotros / careers applications (#447)
-- Description: Owner toggle + encrypted career applications (PII at rest, optional CV)
-- Date: 2026-11-24 14:30:00

ALTER TABLE tenant
ADD COLUMN IF NOT EXISTS careers_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE tenant
ADD COLUMN IF NOT EXISTS careers_why_text TEXT;

ALTER TABLE tenant
ADD COLUMN IF NOT EXISTS careers_retention_days INTEGER NOT NULL DEFAULT 180;

CREATE TABLE IF NOT EXISTS career_application (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'new',
    pii_encrypted TEXT NOT NULL,
    cv_stored_filename VARCHAR(255),
    cv_content_type VARCHAR(128),
    expires_at TIMESTAMPTZ NOT NULL,
    client_ip VARCHAR(45),
    client_user_agent VARCHAR(512),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_career_application_tenant_id
    ON career_application(tenant_id);

CREATE INDEX IF NOT EXISTS idx_career_application_tenant_status
    ON career_application(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_career_application_expires_at
    ON career_application(expires_at);
