/*
  # Hybrid Monetization System

  ## Overview
  Implements a comprehensive hybrid monetization model for EquipLink with:
  - Subscription tiers (Free, Pro) for technicians and suppliers
  - Wallet/credit system for pay-per-lead model
  - Commission tracking on completed jobs
  - Technician job unlock tracking
  - Customer contact unlock tracking
  - Boosted listing support for suppliers

  ## New Tables

  ### subscriptions
  Stores active subscription plans per user.
  - user_id: References profiles
  - tier: 'free' | 'pro'
  - status: 'active' | 'cancelled' | 'expired' | 'pending'
  - started_at, expires_at: Subscription window
  - payment_id: Links to user_payments

  ### subscription_plans
  Admin-configurable pricing for subscription tiers.
  - tier: 'free' | 'pro'
  - role: Which user role this applies to
  - price_monthly: Monthly price in USD
  - features: JSONB feature list
  - is_active: Whether the plan is available

  ### wallets
  In-app wallet for technicians tracking credit balance.
  - user_id: References profiles (unique)
  - balance: Current credit balance in USD
  - total_purchased, total_spent: Lifetime stats

  ### wallet_transactions
  Tracks all wallet credit purchases and deductions.
  - wallet_id: References wallets
  - type: 'purchase' | 'deduction' | 'refund' | 'bonus'
  - amount: Positive or negative amount
  - description: Human-readable description
  - reference_id: Related entity (job unlock, payment, etc.)
  - status: 'completed' | 'pending' | 'failed'

  ### job_unlocks
  Tracks which jobs a technician has unlocked (paid to see contact details).
  - technician_id: The mechanic who unlocked
  - breakdown_request_id: The job they unlocked
  - unlock_method: 'wallet' | 'subscription'
  - credits_spent: How many credits were deducted (if wallet)
  - wallet_transaction_id: Reference to wallet transaction

  ### commissions
  Tracks platform commission on completed jobs.
  - breakdown_request_id: The completed job
  - technician_id: Mechanic who did the work
  - owner_id: Vehicle owner
  - job_amount: Total job cost
  - commission_rate: Applied commission percentage (5-10%)
  - commission_amount: Calculated commission
  - status: 'pending' | 'paid' | 'disputed'

  ### boosted_listings
  Tracks listing boosts for suppliers.
  - listing_id: The parts listing being boosted
  - supplier_id: Supplier who boosted
  - boost_level: 'standard' | 'featured' | 'premium'
  - boost_cost: Amount paid
  - starts_at, expires_at: Boost window
  - payment_id: Reference to user_payments

  ## Modified Tables
  ### profiles
  - Added subscription_tier column ('free' | 'pro')

  ## Security
  All tables have RLS enabled with appropriate policies.
*/

-- Add subscription_tier to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_tier text NOT NULL DEFAULT 'free';
  END IF;
END $$;

-- Add wallet_balance to profiles for quick access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'wallet_balance'
  ) THEN
    ALTER TABLE profiles ADD COLUMN wallet_balance numeric(10,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Subscription Plans (admin-configurable)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL CHECK (tier IN ('free', 'pro')),
  role text NOT NULL CHECK (role IN ('mechanic', 'supplier')),
  name text NOT NULL,
  price_monthly numeric(10,2) NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '[]',
  job_access_limit integer DEFAULT NULL,
  lead_cost_per_job numeric(10,2) DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tier, role)
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active subscription plans"
  ON subscription_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage subscription plans"
  ON subscription_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update subscription plans"
  ON subscription_plans FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete subscription plans"
  ON subscription_plans FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Seed default subscription plans
INSERT INTO subscription_plans (tier, role, name, price_monthly, features, job_access_limit, lead_cost_per_job) VALUES
('free', 'mechanic', 'Free Tier', 0, '["View available jobs", "Basic profile", "Limited to 3 job unlocks/month"]', 3, 5.00),
('pro', 'mechanic', 'Pro Mechanic', 29.99, '["Unlimited job access", "Boosted profile visibility", "Priority job notifications", "Advanced analytics", "Dedicated support"]', NULL, NULL),
('free', 'supplier', 'Free Supplier', 0, '["List up to 5 parts", "Basic storefront", "Standard search ranking"]', 5, NULL),
('pro', 'supplier', 'Pro Supplier', 19.99, '["Unlimited parts listings", "Featured storefront", "Boosted search ranking", "Promotional tools", "Analytics dashboard"]', NULL, NULL)
ON CONFLICT (tier, role) DO NOTHING;

