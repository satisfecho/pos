-- Migration 20260712180000: Platform operator role and login event audit
-- Description: Adds platform_operator user role and login_event table for operator metrics

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'platform_operator';

CREATE TABLE IF NOT EXISTS login_event (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
    role user_role,
    tenant_id INTEGER REFERENCES tenant(id) ON DELETE SET NULL,
    provider_id INTEGER REFERENCES provider(id) ON DELETE SET NULL,
    login_scope VARCHAR(32),
    logged_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_event_logged_in_at ON login_event (logged_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_event_tenant_id ON login_event (tenant_id);
