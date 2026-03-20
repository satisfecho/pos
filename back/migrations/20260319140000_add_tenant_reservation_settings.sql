-- Reservation options: pre-payment, policies, reminders (no-shows)
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS reservation_prepayment_cents INTEGER NULL;
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS reservation_prepayment_text TEXT NULL;
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS reservation_cancellation_policy TEXT NULL;
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS reservation_arrival_tolerance_minutes INTEGER NULL;
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS reservation_dress_code TEXT NULL;
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS reservation_reminder_24h_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS reservation_reminder_2h_enabled BOOLEAN NOT NULL DEFAULT false;
