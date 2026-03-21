-- Per-tenant reservation confirmation email (subject + plain body with {{placeholders}})
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS reservation_confirmation_email_subject TEXT NULL;
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS reservation_confirmation_email_body TEXT NULL;
