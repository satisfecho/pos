-- Average table turn time for reservation capacity; walk-in table buffer; when party was seated
ALTER TABLE reservation ADD COLUMN IF NOT EXISTS seated_at TIMESTAMPTZ NULL;
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS reservation_average_table_turn_minutes INTEGER NULL;
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS reservation_walk_in_tables_reserved INTEGER NOT NULL DEFAULT 0;

-- Best-effort backfill for turn-time capacity on already-seated rows
UPDATE reservation SET seated_at = updated_at
WHERE status = 'seated' AND seated_at IS NULL AND updated_at IS NOT NULL;
