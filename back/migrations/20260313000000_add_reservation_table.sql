-- Table reservation: bookings with optional table assignment (seating)
CREATE TABLE IF NOT EXISTS reservation (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(64) NOT NULL,
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    party_size INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'booked',
    table_id INTEGER REFERENCES "table"(id) ON DELETE SET NULL,
    token VARCHAR(64) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservation_tenant ON reservation(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reservation_tenant_date ON reservation(tenant_id, reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservation_tenant_status ON reservation(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_reservation_table ON reservation(table_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservation_token ON reservation(token) WHERE token IS NOT NULL;
