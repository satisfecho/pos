-- Add optional customer email to reservation (for booking / contact)
ALTER TABLE reservation ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255) NULL;
CREATE INDEX IF NOT EXISTS idx_reservation_customer_email ON reservation(customer_email) WHERE customer_email IS NOT NULL;
