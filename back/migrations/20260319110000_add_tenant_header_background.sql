-- Header background image for public-facing hero (book, menu, reservation view)
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS header_background_filename VARCHAR(255) DEFAULT NULL;
