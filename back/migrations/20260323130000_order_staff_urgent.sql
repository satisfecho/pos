-- Staff "urgent" flag for kitchen/bar when guests ask for food (GitHub #56)
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS staff_urgent BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_order_tenant_staff_urgent ON "order"(tenant_id, staff_urgent) WHERE staff_urgent = TRUE;
