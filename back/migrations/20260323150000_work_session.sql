-- Actual staff clock-in / clock-out (distinct from planned shift rows in working plan)
CREATE TABLE IF NOT EXISTS work_session (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    start_ip VARCHAR(45),
    end_ip VARCHAR(45)
);

CREATE INDEX IF NOT EXISTS idx_work_session_tenant_started ON work_session(tenant_id, started_at);
CREATE INDEX IF NOT EXISTS idx_work_session_user_started ON work_session(user_id, started_at);

-- At most one open session per user (prevents double clock-in; supports audit)
CREATE UNIQUE INDEX IF NOT EXISTS uq_work_session_user_open ON work_session (user_id) WHERE ended_at IS NULL;
