-- Kitchen/Bar display: configurable wait-time thresholds (minutes) for card color
-- Green -> Yellow at yellow_min, Yellow -> Orange at orange_min, Orange -> Red at red_min
ALTER TABLE tenant
  ADD COLUMN IF NOT EXISTS kitchen_display_timer_yellow_minutes integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS kitchen_display_timer_orange_minutes integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS kitchen_display_timer_red_minutes integer DEFAULT 15;

COMMENT ON COLUMN tenant.kitchen_display_timer_yellow_minutes IS 'Minutes since order: card turns yellow after this';
COMMENT ON COLUMN tenant.kitchen_display_timer_orange_minutes IS 'Minutes since order: card turns orange after this';
COMMENT ON COLUMN tenant.kitchen_display_timer_red_minutes IS 'Minutes since order: card turns red after this';
