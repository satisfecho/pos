-- Repair: birth_date was introduced in 20260323120500, but that version sorts BEFORE
-- 20260323121000..20260323150000. DBs that already applied later migrations never ran
-- 20260323120500 (pending = version > MAX(schema_version)). Idempotent for everyone.
ALTER TABLE billing_customer ADD COLUMN IF NOT EXISTS birth_date DATE NULL;
