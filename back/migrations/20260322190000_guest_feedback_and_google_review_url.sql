-- Guest feedback (public form) + optional Google Maps / Business Profile review URL per tenant
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS public_google_review_url VARCHAR(2048) DEFAULT NULL;

CREATE TABLE IF NOT EXISTS guest_feedback (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    contact_name VARCHAR(200),
    contact_email VARCHAR(320),
    contact_phone VARCHAR(40),
    reservation_id INTEGER REFERENCES reservation(id) ON DELETE SET NULL,
    client_ip VARCHAR(45),
    client_user_agent VARCHAR(512)
);

CREATE INDEX IF NOT EXISTS ix_guest_feedback_tenant_created ON guest_feedback (tenant_id, created_at DESC);
