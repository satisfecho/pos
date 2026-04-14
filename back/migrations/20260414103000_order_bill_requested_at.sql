-- Guest/staff signal: customer requested payment (public menu); drives floor-plan operational_status.
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS bill_requested_at TIMESTAMP WITH TIME ZONE NULL;
