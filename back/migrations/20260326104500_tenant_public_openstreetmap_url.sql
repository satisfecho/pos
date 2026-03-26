-- Optional OpenStreetMap link (public book, reservation view, feedback, reservation emails)
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS public_openstreetmap_url VARCHAR(2048) DEFAULT NULL;
