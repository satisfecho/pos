-- Waiter-to-table assignment system
-- Supports per-table assignment with per-floor fallback

-- Table-level waiter assignment
ALTER TABLE "table" ADD COLUMN IF NOT EXISTS assigned_waiter_id INTEGER
  REFERENCES "user"(id) ON DELETE SET NULL;

-- Floor-level default waiter (fallback when table has no explicit assignment)
ALTER TABLE floor ADD COLUMN IF NOT EXISTS default_waiter_id INTEGER
  REFERENCES "user"(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_table_assigned_waiter ON "table" (assigned_waiter_id);
CREATE INDEX IF NOT EXISTS idx_floor_default_waiter ON floor (default_waiter_id);
