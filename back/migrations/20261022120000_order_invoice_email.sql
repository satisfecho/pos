-- Customer-facing display (#434): optional email for invoice / receipt delivery.
-- Staff Factura CRM remains primary; this field captures guest email on the counter display.

ALTER TABLE "order" ADD COLUMN IF NOT EXISTS invoice_email VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_order_invoice_email ON "order"(invoice_email)
  WHERE invoice_email IS NOT NULL;
