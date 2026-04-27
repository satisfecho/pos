-- Marketing: social OAuth connections + scheduled/composed posts (tenant-scoped)

CREATE TABLE IF NOT EXISTS social_oauth_state (
    state VARCHAR(64) PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    provider_key VARCHAR(32) NOT NULL,
    redirect_uri TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_social_oauth_state_created ON social_oauth_state (created_at);

CREATE TABLE IF NOT EXISTS social_connection (
    id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    provider_key VARCHAR(32) NOT NULL,
    connection_status VARCHAR(32) NOT NULL DEFAULT 'disconnected',
    oauth_payload_encrypted TEXT,
    meta_page_id VARCHAR(64),
    meta_page_name VARCHAR(512),
    instagram_account_id VARCHAR(64),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, provider_key)
);

CREATE INDEX IF NOT EXISTS ix_social_connection_tenant ON social_connection (tenant_id);

CREATE TABLE IF NOT EXISTS social_post (
    id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    caption TEXT NOT NULL DEFAULT '',
    image_filename VARCHAR(256) NOT NULL,
    schedule_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'queued',
    error_message TEXT,
    created_by_user_id INT REFERENCES "user"(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_social_post_tenant_schedule ON social_post (tenant_id, schedule_at);
CREATE INDEX IF NOT EXISTS ix_social_post_status_schedule ON social_post (status, schedule_at);

CREATE TABLE IF NOT EXISTS social_post_target (
    id SERIAL PRIMARY KEY,
    social_post_id INT NOT NULL REFERENCES social_post(id) ON DELETE CASCADE,
    channel_key VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    external_id VARCHAR(256),
    error_message TEXT,
    UNIQUE (social_post_id, channel_key)
);

CREATE INDEX IF NOT EXISTS ix_social_post_target_post ON social_post_target (social_post_id);
