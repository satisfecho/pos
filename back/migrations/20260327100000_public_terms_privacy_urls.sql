-- Per-tenant optional URLs for terms of service and privacy policy (public pages + staff settings).
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS public_terms_of_service_url VARCHAR(2048) DEFAULT NULL;
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS public_privacy_policy_url VARCHAR(2048) DEFAULT NULL;
