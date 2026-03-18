-- Reservation notes (client + owner) and client technical info (IP, fingerprint, screen)
ALTER TABLE reservation ADD COLUMN IF NOT EXISTS client_notes TEXT NULL;
ALTER TABLE reservation ADD COLUMN IF NOT EXISTS owner_notes TEXT NULL;
ALTER TABLE reservation ADD COLUMN IF NOT EXISTS client_ip VARCHAR(45) NULL;
ALTER TABLE reservation ADD COLUMN IF NOT EXISTS client_user_agent VARCHAR(512) NULL;
ALTER TABLE reservation ADD COLUMN IF NOT EXISTS client_fingerprint VARCHAR(256) NULL;
ALTER TABLE reservation ADD COLUMN IF NOT EXISTS client_screen_width INTEGER NULL;
ALTER TABLE reservation ADD COLUMN IF NOT EXISTS client_screen_height INTEGER NULL;
