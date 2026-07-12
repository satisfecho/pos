-- Waiting list entries (walk-in queue; no date/time slot)
CREATE TABLE IF NOT EXISTS waiting_list_entry (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    customer_name VARCHAR(200) NOT NULL,
    customer_phone VARCHAR(40) NOT NULL,
    party_size INTEGER NOT NULL CHECK (party_size >= 1 AND party_size <= 99),
    status VARCHAR(32) NOT NULL DEFAULT 'waiting',
    notified_at TIMESTAMPTZ DEFAULT NULL,
    client_ip VARCHAR(45),
    client_user_agent VARCHAR(512),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_waiting_list_entry_tenant_status_created
    ON waiting_list_entry (tenant_id, status, created_at);
