-- Planned weekly baselines (effective from a start date) and date-range overrides for holidays/events.
-- See opening_hours_effective.py for resolution rules.

CREATE TABLE IF NOT EXISTS opening_hours_baseline_schedule (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    effective_from DATE NOT NULL,
    opening_hours TEXT NOT NULL,
    note VARCHAR(512),
    created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    UNIQUE (tenant_id, effective_from)
);

CREATE INDEX IF NOT EXISTS ix_ohbs_tenant_eff
    ON opening_hours_baseline_schedule(tenant_id, effective_from DESC);

CREATE TABLE IF NOT EXISTS opening_hours_date_override (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    closed BOOLEAN NOT NULL DEFAULT FALSE,
    opening_hours TEXT,
    note VARCHAR(512),
    created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    CONSTRAINT ohdo_range_ok CHECK (date_from <= date_to)
);

CREATE INDEX IF NOT EXISTS ix_ohdo_tenant_range
    ON opening_hours_date_override(tenant_id, date_from, date_to);
