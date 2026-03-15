-- Migration 20260315100000: Add company/contact/bank fields to provider table
-- Description: full_company_name, address, tax_number, phone, email, bank_iban, bank_bic, bank_name, bank_account_holder
-- Date: 2026-03-15

ALTER TABLE provider ADD COLUMN IF NOT EXISTS full_company_name VARCHAR(255) DEFAULT NULL;
ALTER TABLE provider ADD COLUMN IF NOT EXISTS address TEXT DEFAULT NULL;
ALTER TABLE provider ADD COLUMN IF NOT EXISTS tax_number VARCHAR(100) DEFAULT NULL;
ALTER TABLE provider ADD COLUMN IF NOT EXISTS phone VARCHAR(100) DEFAULT NULL;
ALTER TABLE provider ADD COLUMN IF NOT EXISTS email VARCHAR(255) DEFAULT NULL;
ALTER TABLE provider ADD COLUMN IF NOT EXISTS bank_iban VARCHAR(50) DEFAULT NULL;
ALTER TABLE provider ADD COLUMN IF NOT EXISTS bank_bic VARCHAR(20) DEFAULT NULL;
ALTER TABLE provider ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255) DEFAULT NULL;
ALTER TABLE provider ADD COLUMN IF NOT EXISTS bank_account_holder VARCHAR(255) DEFAULT NULL;
