-- Add description column to product table (idempotent for DBs that already have it)
ALTER TABLE product ADD COLUMN IF NOT EXISTS description TEXT;
