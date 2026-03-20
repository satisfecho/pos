-- Migration 20260319150000: Add OTP (TOTP) fields to user table for optional two-factor authentication.

ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS otp_secret VARCHAR(64) NULL,
ADD COLUMN IF NOT EXISTS otp_enabled BOOLEAN DEFAULT FALSE NOT NULL;