-- Subscriptions (user active plans)
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tier text NOT NULL CHECK (tier IN ('free', 'pro')),
  role text NOT NULL CHECK (role IN ('mechanic', 'supplier')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  payment_id uuid REFERENCES user_payments(id) ON DELETE SET NULL,
  auto_renew boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert subscriptions"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can update own subscriptions"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update all subscriptions"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Seed free subscriptions will be created on user signup via trigger

-- Wallets (per user, primarily technicians)
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  balance numeric(10,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_purchased numeric(10,2) NOT NULL DEFAULT 0,
  total_spent numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet"
  ON wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallet"
  ON wallets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wallet"
  ON wallets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all wallets"
  ON wallets FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update all wallets"
  ON wallets FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Wallet Transactions
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('purchase', 'deduction', 'refund', 'bonus')),
  amount numeric(10,2) NOT NULL,
  balance_after numeric(10,2) NOT NULL,
  description text NOT NULL,
  reference_id uuid,
  reference_type text,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed')),
  payment_id uuid REFERENCES user_payments(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet transactions"
  ON wallet_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallet transactions"
  ON wallet_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can view all wallet transactions"
  ON wallet_transactions FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Job Unlocks (technician pays to access contact details)
CREATE TABLE IF NOT EXISTS job_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  breakdown_request_id uuid NOT NULL REFERENCES breakdown_requests(id) ON DELETE CASCADE,
  unlock_method text NOT NULL CHECK (unlock_method IN ('wallet', 'subscription')),
  credits_spent numeric(10,2) DEFAULT 0,
  wallet_transaction_id uuid REFERENCES wallet_transactions(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(technician_id, breakdown_request_id)
);

ALTER TABLE job_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Technicians can view own unlocks"
  ON job_unlocks FOR SELECT
  TO authenticated
  USING (auth.uid() = technician_id);

CREATE POLICY "Technicians can insert own unlocks"
  ON job_unlocks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = technician_id);

CREATE POLICY "Admins can view all unlocks"
  ON job_unlocks FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Commissions (platform fee on completed jobs)
CREATE TABLE IF NOT EXISTS commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  breakdown_request_id uuid NOT NULL REFERENCES breakdown_requests(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_amount numeric(10,2) NOT NULL DEFAULT 0,
  commission_rate numeric(5,2) NOT NULL DEFAULT 7.5,
  commission_amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'disputed', 'waived')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(breakdown_request_id)
);

ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Technicians can view own commissions"
  ON commissions FOR SELECT
  TO authenticated
  USING (auth.uid() = technician_id);

CREATE POLICY "Owners can view commissions for their jobs"
  ON commissions FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Admins can view all commissions"
  ON commissions FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can insert commissions"
  ON commissions FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update commissions"
  ON commissions FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "System can insert commissions"
  ON commissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id OR auth.uid() = technician_id);

-- Boosted Listings (supplier premium placement)
CREATE TABLE IF NOT EXISTS boosted_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES parts_listings(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  boost_level text NOT NULL DEFAULT 'standard' CHECK (boost_level IN ('standard', 'featured', 'premium')),
  boost_cost numeric(10,2) NOT NULL DEFAULT 0,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  payment_id uuid REFERENCES user_payments(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE boosted_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active boosts"
  ON boosted_listings FOR SELECT
  USING (is_active = true AND expires_at > now());

CREATE POLICY "Suppliers can view own boosts"
  ON boosted_listings FOR SELECT
  TO authenticated
  USING (auth.uid() = supplier_id);

CREATE POLICY "Suppliers can insert own boosts"
  ON boosted_listings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = supplier_id);

CREATE POLICY "Admins can view all boosts"
  ON boosted_listings FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update all boosts"
  ON boosted_listings FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Customer contact unlock tracking (when customer pays to contact technician)
CREATE TABLE IF NOT EXISTS customer_contact_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  unlock_type text NOT NULL CHECK (unlock_type IN ('contact_fee', 'quote_accepted')),
  payment_id uuid REFERENCES user_payments(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(customer_id, technician_id)
);

ALTER TABLE customer_contact_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own unlocks"
  ON customer_contact_unlocks FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);

CREATE POLICY "Customers can insert own unlocks"
  ON customer_contact_unlocks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Technicians can view who unlocked their contact"
  ON customer_contact_unlocks FOR SELECT
  TO authenticated
  USING (auth.uid() = technician_id);

CREATE POLICY "Admins can view all customer unlocks"
  ON customer_contact_unlocks FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Quotes (technician sends quote to customer)
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  breakdown_request_id uuid NOT NULL REFERENCES breakdown_requests(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  description text,
  estimated_hours numeric(5,1),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  accepted_at timestamptz,
  rejected_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(breakdown_request_id, technician_id)
);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Technicians can view own quotes"
  ON quotes FOR SELECT
  TO authenticated
  USING (auth.uid() = technician_id);

CREATE POLICY "Owners can view quotes for their requests"
  ON quotes FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Technicians can insert quotes"
  ON quotes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = technician_id);

CREATE POLICY "Technicians can update own quotes"
  ON quotes FOR UPDATE
  TO authenticated
  USING (auth.uid() = technician_id)
  WITH CHECK (auth.uid() = technician_id);

CREATE POLICY "Owners can update quote status"
  ON quotes FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Admins can view all quotes"
  ON quotes FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_job_unlocks_technician_id ON job_unlocks(technician_id);
CREATE INDEX IF NOT EXISTS idx_job_unlocks_breakdown_request_id ON job_unlocks(breakdown_request_id);
CREATE INDEX IF NOT EXISTS idx_commissions_technician_id ON commissions(technician_id);
CREATE INDEX IF NOT EXISTS idx_commissions_breakdown_request_id ON commissions(breakdown_request_id);
CREATE INDEX IF NOT EXISTS idx_boosted_listings_listing_id ON boosted_listings(listing_id);
CREATE INDEX IF NOT EXISTS idx_boosted_listings_supplier_id ON boosted_listings(supplier_id);
CREATE INDEX IF NOT EXISTS idx_quotes_breakdown_request_id ON quotes(breakdown_request_id);
CREATE INDEX IF NOT EXISTS idx_quotes_technician_id ON quotes(technician_id);
CREATE INDEX IF NOT EXISTS idx_quotes_owner_id ON quotes(owner_id);
CREATE INDEX IF NOT EXISTS idx_customer_contact_unlocks_customer_id ON customer_contact_unlocks(customer_id);

-- Update commission_fees table to add commission rate range
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commission_fees' AND column_name = 'commission_rate_min'
  ) THEN
    ALTER TABLE commission_fees ADD COLUMN commission_rate_min numeric(5,2) DEFAULT 5.0;
    ALTER TABLE commission_fees ADD COLUMN commission_rate_max numeric(5,2) DEFAULT 10.0;
  END IF;
END $$;
