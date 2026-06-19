-- Migration 20260619120000: Add user_role value 'courier'
-- Courier role for delivery drivers (tenant-scoped; dedicated /courier portal).

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'courier';
