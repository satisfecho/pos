-- Optional Google Maps place / directions link (public book, reservation view, feedback)
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS public_google_maps_url VARCHAR(2048) DEFAULT NULL;
