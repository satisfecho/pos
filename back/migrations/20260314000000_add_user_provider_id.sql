-- Migration 20260314000000: Add user.provider_id and user_role value 'provider'
-- Required for provider portal (login/register work); without it SELECT/INSERT on user can 500.

-- Add 'provider' to user_role enum (PostgreSQL)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'provider';

-- Add provider_id to user table (nullable; provider users have tenant_id=NULL, provider_id set)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS provider_id INTEGER REFERENCES provider(id);
CREATE INDEX IF NOT EXISTS idx_user_provider_id ON "user" (provider_id) WHERE provider_id IS NOT NULL;
