-- Snapshot of human-readable customization at order time (kitchen, staff orders, invoices; GitHub #50)
ALTER TABLE orderitem ADD COLUMN IF NOT EXISTS customization_summary VARCHAR(1024) NULL;
