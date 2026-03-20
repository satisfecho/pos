-- Migration 20260320100000: soft-delete orders (exclude from list and book-keeping)
-- Description: Add deleted_at and deleted_by_user_id so orders can be marked deleted for testing/cleanup
-- Date: 2026-03-20 10:00:00

ALTER TABLE "order"
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

ALTER TABLE "order"
ADD COLUMN IF NOT EXISTS deleted_by_user_id INTEGER REFERENCES "user"(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_order_deleted_at ON "order" (deleted_at);
