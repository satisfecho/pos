-- Encrypted storage for staff clock QR plain token (Fernet); allows Settings re-download after reload
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS clock_qr_token_encrypted TEXT NULL;
