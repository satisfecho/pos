-- Public-facing pages (book, menu, reservation view): background color as hex (e.g. #1E22AA for RAL5002 Azul)
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS public_background_color VARCHAR(20) DEFAULT NULL;
