-- Working plan: shifts (who works when) per tenant
CREATE TABLE IF NOT EXISTS shift (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    shift_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    label VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shift_tenant_date ON shift(tenant_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_shift_user_date ON shift(user_id, shift_date);
