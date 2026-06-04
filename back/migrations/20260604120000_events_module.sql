-- Events module: standalone events + guest list with RSVP/invitation FSM + check-in.
-- Tenant-scoped. SQLModel create_all also creates these at startup; this migration is the
-- idempotent, prod-safe source of truth (CREATE TABLE IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS event (
    id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    event_date DATE,
    event_time TIME,
    location TEXT,
    notes TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_event_tenant ON event (tenant_id);
CREATE INDEX IF NOT EXISTS ix_event_status ON event (status);

CREATE TABLE IF NOT EXISTS event_guest (
    id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    event_id INT NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(40),
    email VARCHAR(320),
    party_size INT NOT NULL DEFAULT 1,
    table_label VARCHAR(80),
    notes TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    token VARCHAR(64),
    invited_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    checked_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_event_guest_tenant ON event_guest (tenant_id);
CREATE INDEX IF NOT EXISTS ix_event_guest_event ON event_guest (event_id);
CREATE INDEX IF NOT EXISTS ix_event_guest_status ON event_guest (status);
CREATE UNIQUE INDEX IF NOT EXISTS ux_event_guest_token ON event_guest (token);
