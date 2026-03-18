/*
  # Pro Plan System Improvements

  ## Summary
  Comprehensive improvements to the Pro subscription system.

  ## Changes
  - Add granted_by_admin, payment_method_type, auto_renew to subscriptions
  - Add pro_badge and pro_expires_at to profiles
  - Create pro_plan_features table seeded with all role features
  - Expand subscription_plans role check to include rental_provider and owner
  - Seed plans for all roles
  - Add expire_pro_subscriptions() utility function
*/

-- Add columns to subscriptions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='granted_by_admin') THEN
    ALTER TABLE subscriptions ADD COLUMN granted_by_admin boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='payment_method_type') THEN
    ALTER TABLE subscriptions ADD COLUMN payment_method_type text DEFAULT 'manual';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='auto_renew') THEN
    ALTER TABLE subscriptions ADD COLUMN auto_renew boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Add pro badge columns to profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='pro_badge') THEN
    ALTER TABLE profiles ADD COLUMN pro_badge boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='pro_expires_at') THEN
    ALTER TABLE profiles ADD COLUMN pro_expires_at timestamptz DEFAULT NULL;
  END IF;
END $$;

UPDATE profiles SET pro_badge = true WHERE subscription_tier = 'pro';

-- Expand subscription_plans role check to allow all roles
ALTER TABLE subscription_plans DROP CONSTRAINT IF EXISTS subscription_plans_role_check;
ALTER TABLE subscription_plans ADD CONSTRAINT subscription_plans_role_check
  CHECK (role = ANY (ARRAY['mechanic','supplier','rental_provider','owner','technician','admin']));

-- Pro plan features table
CREATE TABLE IF NOT EXISTS pro_plan_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  feature_key text NOT NULL,
  feature_label text NOT NULL,
  feature_description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pro_plan_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read pro features"
  ON pro_plan_features FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert pro features"
  ON pro_plan_features FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update pro features"
  ON pro_plan_features FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_pro_features_role_key ON pro_plan_features(role, feature_key);

INSERT INTO pro_plan_features (role, feature_key, feature_label, feature_description, sort_order) VALUES
  ('mechanic','unlimited_job_access','Unlimited Job Access','Unlock and bid on any job without per-lead fees',1),
  ('mechanic','boosted_profile','Boosted Profile Visibility','Appear at the top of search results for your specializations',2),
  ('mechanic','no_contact_fees','No Contact Fees','View owner contact info for free on all jobs',3),
  ('mechanic','instant_job_alerts','Instant Job Alerts','Real-time notifications the moment a new job matches your skills',4),
  ('mechanic','analytics_dashboard','Earnings Analytics','Track your earnings, jobs completed, and performance over time',5),
  ('mechanic','priority_support','Priority Support','Get faster response from our support team',6),
  ('mechanic','pro_badge','Verified Pro Badge','Display a verified Pro badge on your profile to build trust',7),
  ('supplier','unlimited_listings','Unlimited Part Listings','List as many parts as you need — no monthly cap',1),
  ('supplier','featured_storefront','Featured Supplier Profile','Stand out with a premium supplier badge and highlighted profile',2),
  ('supplier','boosted_search','Priority Search Placement','Your parts appear at the top of search and browse results',3),
  ('supplier','no_listing_fees','No Listing Fees','Add parts for free — no per-listing charges ever',4),
  ('supplier','analytics','Sales & View Analytics','See how many buyers viewed your listings',5),
  ('supplier','promotional_tools','Promotional Tools','Create deals, discounts, and promotions to attract buyers',6),
  ('supplier','pro_badge','Verified Supplier Badge','Build buyer trust with a verified supplier badge',7),
  ('rental_provider','unlimited_listings','Unlimited Equipment Listings','List your entire fleet without restrictions',1),
  ('rental_provider','featured_storefront','Featured Provider Profile','Premium badge and highlighted placement in browse pages',2),
  ('rental_provider','boosted_search','Priority Search Placement','Your equipment appears first in rental searches',3),
  ('rental_provider','no_listing_fees','No Listing Fees','No per-listing credits required',4),
  ('rental_provider','analytics','Rental Analytics','View inquiry stats and revenue estimates',5),
  ('rental_provider','pro_badge','Verified Provider Badge','Verified rental provider badge for all your listings',6),
  ('owner','unlimited_contacts','Unlimited Contact Views','View mechanic, supplier, and rental contacts for free',1),
  ('owner','unlimited_job_posts','Unlimited Job Posts','Post breakdown requests without limits',2),
  ('owner','priority_matching','Priority Job Matching','Your requests are shown first to available mechanics',3),
  ('owner','dedicated_support','Dedicated Support Line','Priority support for machine emergencies',4),
  ('owner','pro_badge','Verified Owner Badge','Build credibility with mechanics and suppliers',5)
ON CONFLICT (role, feature_key) DO NOTHING;

-- Seed subscription plans for all roles
INSERT INTO subscription_plans (tier, role, name, price_monthly, features, is_active) VALUES
  ('free','mechanic','Mechanic Free',0,'["Browse all jobs","1 ETB per job lead","5 job unlocks per month","Basic profile","Forum access"]'::jsonb,true),
  ('pro','mechanic','Mechanic Pro',299,'["Unlimited job access","No per-lead fees","Boosted profile ranking","Instant job alerts","Earnings analytics","Priority support","Verified Pro badge"]'::jsonb,true),
  ('free','supplier','Supplier Free',0,'["Up to 3 free listings","2 ETB per listing after quota","Basic profile","Standard search placement","Forum access"]'::jsonb,true),
  ('pro','supplier','Supplier Pro',399,'["Unlimited part listings","No listing fees","Featured supplier badge","Priority search placement","Sales analytics","Promotional tools","Verified Pro badge"]'::jsonb,true),
  ('free','rental_provider','Rental Provider Free',0,'["Up to 3 free listings","2 ETB per listing after quota","Basic profile","Standard search placement","Forum access"]'::jsonb,true),
  ('pro','rental_provider','Rental Provider Pro',399,'["Unlimited equipment listings","No listing fees","Featured provider badge","Priority search placement","Rental analytics","Verified Pro badge"]'::jsonb,true),
  ('free','owner','Owner Free',0,'["1 ETB per contact unlock","3 free job posts","2 ETB per job after quota","Basic machine tracking","Forum access"]'::jsonb,true),
  ('pro','owner','Owner Pro',199,'["Unlimited contact views","Unlimited job posts","Priority job matching","Dedicated support","Verified Owner badge"]'::jsonb,true)
ON CONFLICT DO NOTHING;

-- Utility function to expire pro subscriptions
CREATE OR REPLACE FUNCTION expire_pro_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE subscriptions
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < now();

  UPDATE profiles
  SET subscription_tier = 'free', pro_badge = false, pro_expires_at = NULL
  WHERE id IN (
    SELECT DISTINCT user_id FROM subscriptions WHERE status = 'expired'
  )
  AND subscription_tier = 'pro'
  AND NOT EXISTS (
    SELECT 1 FROM subscriptions s2
    WHERE s2.user_id = profiles.id AND s2.status = 'active'
  );
END;
$$;
