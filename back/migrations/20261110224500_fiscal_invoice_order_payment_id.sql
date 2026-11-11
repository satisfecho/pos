-- Per-payer Factura prep (#443): optional fiscal_invoice.order_payment_id.
-- Null keeps classic one-alta-per-order behaviour (docs/0071-split-bill.md).

ALTER TABLE fiscal_invoice
    ADD COLUMN IF NOT EXISTS order_payment_id INTEGER NULL
        REFERENCES order_payment(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_fiscal_invoice_order_payment_id
    ON fiscal_invoice (order_payment_id)
    WHERE order_payment_id IS NOT NULL;

-- At most one active alta per payment leg.
CREATE UNIQUE INDEX IF NOT EXISTS uq_fiscal_invoice_payment_alta
    ON fiscal_invoice (tenant_id, order_payment_id)
    WHERE order_payment_id IS NOT NULL AND record_type = 'alta';
