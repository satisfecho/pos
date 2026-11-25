-- Migration 20261125181840: Kitchen SLA category/product expected prep (#450 slice 3)
-- Description: Tenant SLA mode/aggregation + category expected map; product expected_prep_minutes
-- Date: 2026-11-25

ALTER TABLE tenant ADD COLUMN IF NOT EXISTS kitchen_sla_threshold_mode VARCHAR(32) NOT NULL DEFAULT 'absolute';
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS kitchen_sla_ticket_aggregation VARCHAR(32) NOT NULL DEFAULT 'max_line';
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS kitchen_display_timer_yellow_percent INTEGER NOT NULL DEFAULT 70;
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS kitchen_display_timer_orange_percent INTEGER NOT NULL DEFAULT 90;
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS kitchen_display_timer_red_percent INTEGER NOT NULL DEFAULT 100;
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS kitchen_expected_prep_by_category JSONB NULL;

ALTER TABLE product ADD COLUMN IF NOT EXISTS expected_prep_minutes INTEGER NULL;

COMMENT ON COLUMN tenant.kitchen_sla_threshold_mode IS
  'absolute = overdue at ticket expected prep (with absolute yellow/orange minutes); percent_of_expected = bands as percent of expected';
COMMENT ON COLUMN tenant.kitchen_sla_ticket_aggregation IS
  'How multi-item tickets pick expected prep: max_line | sum | primary_category';
COMMENT ON COLUMN tenant.kitchen_expected_prep_by_category IS
  'Map of canonical category name to expected prep minutes (e.g. Starters / Main Course)';
COMMENT ON COLUMN product.expected_prep_minutes IS
  'Optional per-product expected prep override (minutes); null = use category default';
