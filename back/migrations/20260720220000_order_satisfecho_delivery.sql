-- First-party Satisfecho Delivery on Order (not Glovo/Uber marketplace).
-- Channel distinguishes table vs own delivery vs marketplace; address/phone for couriers.

ALTER TABLE "order" ADD COLUMN IF NOT EXISTS order_channel VARCHAR(32) NOT NULL DEFAULT 'table';
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(40);
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS courier_user_id INT
    REFERENCES "user"(id) ON DELETE SET NULL;

-- Existing marketplace orders were only marked via delivery_integration_id.
UPDATE "order"
SET order_channel = 'marketplace'
WHERE delivery_integration_id IS NOT NULL
  AND (order_channel IS NULL OR order_channel = 'table');

CREATE INDEX IF NOT EXISTS ix_order_channel
    ON "order" (tenant_id, order_channel)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_order_courier_user
    ON "order" (courier_user_id)
    WHERE courier_user_id IS NOT NULL;
