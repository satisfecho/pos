-- Migration 20261125090000: Careers email verification challenge (#448)
-- Description: Short-lived 6-digit email code before storing applications/CVs
-- Date: 2026-11-25 09:00:00

CREATE TABLE IF NOT EXISTS career_email_challenge (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    email VARCHAR(320) NOT NULL,
    code_hash VARCHAR(64) NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    submit_token_hash VARCHAR(64),
    submit_token_expires_at TIMESTAMPTZ,
    client_ip VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_career_email_challenge_tenant_email
    ON career_email_challenge(tenant_id, email);

CREATE INDEX IF NOT EXISTS idx_career_email_challenge_expires_at
    ON career_email_challenge(expires_at);

CREATE INDEX IF NOT EXISTS idx_career_email_challenge_submit_token
    ON career_email_challenge(submit_token_hash)
    WHERE submit_token_hash IS NOT NULL;
