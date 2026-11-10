-- Owner signup email verification + inactive tenant housekeeping (#442)
-- Description: Add email verify fields on user; soft-delete / inactivity fields on tenant; backfill last_login_at from login_event.
-- Date: 2026-11-10

ALTER TABLE "user"
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE "user"
    ADD COLUMN IF NOT EXISTS email_verification_code_hash VARCHAR(64);

ALTER TABLE "user"
    ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMPTZ;

ALTER TABLE "user"
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS ix_user_email_verification_code_hash
    ON "user" (email_verification_code_hash)
    WHERE email_verification_code_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_user_last_login_at ON "user" (last_login_at);

ALTER TABLE tenant
    ADD COLUMN IF NOT EXISTS soft_deleted_at TIMESTAMPTZ;

ALTER TABLE tenant
    ADD COLUMN IF NOT EXISTS inactivity_warning_sent_at TIMESTAMPTZ;

ALTER TABLE tenant
    ADD COLUMN IF NOT EXISTS hard_delete_after TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS ix_tenant_soft_deleted_at ON tenant (soft_deleted_at);
CREATE INDEX IF NOT EXISTS ix_tenant_hard_delete_after ON tenant (hard_delete_after);

-- Backfill last successful login from audit table when present
UPDATE "user" u
SET last_login_at = s.max_login
FROM (
    SELECT user_id, MAX(logged_in_at) AS max_login
    FROM login_event
    WHERE user_id IS NOT NULL
    GROUP BY user_id
) s
WHERE u.id = s.user_id
  AND u.last_login_at IS NULL;
