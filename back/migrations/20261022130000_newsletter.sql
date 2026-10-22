-- Newsletter campaigns: rate-limited tenant SMTP sends + open/click tracking (#435)

CREATE TABLE IF NOT EXISTS newsletter_campaign (
    id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    subject VARCHAR(200) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    audience_source VARCHAR(32) NOT NULL DEFAULT 'billing_customers',
    status VARCHAR(32) NOT NULL DEFAULT 'queued',
    schedule_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    consent_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    recipient_count INT NOT NULL DEFAULT 0,
    sent_count INT NOT NULL DEFAULT 0,
    failed_count INT NOT NULL DEFAULT 0,
    open_count INT NOT NULL DEFAULT 0,
    click_count INT NOT NULL DEFAULT 0,
    error_message TEXT,
    created_by_user_id INT REFERENCES "user"(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_newsletter_campaign_tenant ON newsletter_campaign (tenant_id);
CREATE INDEX IF NOT EXISTS ix_newsletter_campaign_status_schedule
    ON newsletter_campaign (status, schedule_at);

CREATE TABLE IF NOT EXISTS newsletter_recipient (
    id SERIAL PRIMARY KEY,
    campaign_id INT NOT NULL REFERENCES newsletter_campaign(id) ON DELETE CASCADE,
    email VARCHAR(320) NOT NULL,
    tracking_token VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    opened_at TIMESTAMPTZ,
    click_count INT NOT NULL DEFAULT 0,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_newsletter_recipient_campaign ON newsletter_recipient (campaign_id);
CREATE INDEX IF NOT EXISTS ix_newsletter_recipient_campaign_status
    ON newsletter_recipient (campaign_id, status);
CREATE INDEX IF NOT EXISTS ix_newsletter_recipient_token ON newsletter_recipient (tracking_token);
