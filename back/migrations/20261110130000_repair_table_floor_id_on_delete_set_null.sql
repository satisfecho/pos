-- Repair: table.floor_id FK must ON DELETE SET NULL
-- Description: Original ADD COLUMN IF NOT EXISTS left a non-cascade FK when the
--   column already existed. DELETE /floors/{id} then 500s with table_floor_id_fkey.
-- Date: 2026-11-10
-- Idempotent: drop + recreate only when needed.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'table_floor_id_fkey'
      AND conrelid = '"table"'::regclass
  ) THEN
    ALTER TABLE "table" DROP CONSTRAINT table_floor_id_fkey;
  END IF;
END $$;

ALTER TABLE "table"
  ADD CONSTRAINT table_floor_id_fkey
  FOREIGN KEY (floor_id) REFERENCES floor(id) ON DELETE SET NULL;
