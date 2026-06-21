-- Migration 20260621120000: Align user.role column to user_role enum (fix legacy userrole on production)
-- Production (amvara9): column was bound to SQLAlchemy-created enum userrole without 'courier'.
-- Migrations 20260314+ altered user_role only; courier token queries failed with 500.
-- Idempotent: no-op when column already uses user_role (local dev / fresh installs).

DO $$
DECLARE
    col_udt text;
BEGIN
    SELECT c.udt_name INTO col_udt
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'user'
      AND c.column_name = 'role';

    IF col_udt = 'userrole' THEN
        ALTER TABLE "user" ALTER COLUMN role DROP DEFAULT;
        ALTER TABLE "user" ALTER COLUMN role TYPE user_role USING role::text::user_role;
        ALTER TABLE "user" ALTER COLUMN role SET DEFAULT 'waiter'::user_role;
    END IF;
END $$;

-- Drop orphaned legacy enum when no column references it
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userrole') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND udt_name = 'userrole'
        ) THEN
            DROP TYPE userrole;
        END IF;
    END IF;
END $$;
