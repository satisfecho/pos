-- Reservation: customer profile notes (e.g. allergies) and delay notice (e.g. "We will arrive 1 hour late")
ALTER TABLE reservation ADD COLUMN IF NOT EXISTS customer_notes TEXT NULL;
ALTER TABLE reservation ADD COLUMN IF NOT EXISTS delay_notice TEXT NULL;
