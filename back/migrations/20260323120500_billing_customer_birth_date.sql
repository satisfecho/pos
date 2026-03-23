-- Optional birth date on billing customers (CRM / occasions; GitHub #52).
ALTER TABLE billing_customer ADD COLUMN IF NOT EXISTS birth_date DATE NULL;
