-- Restaurant groups: multi-location operators share customers and/or products across tenants.

CREATE TABLE IF NOT EXISTS restaurant_group (
    id SERIAL PRIMARY KEY,
    name VARCHAR(256) NOT NULL,
    join_code VARCHAR(32) NOT NULL UNIQUE,
    share_products BOOLEAN NOT NULL DEFAULT false,
    share_customers BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS restaurant_group_member (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES restaurant_group(id) ON DELETE CASCADE,
    tenant_id INTEGER NOT NULL UNIQUE REFERENCES tenant(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_group_member_group ON restaurant_group_member(group_id);
