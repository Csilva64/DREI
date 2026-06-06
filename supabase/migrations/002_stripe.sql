-- ============================================================
-- DRE-I · Stripe Billing
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT UNIQUE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status    TEXT DEFAULT 'trialing';
  -- trialing | active | past_due | canceled | incomplete
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_ends_at          TIMESTAMPTZ DEFAULT (now() + INTERVAL '14 days');
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS current_period_end     TIMESTAMPTZ;

-- OPCO = lifetime active (não cobra do próprio dono)
UPDATE organizations
   SET subscription_status = 'active', plan = 'enterprise', trial_ends_at = NULL
 WHERE slug = 'opco';
