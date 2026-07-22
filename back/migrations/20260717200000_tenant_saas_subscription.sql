-- Migration 20260717200000: Platform SaaS subscription fields on tenant
-- Description: Hard paywall for restaurant signups (trial / paid / grandfathered)

ALTER TABLE tenant
    ADD COLUMN IF NOT EXISTS saas_subscription_status VARCHAR(32) NOT NULL DEFAULT 'grandfathered',
    ADD COLUMN IF NOT EXISTS saas_trial_ends_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS saas_subscription_ends_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS saas_stripe_customer_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS saas_stripe_subscription_id VARCHAR(255);

-- Existing restaurants keep full access (grandfathered). New signups get status 'none' in app code when paywall is enabled.
UPDATE tenant
SET saas_subscription_status = 'grandfathered'
WHERE saas_subscription_status IS NULL
   OR saas_subscription_status = '';

CREATE INDEX IF NOT EXISTS idx_tenant_saas_subscription_status
    ON tenant (saas_subscription_status);
