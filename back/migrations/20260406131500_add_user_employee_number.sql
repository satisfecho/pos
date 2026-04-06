-- Migration 20260406131500: add_user_employee_number
-- Date: 2026-04-06 13:15:00

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS employee_number VARCHAR(64);
