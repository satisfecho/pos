-- Notify owner when working plan is updated by staff
ALTER TABLE tenant
  ADD COLUMN IF NOT EXISTS working_plan_updated_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS working_plan_owner_seen_at TIMESTAMP WITH TIME ZONE;
