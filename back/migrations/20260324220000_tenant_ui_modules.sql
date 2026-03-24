-- Per-tenant toggles for staff UI modules (JSONB: only false values stored).
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS ui_modules JSONB NULL;
