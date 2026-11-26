-- Platform monthly feature digest (#453)
-- Opt-in flags on owners; platform SMTP/locale settings; campaigns + recipients.

ALTER TABLE "user"
    ADD COLUMN IF NOT EXISTS feature_digest_subscribed BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE "user"
    ADD COLUMN IF NOT EXISTS feature_digest_unsub_token VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS ix_user_feature_digest_unsub_token
    ON "user" (feature_digest_unsub_token)
    WHERE feature_digest_unsub_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS platform_mail_settings (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    smtp_host VARCHAR(255),
    smtp_port INT,
    smtp_use_tls BOOLEAN,
    smtp_user VARCHAR(255),
    smtp_password TEXT,
    email_from VARCHAR(320),
    email_from_name VARCHAR(255),
    locale VARCHAR(16) NOT NULL DEFAULT 'en',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO platform_mail_settings (id, locale)
VALUES (1, 'en')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS platform_feature_digest_campaign (
    id SERIAL PRIMARY KEY,
    subject VARCHAR(200) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'queued',
    schedule_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    recipient_count INT NOT NULL DEFAULT 0,
    sent_count INT NOT NULL DEFAULT 0,
    failed_count INT NOT NULL DEFAULT 0,
    error_message TEXT,
    created_by_user_id INT REFERENCES "user"(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_platform_feature_digest_campaign_status_schedule
    ON platform_feature_digest_campaign (status, schedule_at);

CREATE TABLE IF NOT EXISTS platform_feature_digest_recipient (
    id SERIAL PRIMARY KEY,
    campaign_id INT NOT NULL REFERENCES platform_feature_digest_campaign(id) ON DELETE CASCADE,
    user_id INT REFERENCES "user"(id) ON DELETE SET NULL,
    email VARCHAR(320) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_platform_feature_digest_recipient_campaign
    ON platform_feature_digest_recipient (campaign_id);

CREATE INDEX IF NOT EXISTS ix_platform_feature_digest_recipient_campaign_status
    ON platform_feature_digest_recipient (campaign_id, status);
